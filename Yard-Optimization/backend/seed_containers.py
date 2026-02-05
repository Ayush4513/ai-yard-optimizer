"""
Seed script to import container movement data from Excel files.

Each row in the Excel represents a container movement EVENT, not a unique container.
The same container_number appears multiple times with different event_seq_no values.

The container_id is constructed as: CTR-{container_idx}-EVT-{event_seq_no}
This allows us to track the full movement history while having unique primary keys.
"""

import os
import re
import pandas as pd
from sqlalchemy import text
from Database.database import SessionLocal, engine
from Database import models

# Configuration
DATA_FOLDER = "C:/Users/Keval.Shikhaliya/Downloads/OneDrive_1_6-2-2026/"
FILES = [
    "container_movement_dataset (2).xlsx",
    "container_movement_dataset (3).xlsx",
    "container_movement_dataset (4).xlsx",
    "container_movement_dataset (5).xlsx",
    "container_movements_dataset(1).xlsx",
    "container_movements_dataset(6).xlsx",
]

# POD mapping based on yard zones
POD_MAP = {
    "SS": "Kochi",      # Sea-Side -> Kochi
    "LS": "JNPT",       # Land-Side -> JNPT
    "OOG": "Mundra",    # OOG -> Mundra
}


def parse_location(loc_str):
    """
    Parse location string like '(SS2-B3)_12-01-3' into block_id, bay, row, tier.
    Returns (block_id, bay, row, tier) or (None, None, None, None) if invalid.
    """
    if not loc_str or pd.isna(loc_str):
        return None, None, None, None

    loc_str = str(loc_str).strip()

    # Pattern: (BLOCK)_BAY-ROW-TIER
    match = re.match(r'\(([^)]+)\)_(\d+)-(\d+)-(\d+)', loc_str)
    if match:
        block_id = match.group(1)
        bay = int(match.group(2))
        row = int(match.group(3))
        tier = int(match.group(4))
        return block_id, bay, row, tier

    return None, None, None, None


def get_pod_from_block(block_id):
    """Derive POD from block_id prefix."""
    if not block_id:
        return None
    if block_id.startswith("SS"):
        return "Kochi"
    elif block_id.startswith("LS"):
        return "JNPT"
    elif block_id.startswith("OOG"):
        return "Mundra"
    return None


def map_flow_type(flow_type):
    """Map flow_type to container type field."""
    if not flow_type or pd.isna(flow_type):
        return "export_container"
    flow = str(flow_type).lower()
    if "export" in flow:
        return "export_container"
    elif "import" in flow:
        return "import_container"
    elif "empty" in flow:
        return "empty"
    return "export_container"


def clean_value(val):
    """Clean a value - convert NaN to None, strip strings."""
    if pd.isna(val):
        return None
    if isinstance(val, str):
        return val.strip() if val.strip() else None
    return val


def seed_containers():
    """Main function to seed container data from Excel files."""
    db = SessionLocal()

    try:
        # First, clear existing container data
        print("Clearing existing container data...")
        db.execute(text("DELETE FROM containers"))
        db.commit()
        print("Existing data cleared.\n")

        total_inserted = 0
        container_idx = 0

        for file_name in FILES:
            file_path = os.path.join(DATA_FOLDER, file_name)

            if not os.path.exists(file_path):
                print(f"SKIP: {file_name} not found")
                continue

            print(f"Processing: {file_name}...")

            try:
                df = pd.read_excel(file_path)
                print(f"  Loaded {len(df):,} rows")
            except Exception as e:
                print(f"  ERROR loading: {e}")
                continue

            batch = []
            batch_size = 1000

            for idx, row in df.iterrows():
                container_idx += 1

                # Parse event sequence number (remove file suffix like _4)
                event_seq = str(row.get('event_seq_no', idx + 1))
                if '_' in event_seq:
                    event_seq = event_seq.split('_')[0]
                try:
                    event_seq_int = int(event_seq)
                except:
                    event_seq_int = idx + 1

                # Parse container_number (remove file suffix)
                container_number = str(row.get('container_number', f'UNKNOWN-{container_idx}'))
                if '_' in container_number:
                    container_number = container_number.rsplit('_', 1)[0]

                # Generate unique container_id for this event
                container_id = f"CTR-{container_idx:06d}-EVT-{event_seq_int}"

                # Parse to_location for bay/row/tier
                to_loc = row.get('to_location_id')
                block_id, bay, row_num, tier = parse_location(to_loc)

                # Weight conversion (kg to MT)
                weight_kg = row.get('gross_weight_kg', 0)
                weight_mt = float(weight_kg) / 1000 if weight_kg and not pd.isna(weight_kg) else 0

                # Create container record
                container = models.Container(
                    # Core Identification
                    container_id=container_id,
                    container_number=container_number,
                    iso_code=clean_value(row.get('iso_code')) or "22G1",
                    size_teu=int(row.get('size_teu', 1)) if not pd.isna(row.get('size_teu')) else 1,
                    container_type=clean_value(row.get('container_type')) or "Dry",
                    load_status=clean_value(row.get('load_status')) or "Full",

                    # Weight & Cargo
                    weight_mt=round(weight_mt, 2),
                    weight_class=clean_value(row.get('weight_class')) or "Medium",
                    cargo_description=clean_value(row.get('reason_for_movement')) or "General Cargo",

                    # Movement & Status
                    type=map_flow_type(row.get('flow_type')),
                    shipping_bill_number=clean_value(row.get('shipping_bill_number')),
                    customs_status="Cleared",  # Default

                    # Vessel & Voyage
                    vessel_id=clean_value(row.get('vessel_id')),
                    voyage_id=clean_value(row.get('voyage_id')),
                    pod=get_pod_from_block(block_id),
                    cutoff_datetime=str(row.get('export_cutoff_datetime')) if not pd.isna(row.get('export_cutoff_datetime')) else None,

                    # Hazmat
                    hazmat_flag=str(row.get('container_type', '')).lower() == 'hazardous',
                    reefer_flag=str(row.get('container_type', '')).lower() == 'reefer',

                    # Current Location (from to_location)
                    block_id=block_id,
                    bay=bay,
                    row=row_num,
                    tier=tier,

                    # Timestamps
                    gate_in_time=str(row.get('container_arrival_datetime')) if not pd.isna(row.get('container_arrival_datetime')) else None,

                    # Event Tracking
                    event_sequence_number=event_seq_int,
                    movement_id=clean_value(row.get('movement_id')),
                    event_type=clean_value(row.get('event_type')),

                    # Voyage & Movement
                    actual_voyage_datetime=str(row.get('actual_voyage_datetime')) if not pd.isna(row.get('actual_voyage_datetime')) else None,
                    movement_type=clean_value(row.get('movement_type')),

                    # Location Details
                    yard_zone_type=clean_value(row.get('yard_zone_type')),
                    from_location_type=clean_value(row.get('from_location_type')),
                    from_location_id=clean_value(row.get('from_location_id')),
                    to_location_type=clean_value(row.get('to_location_type')),
                    to_location_id=clean_value(row.get('to_location_id')),
                    stack_height_after_move=int(row.get('stack_height_after_move')) if not pd.isna(row.get('stack_height_after_move')) else None,

                    # Equipment & Operations
                    equipment_id=clean_value(row.get('equipment_id')),
                    equipment_type=clean_value(row.get('equipment_type')),
                    operator_id=clean_value(row.get('operator_id')),
                    job_id=clean_value(row.get('job_id')),

                    # Timing
                    planned_timestamp=str(row.get('planned_timestamp')) if not pd.isna(row.get('planned_timestamp')) else None,
                    actual_timestamp=str(row.get('actual_timestamp')) if not pd.isna(row.get('actual_timestamp')) else None,
                    delay_minutes=int(row.get('delay_minutes')) if not pd.isna(row.get('delay_minutes')) else None,
                    dwell_time_since_last_event_min=float(row.get('dwell_minutes_since_last_event')) if not pd.isna(row.get('dwell_minutes_since_last_event')) else None,

                    # Status & Exceptions
                    exception_flag=bool(row.get('exception_flag')) if not pd.isna(row.get('exception_flag')) else False,
                    exception_reason=clean_value(row.get('exception_reason')),
                    reason_for_movement=clean_value(row.get('reason_for_movement')),
                    container_status_after_event=clean_value(row.get('container_status_after_event')),

                    # Optimization Metrics
                    move_intent=clean_value(row.get('move_intent')),
                    rehandle_flag=bool(row.get('rehandle_flag')) if not pd.isna(row.get('rehandle_flag')) else False,
                    rehandle_count=int(row.get('rehandle_count')) if not pd.isna(row.get('rehandle_count')) else 0,
                    total_dwell_time_min=float(row.get('total_dwell_minutes')) if not pd.isna(row.get('total_dwell_minutes')) else None,

                    # Yard Metrics
                    yard_utilization_percent=float(row.get('yard_utilization_pct')) if not pd.isna(row.get('yard_utilization_pct')) else None,
                    congestion_level=clean_value(row.get('congestion_level')),
                )

                batch.append(container)

                # Commit in batches
                if len(batch) >= batch_size:
                    db.bulk_save_objects(batch)
                    db.commit()
                    total_inserted += len(batch)
                    print(f"    Inserted {total_inserted:,} rows...")
                    batch = []

            # Insert remaining batch
            if batch:
                db.bulk_save_objects(batch)
                db.commit()
                total_inserted += len(batch)

            print(f"  Completed: {file_name}")

        print(f"\n{'='*50}")
        print(f"TOTAL INSERTED: {total_inserted:,} container event records")
        print(f"{'='*50}")

        # Verify counts
        count = db.query(models.Container).count()
        distinct_containers = db.execute(text("SELECT COUNT(DISTINCT container_number) FROM containers")).scalar()
        print(f"\nVerification:")
        print(f"  Total rows in containers table: {count:,}")
        print(f"  Distinct container_numbers: {distinct_containers:,}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


def sync_container_placements():
    """
    Sync container placements to YardLocations table.

    Logic: For each container_number, find the LATEST event that has valid
    placement data (block_id, bay, row, tier all set). This handles the case
    where containers move through the yard (Stack -> Pre-Staging -> Vessel Load).
    We want to place containers that are CURRENTLY in the yard, not those that
    have already been loaded onto vessels or gated out.
    """
    from sqlalchemy import func

    db = SessionLocal()

    try:
        print("\n" + "="*50)
        print("SYNCING CONTAINER PLACEMENTS TO YARD LOCATIONS")
        print("="*50)

        # Step 1: Clear existing placements
        print("\nStep 1: Clearing existing placements...")
        db.execute(text("UPDATE yard_locations SET occupied = 0, container_id = NULL, status = NULL"))
        db.execute(text("UPDATE containers SET current_location_id = NULL"))
        db.execute(text("UPDATE blocks SET occupied_slots = 0"))
        db.commit()

        # Step 2: Find containers currently in yard
        # For each container, get the LATEST event that has valid placement
        # Skip containers whose latest event is 'Vessel Load' or 'Gate Out' (not in yard anymore)
        print("Step 2: Finding containers currently in yard...")

        # Subquery: Latest event per container that has valid placement
        latest_placed_query = text("""
            WITH latest_placed AS (
                SELECT container_number,
                       MAX(event_sequence_number) as max_placed_seq
                FROM containers
                WHERE block_id IS NOT NULL
                  AND bay IS NOT NULL AND bay > 0
                  AND row IS NOT NULL AND row > 0
                  AND tier IS NOT NULL AND tier > 0
                GROUP BY container_number
            ),
            latest_overall AS (
                SELECT container_number,
                       MAX(event_sequence_number) as max_seq
                FROM containers
                GROUP BY container_number
            ),
            -- Get containers where the latest event is still a placement event
            -- (not Vessel Load or Gate Out)
            containers_in_yard AS (
                SELECT lp.container_number, lp.max_placed_seq
                FROM latest_placed lp
                JOIN latest_overall lo ON lp.container_number = lo.container_number
                JOIN containers c ON c.container_number = lo.container_number
                                  AND c.event_sequence_number = lo.max_seq
                -- Container is in yard if latest event is NOT a departure event
                WHERE c.event_type NOT IN ('Vessel Load', 'Gate Out', 'Shipped')
                   OR c.event_type IS NULL
            )
            SELECT c.container_id, c.container_number, c.block_id, c.bay, c.row, c.tier, c.event_type
            FROM containers c
            JOIN containers_in_yard ciy
              ON c.container_number = ciy.container_number
             AND c.event_sequence_number = ciy.max_placed_seq
        """)

        containers_to_place = db.execute(latest_placed_query).fetchall()
        print(f"   Found {len(containers_to_place):,} containers currently in yard")

        # Step 3: Place containers in YardLocations
        print("Step 3: Placing containers in yard locations...")
        placed = []
        errors = []

        for row in containers_to_place:
            container_id, container_number, block_id, bay, row_num, tier, event_type = row

            # Find matching YardLocation
            location = db.query(models.YardLocation).filter(
                models.YardLocation.block_id == block_id,
                models.YardLocation.bay == bay,
                models.YardLocation.row == row_num,
                models.YardLocation.tier == tier
            ).first()

            if not location:
                errors.append({
                    "container_number": container_number,
                    "block_id": block_id,
                    "bay": bay,
                    "row": row_num,
                    "tier": tier,
                    "reason": "No matching YardLocation"
                })
                continue

            # Check for conflict
            if location.occupied:
                errors.append({
                    "container_number": container_number,
                    "location_id": location.location_id,
                    "reason": f"Slot already occupied by {location.container_id}"
                })
                continue

            # Place the container
            location.occupied = True
            location.container_id = container_id
            location.status = "actual"

            # Update container's current_location_id
            db.execute(text(
                "UPDATE containers SET current_location_id = :loc_id WHERE container_id = :cid"
            ), {"loc_id": location.location_id, "cid": container_id})

            placed.append({
                "container_number": container_number,
                "location_id": location.location_id,
                "block_id": block_id,
            })

        # Step 4: Update block occupied_slots
        print("Step 4: Updating block occupancy counts...")
        block_counts = db.execute(text("""
            SELECT block_id, COUNT(*) as cnt
            FROM yard_locations
            WHERE occupied = 1
            GROUP BY block_id
        """)).fetchall()

        for block_id, count in block_counts:
            db.execute(text(
                "UPDATE blocks SET occupied_slots = :cnt WHERE block_id = :bid"
            ), {"cnt": count, "bid": block_id})

        db.commit()

        # Summary
        print(f"\n{'='*50}")
        print(f"SYNC COMPLETED")
        print(f"{'='*50}")
        print(f"  Placed: {len(placed):,} containers")
        print(f"  Errors: {len(errors):,}")

        if errors and len(errors) <= 10:
            print(f"\n  Sample errors:")
            for e in errors[:10]:
                print(f"    {e}")
        elif errors:
            print(f"\n  First 5 errors:")
            for e in errors[:5]:
                print(f"    {e}")

        # Verify
        occupied_count = db.execute(text("SELECT COUNT(*) FROM yard_locations WHERE occupied = 1")).scalar()
        print(f"\n  Verification: {occupied_count:,} locations now occupied")

        return {"placed": len(placed), "errors": len(errors)}

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("="*60)
    print("CONTAINER DATA SEEDING SCRIPT")
    print("="*60)
    print()
    seed_containers()
    sync_container_placements()

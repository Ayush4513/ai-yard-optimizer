"""
Setup V2 Tables for Selective Yard Visualization

This script creates filtered subset tables:
- yards_v2: Same yards but limited blocks
- blocks_v2: 3 SS blocks + 3 LS blocks covering different types
- yard_locations_v2: Only bays 1-5 from selected blocks
- containers_v2: Only containers placed in v2 locations

Selected blocks (covering all types):
- SS1-B1 (Reefer), SS3-B1 (General), SS5-B4 (Hazmat)
- LS1-B1 (Reefer), LS2-B1 (General), LS4-B1 (Hazmat)
"""

import os
import sys
from sqlalchemy import text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from Database.database import SessionLocal, engine
from Database import models

# Configuration: Selected blocks covering different types
SELECTED_BLOCKS = [
    # Sea-Side: 1 Reefer, 1 General, 1 Hazmat
    "SS1-B1",  # Reefer
    "SS3-B1",  # General
    "SS5-B4",  # Hazmat
    # Land-Side: 1 Reefer, 1 General, 1 Hazmat
    "LS1-B1",  # Reefer
    "LS2-B1",  # General
    "LS4-B1",  # Hazmat
]

# Limit bays to 1-5
MAX_BAYS = 5


def setup_v2_tables():
    """Create and populate v2 tables with filtered data."""
    db = SessionLocal()

    try:
        print("="*60)
        print("SETTING UP V2 TABLES (Selective Yard Subset)")
        print("="*60)
        print(f"\nSelected blocks: {SELECTED_BLOCKS}")
        print(f"Max bays per block: {MAX_BAYS}")

        # Step 1: Create v2 tables (drop if exist)
        print("\nStep 1: Creating v2 tables...")

        db.execute(text("DROP TABLE IF EXISTS containers_v2"))
        db.execute(text("DROP TABLE IF EXISTS yard_locations_v2"))
        db.execute(text("DROP TABLE IF EXISTS blocks_v2"))
        db.execute(text("DROP TABLE IF EXISTS yards_v2"))
        db.commit()

        # Create yards_v2 (copy structure from yards)
        db.execute(text("""
            CREATE TABLE yards_v2 AS
            SELECT * FROM yards
            WHERE yard_id IN ('SS1', 'SS3', 'SS5', 'LS1', 'LS2', 'LS4')
        """))

        # Create blocks_v2 (copy selected blocks, update total_slots)
        db.execute(text(f"""
            CREATE TABLE blocks_v2 AS
            SELECT
                block_id, yard_id, yard_name, block_name, block_type,
                block_number, position_x, position_y,
                {MAX_BAYS} * rows * max_tier as total_slots,
                0 as occupied_slots,
                {MAX_BAYS} as bays,
                rows, max_tier, reefer_plugs, hazmat_certified,
                empty_storage, primary_use, notes
            FROM blocks
            WHERE block_id IN ({','.join(f"'{b}'" for b in SELECTED_BLOCKS)})
        """))

        # Create yard_locations_v2 (only bays 1-5 from selected blocks)
        db.execute(text(f"""
            CREATE TABLE yard_locations_v2 AS
            SELECT *
            FROM yard_locations
            WHERE block_id IN ({','.join(f"'{b}'" for b in SELECTED_BLOCKS)})
              AND bay <= {MAX_BAYS}
        """))

        # Reset occupancy in v2 locations
        db.execute(text("""
            UPDATE yard_locations_v2
            SET occupied = 0, container_id = NULL, status = NULL
        """))

        db.commit()
        print("   Tables created successfully")

        # Step 2: Verify table counts
        print("\nStep 2: Verifying v2 tables...")

        yards_count = db.execute(text("SELECT COUNT(*) FROM yards_v2")).scalar()
        blocks_count = db.execute(text("SELECT COUNT(*) FROM blocks_v2")).scalar()
        locations_count = db.execute(text("SELECT COUNT(*) FROM yard_locations_v2")).scalar()

        print(f"   yards_v2: {yards_count} yards")
        print(f"   blocks_v2: {blocks_count} blocks")
        print(f"   yard_locations_v2: {locations_count} locations")

        # Step 3: Find containers that should be in v2 locations
        print("\nStep 3: Finding containers for v2 locations...")

        # Get containers whose latest placement is in a v2 block and bay <= 5
        containers_query = text(f"""
            WITH latest_placed AS (
                SELECT container_number,
                       MAX(event_sequence_number) as max_placed_seq
                FROM containers
                WHERE block_id IN ({','.join(f"'{b}'" for b in SELECTED_BLOCKS)})
                  AND bay IS NOT NULL AND bay > 0 AND bay <= {MAX_BAYS}
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
            containers_in_v2_yard AS (
                SELECT lp.container_number, lp.max_placed_seq
                FROM latest_placed lp
                JOIN latest_overall lo ON lp.container_number = lo.container_number
                JOIN containers c ON c.container_number = lo.container_number
                                  AND c.event_sequence_number = lo.max_seq
                WHERE c.event_type NOT IN ('Vessel Load', 'Gate Out', 'Shipped')
                   OR c.event_type IS NULL
            )
            SELECT c.*
            FROM containers c
            JOIN containers_in_v2_yard cv2
              ON c.container_number = cv2.container_number
             AND c.event_sequence_number = cv2.max_placed_seq
        """)

        # Create containers_v2 table
        db.execute(text("DROP TABLE IF EXISTS containers_v2"))
        db.execute(text(f"""
            CREATE TABLE containers_v2 AS
            {containers_query.text}
        """))
        db.commit()

        containers_v2_count = db.execute(text("SELECT COUNT(*) FROM containers_v2")).scalar()
        print(f"   containers_v2: {containers_v2_count} containers")

        # Step 4: Sync placements to v2 locations
        print("\nStep 4: Syncing placements to v2 locations...")

        placed = 0
        errors = 0

        v2_containers = db.execute(text("""
            SELECT container_id, container_number, block_id, bay, row, tier
            FROM containers_v2
        """)).fetchall()

        for c in v2_containers:
            container_id, container_number, block_id, bay, row_num, tier = c

            # Find matching location in v2
            result = db.execute(text("""
                SELECT location_id FROM yard_locations_v2
                WHERE block_id = :block_id AND bay = :bay AND row = :row AND tier = :tier
            """), {"block_id": block_id, "bay": bay, "row": row_num, "tier": tier}).fetchone()

            if result:
                location_id = result[0]
                # Check if already occupied
                occupied = db.execute(text("""
                    SELECT occupied FROM yard_locations_v2 WHERE location_id = :loc_id
                """), {"loc_id": location_id}).scalar()

                if not occupied:
                    db.execute(text("""
                        UPDATE yard_locations_v2
                        SET occupied = 1, container_id = :cid, status = 'actual'
                        WHERE location_id = :loc_id
                    """), {"cid": container_id, "loc_id": location_id})

                    db.execute(text("""
                        UPDATE containers_v2
                        SET current_location_id = :loc_id
                        WHERE container_id = :cid
                    """), {"loc_id": location_id, "cid": container_id})
                    placed += 1
                else:
                    errors += 1
            else:
                errors += 1

        # Update block occupied_slots
        db.execute(text("""
            UPDATE blocks_v2
            SET occupied_slots = (
                SELECT COUNT(*) FROM yard_locations_v2
                WHERE yard_locations_v2.block_id = blocks_v2.block_id AND occupied = 1
            )
        """))

        db.commit()
        print(f"   Placed: {placed} containers")
        print(f"   Errors: {errors}")

        # Step 5: Final summary
        print("\n" + "="*60)
        print("V2 TABLES SETUP COMPLETE")
        print("="*60)

        # Show block summary
        blocks_summary = db.execute(text("""
            SELECT block_id, block_type, total_slots, occupied_slots
            FROM blocks_v2
            ORDER BY block_id
        """)).fetchall()

        print("\nBlocks in v2:")
        for b in blocks_summary:
            print(f"  {b[0]} ({b[1]}): {b[3]}/{b[2]} occupied")

        total_occupied = db.execute(text("""
            SELECT COUNT(*) FROM yard_locations_v2 WHERE occupied = 1
        """)).scalar()
        print(f"\nTotal occupied locations in v2: {total_occupied}")

        return {
            "yards": yards_count,
            "blocks": blocks_count,
            "locations": locations_count,
            "containers": containers_v2_count,
            "placed": placed
        }

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    setup_v2_tables()

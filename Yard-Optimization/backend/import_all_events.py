"""
Import All Events Script
Imports EVERY row from Excel as a separate container record.
Each event becomes a unique container entry in the database.
"""

import pandas as pd
import re
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Container, Base
from datetime import datetime
import sys

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)


def parse_stack_id(stack_id):
    """Auto-detect and parse Stack ID into bay and row components."""
    if pd.isna(stack_id) or stack_id == "N/A":
        return None, None

    stack_str = str(stack_id).strip().upper()

    # Try format: B12-R03 or B12R03
    match = re.match(r'B?(\d+)[-/]?R?(\d+)', stack_str)
    if match:
        bay = int(match.group(1))
        row = int(match.group(2))
        return bay, row

    # Try pure numeric
    if stack_str.isdigit():
        return int(stack_str), None

    return None, None


def transform_all_events(df):
    """
    Transform ALL Excel events into container records.
    Each row becomes a separate container entry.
    """
    print(f"Total events in Excel: {len(df)}")

    containers = []
    skipped = []
    event_counter = 1

    for idx, row in df.iterrows():
        try:
            # Parse Stack ID into bay and row
            bay, row_num = parse_stack_id(row.get('Stack ID'))

            # Calculate dwell time in hours
            dwell_time_hours = None
            if pd.notna(row.get('Total Dwell Time (min)')):
                dwell_time_hours = float(row['Total Dwell Time (min)']) / 60.0

            # Determine hazmat and reefer flags from container type
            container_type = row['Container Type']
            hazmat_flag = container_type == 'Hazardous'
            reefer_flag = container_type == 'Reefer'

            # Intelligent defaults for missing fields
            cargo_desc = row.get('Container Type', 'General Cargo')
            if pd.isna(cargo_desc) or cargo_desc == '':
                cargo_desc = 'General Cargo'

            # Generate unique container_id for each event
            # Format: CNT-{original_id}-EVT-{event_sequence}
            original_container_id = str(row['Container ID']).strip()
            event_seq = row.get('Event Sequence Number')
            if pd.notna(event_seq):
                unique_container_id = f"{original_container_id}-EVT-{int(event_seq)}"
            else:
                unique_container_id = f"{original_container_id}-EVT-{event_counter}"
            event_counter += 1

            # Build container dictionary
            container_data = {
                # Use unique ID for database primary key
                'container_id': unique_container_id,

                # Core identification
                'container_number': str(row['Container Number']).strip(),
                'iso_code': str(row['ISO Code']).strip(),
                'size_teu': int(row['Size (TEU)']),
                'container_type': container_type,
                'load_status': row['Load Status'],

                # Weight & Cargo
                'weight_mt': float(row['Weight (MT)']),
                'weight_class': row['Weight Class'],
                'cargo_description': cargo_desc,
                'seal_number': None,

                # Movement & Status
                'type': row['Type'],
                'shipping_bill_number': row.get('Shipping Bill Number'),
                'bill_of_lading': None,
                'customs_status': 'Cleared',
                'shipping_line': None,
                'consignee': None,

                # Vessel & Voyage
                'vessel_id': row.get('Vessel ID'),
                'voyage_id': row.get('Voyage ID'),
                'pod': row.get('POD'),
                'pod_priority': int(row['POD Priority']) if pd.notna(row.get('POD Priority')) else None,
                'cutoff_datetime': str(row['Cutoff DateTime']) if pd.notna(row.get('Cutoff DateTime')) else None,

                # Hazmat
                'hazmat_flag': hazmat_flag,
                'imdg_class': None,
                'un_number': None,
                'hazmat_segregation': None,

                # Reefer
                'reefer_flag': reefer_flag,
                'set_temperature': None,
                'current_temperature': None,
                'ventilation_setting': None,
                'humidity_setting': None,

                # Current Location
                'current_location_id': None,
                'block_id': row.get('Block ID') if pd.notna(row.get('Block ID')) and row.get('Block ID') != 'N/A' else None,
                'bay': bay,
                'row': row_num,
                'tier': int(row['Tier Level']) if pd.notna(row.get('Tier Level')) else None,

                # Timestamps
                'gate_in_time': str(row['Timestamp']),
                'expected_pickup_time': str(row['Expected Voyage DateTime']) if pd.notna(row.get('Expected Voyage DateTime')) else None,
                'dwell_time_hours': dwell_time_hours,

                # Event Tracking
                'event_sequence_number': int(row['Event Sequence Number']) if pd.notna(row.get('Event Sequence Number')) else None,
                'movement_id': row.get('Movement ID'),
                'event_type': row.get('Event Type'),

                # Voyage & Movement
                'actual_voyage_datetime': str(row['Actual Voyage DateTime']) if pd.notna(row.get('Actual Voyage DateTime')) else None,
                'movement_type': row.get('Movement Type'),

                # Location Details
                'yard_zone_type': row.get('Yard Zone Type'),
                'from_location_type': row.get('From Location Type'),
                'from_location_id': row.get('From Location ID') if pd.notna(row.get('From Location ID')) and row.get('From Location ID') != 'N/A' else None,
                'to_location_type': row.get('To Location Type'),
                'to_location_id': row.get('To Location ID') if pd.notna(row.get('To Location ID')) and row.get('To Location ID') != 'N/A' else None,
                'stack_id': row.get('Stack ID') if pd.notna(row.get('Stack ID')) and row.get('Stack ID') != 'N/A' else None,
                'stack_height_after_move': int(row['Stack Height After Move']) if pd.notna(row.get('Stack Height After Move')) else None,

                # Equipment & Operations
                'equipment_id': row.get('Equipment ID') if pd.notna(row.get('Equipment ID')) and row.get('Equipment ID') != 'N/A' else None,
                'equipment_type': row.get('Equipment Type'),
                'operator_id': row.get('Operator ID'),
                'job_id': row.get('Job ID'),

                # Timing
                'planned_timestamp': str(row['Planned Timestamp']) if pd.notna(row.get('Planned Timestamp')) else None,
                'actual_timestamp': str(row['Actual Timestamp']) if pd.notna(row.get('Actual Timestamp')) else None,
                'delay_minutes': int(row['Delay Minutes']) if pd.notna(row.get('Delay Minutes')) else None,
                'dwell_time_since_last_event_min': float(row['Dwell Time Since Last Event (min)']) if pd.notna(row.get('Dwell Time Since Last Event (min)')) else None,

                # Status & Exceptions
                'exception_flag': bool(row['Exception Flag']) if pd.notna(row.get('Exception Flag')) else False,
                'exception_reason': row.get('Exception Reason') if pd.notna(row.get('Exception Reason')) and row.get('Exception Reason') != 'N/A' else None,
                'reason_for_movement': row.get('Reason for Movement'),
                'container_status_after_event': row.get('Container Status After Event'),

                # Optimization Metrics
                'move_intent': row.get('Move Intent'),
                'optimality_tag': row.get('Optimality Tag'),
                'rehandle_flag': bool(row['Rehandle Flag']) if pd.notna(row.get('Rehandle Flag')) else False,
                'rehandle_count': int(row['Rehandle Count']) if pd.notna(row.get('Rehandle Count')) else 0,
                'total_dwell_time_min': float(row['Total Dwell Time (min)']) if pd.notna(row.get('Total Dwell Time (min)')) else None,

                # Yard Metrics
                'yard_utilization_percent': float(row['Yard Utilization %']) if pd.notna(row.get('Yard Utilization %')) else None,
                'block_utilization_percent': float(row['Block Utilization %']) if pd.notna(row.get('Block Utilization %')) else None,
                'congestion_level': row.get('Congestion Level'),
            }

            containers.append(container_data)

        except Exception as e:
            skipped.append({
                'container_id': row.get('Container ID', 'UNKNOWN'),
                'event_seq': row.get('Event Sequence Number', 'UNKNOWN'),
                'error': str(e)
            })
            print(f"[WARN] Skipped event {row.get('Event Sequence Number')}: {e}")

    print(f"[OK] Successfully transformed: {len(containers)}")
    print(f"[WARN] Skipped due to errors: {len(skipped)}")

    return containers, skipped


def import_to_database(containers, db: Session):
    """Import all container events into the database."""
    imported = 0
    updated = 0
    errors = []

    for container_data in containers:
        try:
            # Check if container already exists
            existing = db.query(Container).filter(
                Container.container_id == container_data['container_id']
            ).first()

            if existing:
                # Update existing record
                for key, value in container_data.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                # Create new record
                new_container = Container(**container_data)
                db.add(new_container)
                imported += 1

            # Commit every 50 records
            if (imported + updated) % 50 == 0:
                db.commit()
                print(f"Progress: {imported + updated} events processed...")

        except Exception as e:
            errors.append({
                'container_id': container_data.get('container_id', 'UNKNOWN'),
                'error': str(e)
            })
            print(f"[ERROR] Error importing {container_data.get('container_id')}: {e}")

    # Final commit
    db.commit()

    print(f"\n{'='*60}")
    print(f"[OK] Newly imported: {imported}")
    print(f"[UPDATE] Updated existing: {updated}")
    print(f"[ERROR] Errors: {len(errors)}")
    print(f"{'='*60}")

    return imported, updated, errors


def main(excel_file_path):
    """Main import function for all events."""
    print(f"Starting FULL EVENT import from: {excel_file_path}")
    print(f"{'='*60}\n")

    # Read Excel file
    try:
        df = pd.read_excel(excel_file_path, sheet_name='Container Movements')
        print(f"[OK] Excel file loaded successfully")
        print(f"Total events to import: {len(df)}")
        print(f"Columns: {len(df.columns)}\n")
    except Exception as e:
        print(f"[ERROR] Error reading Excel file: {e}")
        return

    # Transform ALL events
    containers, skipped = transform_all_events(df)

    if not containers:
        print("[ERROR] No events to import. Exiting.")
        return

    # Import to database
    db = SessionLocal()
    try:
        imported, updated, errors = import_to_database(containers, db)

        # Print summary
        print(f"\n[INFO] IMPORT SUMMARY")
        print(f"{'='*60}")
        print(f"Total events processed: {len(df)}")
        print(f"Successfully imported: {imported}")
        print(f"Updated existing: {updated}")
        print(f"Transformation errors: {len(skipped)}")
        print(f"Database errors: {len(errors)}")
        print(f"{'='*60}")

        # Save error log if any
        if skipped or errors:
            error_log = pd.DataFrame({
                'Type': ['Transform']*len(skipped) + ['Database']*len(errors),
                'Container ID': [s.get('container_id', 'UNKNOWN') for s in skipped] + [e['container_id'] for e in errors],
                'Error': [s.get('error', 'UNKNOWN') for s in skipped] + [e['error'] for e in errors]
            })
            log_file = 'import_all_events_errors.csv'
            error_log.to_csv(log_file, index=False)
            print(f"\n[WARN] Error log saved to: {log_file}")

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_all_events.py <path_to_excel_file>")
        print("\nExample:")
        print("  python import_all_events.py data/container_events.xlsx")
        sys.exit(1)

    excel_path = sys.argv[1]
    main(excel_path)

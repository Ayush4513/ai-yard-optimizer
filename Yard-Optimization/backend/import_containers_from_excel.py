"""
Container Import Script from Excel Event Data
Imports container data from event-based Excel sheets into the SQLite database.
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
    """
    Auto-detect and parse Stack ID into bay and row components.

    Supports formats:
    - "B12-R03" or "B12R03" -> bay=12, row=3
    - "12-03" or "12/03" -> bay=12, row=3
    - "123" (numeric) -> bay=123, row=None
    """
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


def transform_container_data(df):
    """
    Transform Excel event data into container records.
    Takes the most recent event for each container.
    """
    print(f"Total events in Excel: {len(df)}")

    # Sort by Container ID and Timestamp (most recent first)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    df_sorted = df.sort_values(['Container ID', 'Timestamp'], ascending=[True, False])

    # Keep only the most recent event per container
    df_unique = df_sorted.drop_duplicates(subset=['Container ID'], keep='first')
    print(f"Unique containers found: {len(df_unique)}")

    containers = []
    skipped = []

    for idx, row in df_unique.iterrows():
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

            # Build container dictionary
            container_data = {
                # Core identification
                'container_id': str(row['Container ID']).strip(),
                'container_number': str(row['Container Number']).strip(),
                'iso_code': str(row['ISO Code']).strip(),
                'size_teu': int(row['Size (TEU)']),
                'container_type': container_type,
                'load_status': row['Load Status'],

                # Weight & Cargo
                'weight_mt': float(row['Weight (MT)']),
                'weight_class': row['Weight Class'],
                'cargo_description': cargo_desc,
                'seal_number': None,  # Not in Excel

                # Movement & Status
                'type': row['Type'],
                'shipping_bill_number': row.get('Shipping Bill Number'),
                'bill_of_lading': None,  # Not in Excel
                'customs_status': 'Cleared',  # Default - can be updated later
                'shipping_line': None,  # Not in Excel - could derive from Vessel ID
                'consignee': None,  # Not in Excel

                # Vessel & Voyage
                'vessel_id': row.get('Vessel ID'),
                'voyage_id': row.get('Voyage ID'),
                'pod': row.get('POD'),
                'pod_priority': int(row['POD Priority']) if pd.notna(row.get('POD Priority')) else None,
                'cutoff_datetime': str(row['Cutoff DateTime']) if pd.notna(row.get('Cutoff DateTime')) else None,

                # Hazmat
                'hazmat_flag': hazmat_flag,
                'imdg_class': None,  # Not in Excel
                'un_number': None,  # Not in Excel
                'hazmat_segregation': None,  # Not in Excel

                # Reefer
                'reefer_flag': reefer_flag,
                'set_temperature': None,  # Not in Excel
                'current_temperature': None,  # Not in Excel
                'ventilation_setting': None,  # Not in Excel
                'humidity_setting': None,  # Not in Excel

                # Current Location
                'current_location_id': None,  # Could construct from Block+Stack+Tier
                'block_id': row.get('Block ID') if pd.notna(row.get('Block ID')) and row.get('Block ID') != 'N/A' else None,
                'bay': bay,
                'row': row_num,
                'tier': int(row['Tier Level']) if pd.notna(row.get('Tier Level')) else None,

                # Timestamps
                'gate_in_time': str(row['Timestamp']),
                'expected_pickup_time': str(row['Expected Voyage DateTime']) if pd.notna(row.get('Expected Voyage DateTime')) else None,
                'dwell_time_hours': dwell_time_hours,

                # ========== NEW EXCEL EVENT FIELDS ==========

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
                'error': str(e)
            })
            print(f"[WARN]  Skipped container {row.get('Container ID')}: {e}")

    print(f"[OK] Successfully transformed: {len(containers)}")
    print(f"[WARN]  Skipped due to errors: {len(skipped)}")

    return containers, skipped


def import_to_database(containers, db: Session):
    """
    Import container data into the database.
    Handles duplicates by updating existing records.
    """
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

            # Commit every 100 records
            if (imported + updated) % 100 == 0:
                db.commit()
                print(f"Progress: {imported + updated} containers processed...")

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
    """
    Main import function.

    Usage:
        python import_containers_from_excel.py path/to/your/excel_file.xlsx
    """
    print(f"Starting import from: {excel_file_path}")
    print(f"{'='*60}\n")

    # Read Excel file
    try:
        df = pd.read_excel(excel_file_path, sheet_name='Container Movements')
        print(f"[OK] Excel file loaded successfully")
        print(f"Total rows: {len(df)}")
        print(f"Columns: {list(df.columns)[:5]}... (showing first 5)\n")
    except Exception as e:
        print(f"[ERROR] Error reading Excel file: {e}")
        return

    # Transform data
    containers, skipped = transform_container_data(df)

    if not containers:
        print("[ERROR] No containers to import. Exiting.")
        return

    # Import to database
    db = SessionLocal()
    try:
        imported, updated, errors = import_to_database(containers, db)

        # Print summary
        print(f"\n[INFO] IMPORT SUMMARY")
        print(f"{'='*60}")
        print(f"Total events processed: {len(df)}")
        print(f"Unique containers: {len(containers) + len(skipped)}")
        print(f"Successfully imported: {imported}")
        print(f"Updated existing: {updated}")
        print(f"Transformation errors: {len(skipped)}")
        print(f"Database errors: {len(errors)}")
        print(f"{'='*60}")

        # Save error log if any
        if skipped or errors:
            error_log = pd.DataFrame({
                'Type': ['Transform']*len(skipped) + ['Database']*len(errors),
                'Container ID': [s['container_id'] for s in skipped] + [e['container_id'] for e in errors],
                'Error': [s['error'] for s in skipped] + [e['error'] for e in errors]
            })
            log_file = 'import_errors.csv'
            error_log.to_csv(log_file, index=False)
            print(f"\n[WARN]  Error log saved to: {log_file}")

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_containers_from_excel.py <path_to_excel_file>")
        print("\nExample:")
        print("  python import_containers_from_excel.py data/container_events.xlsx")
        sys.exit(1)

    excel_path = sys.argv[1]
    main(excel_path)

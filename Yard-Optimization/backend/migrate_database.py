"""
Database Migration Script
Adds new fields to existing containers table for Excel event data import.
"""

from database import engine, Base
from models import Container, YardLocation, Block, Yard
import sqlite3

def migrate_database():
    """
    Migrate the database to add new fields from Excel event data.
    This script is safe to run multiple times - it will skip columns that already exist.
    """
    print("=" * 60)
    print("DATABASE MIGRATION - Adding Excel Event Fields")
    print("=" * 60)

    # Get SQLite connection
    conn = sqlite3.connect('yard_optimization.db')
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(containers)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    print(f"\nExisting columns in containers table: {len(existing_columns)}")

    # Define new columns to add
    new_columns = [
        # Event Tracking
        ("event_sequence_number", "INTEGER"),
        ("movement_id", "TEXT"),
        ("event_type", "TEXT"),

        # Voyage & Movement
        ("actual_voyage_datetime", "TEXT"),
        ("movement_type", "TEXT"),

        # Location Details
        ("yard_zone_type", "TEXT"),
        ("from_location_type", "TEXT"),
        ("from_location_id", "TEXT"),
        ("to_location_type", "TEXT"),
        ("to_location_id", "TEXT"),
        ("stack_id", "TEXT"),
        ("stack_height_after_move", "INTEGER"),

        # Equipment & Operations
        ("equipment_id", "TEXT"),
        ("equipment_type", "TEXT"),
        ("operator_id", "TEXT"),
        ("job_id", "TEXT"),

        # Timing
        ("planned_timestamp", "TEXT"),
        ("actual_timestamp", "TEXT"),
        ("delay_minutes", "INTEGER"),
        ("dwell_time_since_last_event_min", "REAL"),

        # Status & Exceptions
        ("exception_flag", "BOOLEAN DEFAULT 0"),
        ("exception_reason", "TEXT"),
        ("reason_for_movement", "TEXT"),
        ("container_status_after_event", "TEXT"),

        # Optimization Metrics
        ("move_intent", "TEXT"),
        ("optimality_tag", "TEXT"),
        ("rehandle_flag", "BOOLEAN DEFAULT 0"),
        ("rehandle_count", "INTEGER DEFAULT 0"),
        ("total_dwell_time_min", "REAL"),

        # Yard Metrics
        ("yard_utilization_percent", "REAL"),
        ("block_utilization_percent", "REAL"),
        ("congestion_level", "TEXT"),
    ]

    added_count = 0
    skipped_count = 0

    print("\nAdding new columns...")
    for column_name, column_type in new_columns:
        if column_name not in existing_columns:
            try:
                alter_sql = f"ALTER TABLE containers ADD COLUMN {column_name} {column_type}"
                cursor.execute(alter_sql)
                print(f"  [OK] Added: {column_name} ({column_type})")
                added_count += 1
            except Exception as e:
                print(f"  [ERROR] Error adding {column_name}: {e}")
        else:
            print(f"  [SKIP] Skipped: {column_name} (already exists)")
            skipped_count += 1

    # Commit changes
    conn.commit()
    conn.close()

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"[OK] Columns added: {added_count}")
    print(f"[SKIP] Columns skipped: {skipped_count}")
    print(f"[INFO] Total new columns: {len(new_columns)}")
    print("=" * 60)
    print("\n[SUCCESS] Migration completed successfully!")
    print("You can now run the import script to seed Excel data.\n")


if __name__ == "__main__":
    migrate_database()

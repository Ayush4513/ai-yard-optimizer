"""
Test script to create sample Excel data and test the import process
"""

import pandas as pd
from datetime import datetime, timedelta

def create_sample_excel():
    """
    Create a sample Excel file with test data for import testing.
    """
    print("Creating sample Excel file for testing...")

    # Create sample data matching your Excel structure
    data = [
        {
            'Event Sequence Number': 1,
            'Movement ID': 'MOV-116DA83603',
            'Timestamp': '2025-01-15 05:51:16',
            'Event Type': 'Gate In',
            'Container ID': 'CNT-0034',
            'Container Number': 'CMAU2682396',
            'ISO Code': '45G1',
            'Size (TEU)': 2,
            'Container Type': 'Dry',
            'Load Status': 'Full',
            'Weight (MT)': 24.4,
            'Weight Class': 'Heavy',
            'Yard Zone Type': 'Sea-Side',
            'Shipping Bill Number': 'SB268546',
            'Vessel ID': 'V007',
            'Voyage ID': 'VOY-2501-KOC-07',
            'POD': 'Kochi',
            'POD Priority': 3,
            'Expected Voyage DateTime': '2025-01-18 09:28:00',
            'Actual Voyage DateTime': '2025-01-18 09:26:00',
            'Cutoff DateTime': '2025-01-18 14:28:00',
            'Type': 'export_container',
            'Movement Type': 'Gate In',
            'From Location Type': 'Gate',
            'From Location ID': 'GATE-2',
            'To Location Type': 'Yard',
            'To Location ID': 'Sea-Side',
            'Block ID': 'N/A',
            'Stack ID': 'N/A',
            'Tier Level': 0,
            'Equipment ID': 'TT-10',
            'Equipment Type': 'internal truck',
            'Stack Height After Move': 0,
            'Operator ID': 'OP-012',
            'Job ID': 'JOB-17B6709E',
            'Planned Timestamp': '2025-01-15 05:51:00',
            'Actual Timestamp': '2025-01-15 05:51:16',
            'Delay Minutes': 0,
            'Exception Flag': 0,
            'Exception Reason': 'N/A',
            'Reason for Movement': 'Export cargo arrival from CFS/ICD',
            'Container Status After Event': 'In Transit',
            'Dwell Time Since Last Event (min)': 0,
            'Move Intent': 'Planned',
            'Optimality Tag': 'Optimal',
            'Rehandle Flag': 0,
            'Rehandle Count': 0,
            'Total Dwell Time (min)': 0,
            'Yard Utilization %': 61.9,
            'Block Utilization %': 24.8,
            'Congestion Level': 'Medium'
        },
        {
            'Event Sequence Number': 2,
            'Movement ID': 'MOV-116DA83604',
            'Timestamp': '2025-01-15 06:15:30',
            'Event Type': 'Yard Placement',
            'Container ID': 'CNT-0034',
            'Container Number': 'CMAU2682396',
            'ISO Code': '45G1',
            'Size (TEU)': 2,
            'Container Type': 'Dry',
            'Load Status': 'Full',
            'Weight (MT)': 24.4,
            'Weight Class': 'Heavy',
            'Yard Zone Type': 'Sea-Side',
            'Shipping Bill Number': 'SB268546',
            'Vessel ID': 'V007',
            'Voyage ID': 'VOY-2501-KOC-07',
            'POD': 'Kochi',
            'POD Priority': 3,
            'Expected Voyage DateTime': '2025-01-18 09:28:00',
            'Actual Voyage DateTime': '2025-01-18 09:26:00',
            'Cutoff DateTime': '2025-01-18 14:28:00',
            'Type': 'export_container',
            'Movement Type': 'Yard Storage',
            'From Location Type': 'Gate',
            'From Location ID': 'GATE-2',
            'To Location Type': 'Block',
            'To Location ID': 'BLK-A01',
            'Block ID': 'BLK-A01',
            'Stack ID': 'B12-R05',
            'Tier Level': 1,
            'Equipment ID': 'RTG-05',
            'Equipment Type': 'RTG',
            'Stack Height After Move': 1,
            'Operator ID': 'OP-023',
            'Job ID': 'JOB-17B6709F',
            'Planned Timestamp': '2025-01-15 06:15:00',
            'Actual Timestamp': '2025-01-15 06:15:30',
            'Delay Minutes': 0,
            'Exception Flag': 0,
            'Exception Reason': 'N/A',
            'Reason for Movement': 'Planned yard storage',
            'Container Status After Event': 'Stored',
            'Dwell Time Since Last Event (min)': 24.23,
            'Move Intent': 'Planned',
            'Optimality Tag': 'Optimal',
            'Rehandle Flag': 0,
            'Rehandle Count': 0,
            'Total Dwell Time (min)': 24.23,
            'Yard Utilization %': 62.1,
            'Block Utilization %': 25.2,
            'Congestion Level': 'Medium'
        },
        {
            'Event Sequence Number': 3,
            'Movement ID': 'MOV-116DA83700',
            'Timestamp': '2025-01-15 07:20:10',
            'Event Type': 'Gate In',
            'Container ID': 'CNT-0035',
            'Container Number': 'MSCU1234567',
            'ISO Code': '22G1',
            'Size (TEU)': 1,
            'Container Type': 'Reefer',
            'Load Status': 'Full',
            'Weight (MT)': 18.5,
            'Weight Class': 'Medium',
            'Yard Zone Type': 'Sea-Side',
            'Shipping Bill Number': 'SB268547',
            'Vessel ID': 'V008',
            'Voyage ID': 'VOY-2501-MUM-08',
            'POD': 'Mumbai',
            'POD Priority': 1,
            'Expected Voyage DateTime': '2025-01-16 14:00:00',
            'Actual Voyage DateTime': '2025-01-16 14:05:00',
            'Cutoff DateTime': '2025-01-16 18:00:00',
            'Type': 'export_container',
            'Movement Type': 'Gate In',
            'From Location Type': 'Gate',
            'From Location ID': 'GATE-1',
            'To Location Type': 'Yard',
            'To Location ID': 'Sea-Side',
            'Block ID': 'N/A',
            'Stack ID': 'N/A',
            'Tier Level': 0,
            'Equipment ID': 'TT-12',
            'Equipment Type': 'internal truck',
            'Stack Height After Move': 0,
            'Operator ID': 'OP-015',
            'Job ID': 'JOB-17B67100',
            'Planned Timestamp': '2025-01-15 07:20:00',
            'Actual Timestamp': '2025-01-15 07:20:10',
            'Delay Minutes': 0,
            'Exception Flag': 0,
            'Exception Reason': 'N/A',
            'Reason for Movement': 'Reefer container arrival',
            'Container Status After Event': 'In Transit',
            'Dwell Time Since Last Event (min)': 0,
            'Move Intent': 'Planned',
            'Optimality Tag': 'Optimal',
            'Rehandle Flag': 0,
            'Rehandle Count': 0,
            'Total Dwell Time (min)': 0,
            'Yard Utilization %': 62.5,
            'Block Utilization %': 25.5,
            'Congestion Level': 'Low'
        }
    ]

    # Create DataFrame
    df = pd.DataFrame(data)

    # Save to Excel
    output_file = 'sample_container_events.xlsx'
    df.to_excel(output_file, index=False)

    print(f"✅ Sample Excel file created: {output_file}")
    print(f"   - Total events: {len(data)}")
    print(f"   - Unique containers: {df['Container ID'].nunique()}")
    print(f"   - Event types: {df['Event Type'].unique().tolist()}")
    print("\nYou can now test the import with:")
    print(f"   python import_containers_from_excel.py {output_file}")

    return output_file


def verify_database():
    """
    Verify containers were imported correctly.
    """
    try:
        from database import SessionLocal
        from models import Container

        db = SessionLocal()
        containers = db.query(Container).all()

        print("\n" + "=" * 60)
        print("DATABASE VERIFICATION")
        print("=" * 60)
        print(f"Total containers in database: {len(containers)}")

        if containers:
            print("\nSample Container:")
            sample = containers[0]
            print(f"  Container ID: {sample.container_id}")
            print(f"  Container Number: {sample.container_number}")
            print(f"  Movement ID: {sample.movement_id}")
            print(f"  Event Type: {sample.event_type}")
            print(f"  Container Type: {sample.container_type}")
            print(f"  Stack ID: {sample.stack_id}")
            print(f"  Bay: {sample.bay}, Row: {sample.row}, Tier: {sample.tier}")
            print(f"  Rehandle Count: {sample.rehandle_count}")
            print(f"  Congestion Level: {sample.congestion_level}")

        db.close()
        print("=" * 60)
    except Exception as e:
        print(f"Error verifying database: {e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--verify':
        # Verify database contents
        verify_database()
    else:
        # Create sample Excel file
        create_sample_excel()
        print("\nNext steps:")
        print("1. Run migration: python migrate_database.py")
        print("2. Import sample data: python import_containers_from_excel.py sample_container_events.xlsx")
        print("3. Verify import: python test_import.py --verify")

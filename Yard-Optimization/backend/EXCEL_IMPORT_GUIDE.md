# Excel Data Import Guide

Complete guide for seeding container data from Excel event sheets into the database.

## 📋 Overview

This system imports container event data from Excel files into the SQLite database. All 51 Excel columns are now mapped to the container table.

---

## 🗂️ Field Mapping Summary

### ✅ **Direct Mappings (51 Fields)**

| Excel Column | Database Field |
|--------------|----------------|
| Event Sequence Number | event_sequence_number |
| Movement ID | movement_id |
| Timestamp | gate_in_time |
| Event Type | event_type |
| Container ID | container_id |
| Container Number | container_number |
| ISO Code | iso_code |
| Size (TEU) | size_teu |
| Container Type | container_type |
| Load Status | load_status |
| Weight (MT) | weight_mt |
| Weight Class | weight_class |
| Yard Zone Type | yard_zone_type |
| Shipping Bill Number | shipping_bill_number |
| Vessel ID | vessel_id |
| Voyage ID | voyage_id |
| POD | pod |
| POD Priority | pod_priority |
| Expected Voyage DateTime | expected_pickup_time |
| Actual Voyage DateTime | actual_voyage_datetime |
| Cutoff DateTime | cutoff_datetime |
| Type | type |
| Movement Type | movement_type |
| From Location Type | from_location_type |
| From Location ID | from_location_id |
| To Location Type | to_location_type |
| To Location ID | to_location_id |
| Block ID | block_id |
| Stack ID | stack_id (also parsed to bay/row) |
| Tier Level | tier |
| Equipment ID | equipment_id |
| Equipment Type | equipment_type |
| Stack Height After Move | stack_height_after_move |
| Operator ID | operator_id |
| Job ID | job_id |
| Planned Timestamp | planned_timestamp |
| Actual Timestamp | actual_timestamp |
| Delay Minutes | delay_minutes |
| Exception Flag | exception_flag |
| Exception Reason | exception_reason |
| Reason for Movement | reason_for_movement |
| Container Status After Event | container_status_after_event |
| Dwell Time Since Last Event (min) | dwell_time_since_last_event_min |
| Move Intent | move_intent |
| Optimality Tag | optimality_tag |
| Rehandle Flag | rehandle_flag |
| Rehandle Count | rehandle_count |
| Total Dwell Time (min) | total_dwell_time_min |
| Yard Utilization % | yard_utilization_percent |
| Block Utilization % | block_utilization_percent |
| Congestion Level | congestion_level |

---

## 🚀 Import Process

### **Step 1: Backup Your Database**
```bash
cd backend
copy yard_optimization.db yard_optimization.db.backup
```

### **Step 2: Run Database Migration**
This adds 31 new fields to the containers table:
```bash
python migrate_database.py
```

Expected output:
```
DATABASE MIGRATION - Adding Excel Event Fields
...
✅ Columns added: 31
Migration completed successfully!
```

### **Step 3: Prepare Your Excel File**
Ensure your Excel file has these columns (case-sensitive):
- Event Sequence Number
- Movement ID
- Timestamp
- Event Type
- Container ID
- Container Number
- ... (all 51 columns)

### **Step 4: Run Import Script**
```bash
python import_containers_from_excel.py path/to/your/excel_file.xlsx
```

Example:
```bash
python import_containers_from_excel.py "C:/Users/YourName/Documents/container_events.xlsx"
```

### **Step 5: Review Import Results**
The script will display:
```
✅ Successfully imported: 245 containers
🔄 Updated existing: 12 containers
⚠️  Skipped due to errors: 3 containers
```

If there are errors, check `import_errors.csv` for details.

---

## 🔧 How the Import Works

### **1. Deduplication**
- Sorts events by Container ID and Timestamp
- Takes the **most recent event** for each unique container
- This ensures you get the current state of each container

### **2. Data Transformation**
- **Stack ID Parsing**: Automatically extracts bay/row from formats like:
  - `B12-R03` → bay=12, row=3
  - `12-03` → bay=12, row=3
  - `123` → bay=123, row=NULL

- **Dwell Time Conversion**: Converts minutes to hours
  - `Total Dwell Time (min)` → `dwell_time_hours` (÷60)

- **Boolean Flags**: Converts 0/1 to True/False
  - `hazmat_flag`, `reefer_flag`, `exception_flag`, `rehandle_flag`

### **3. Intelligent Defaults**
- `cargo_description`: Uses Container Type or "General Cargo"
- `customs_status`: Defaults to "Cleared"
- `hazmat_flag`: Auto-set to True if Container Type = "Hazardous"
- `reefer_flag`: Auto-set to True if Container Type = "Reefer"

### **4. Error Handling**
- Skips invalid rows
- Logs all errors to `import_errors.csv`
- Updates existing containers if already in database
- Commits in batches (every 100 records)

---

## 📊 Database Schema Updates

### **New Fields Added (31 total)**

#### Event Tracking (3 fields)
- event_sequence_number (INTEGER)
- movement_id (TEXT)
- event_type (TEXT)

#### Voyage & Movement (2 fields)
- actual_voyage_datetime (TEXT)
- movement_type (TEXT)

#### Location Details (7 fields)
- yard_zone_type (TEXT)
- from_location_type (TEXT)
- from_location_id (TEXT)
- to_location_type (TEXT)
- to_location_id (TEXT)
- stack_id (TEXT)
- stack_height_after_move (INTEGER)

#### Equipment & Operations (4 fields)
- equipment_id (TEXT)
- equipment_type (TEXT)
- operator_id (TEXT)
- job_id (TEXT)

#### Timing (4 fields)
- planned_timestamp (TEXT)
- actual_timestamp (TEXT)
- delay_minutes (INTEGER)
- dwell_time_since_last_event_min (REAL)

#### Status & Exceptions (4 fields)
- exception_flag (BOOLEAN)
- exception_reason (TEXT)
- reason_for_movement (TEXT)
- container_status_after_event (TEXT)

#### Optimization Metrics (5 fields)
- move_intent (TEXT)
- optimality_tag (TEXT)
- rehandle_flag (BOOLEAN)
- rehandle_count (INTEGER)
- total_dwell_time_min (REAL)

#### Yard Metrics (3 fields)
- yard_utilization_percent (REAL)
- block_utilization_percent (REAL)
- congestion_level (TEXT)

---

## ⚠️ Important Notes

### **Before Running:**
1. ✅ Backup your database
2. ✅ Run the migration script first
3. ✅ Verify Excel column names match exactly (case-sensitive)
4. ✅ Check that your Excel file is not corrupted

### **Excel Requirements:**
- File format: `.xlsx` or `.xls`
- Column names must match exactly (case-sensitive)
- Date/time fields should be in readable format
- No empty required fields (Container ID, Container Number, etc.)

### **Stack ID Format Support:**
The import script auto-detects these formats:
- `B12-R03` → bay=12, row=3
- `B12R03` → bay=12, row=3
- `12-03` → bay=12, row=3
- `12/03` → bay=12, row=3
- `123` → bay=123, row=NULL
- `N/A` → bay=NULL, row=NULL

### **Duplicate Handling:**
- If a container with the same `container_id` exists, it will be **updated**
- No duplicates will be created
- The most recent event data will overwrite older data

---

## 🐛 Troubleshooting

### **"Column not found" Error**
- Verify Excel column names match exactly (case-sensitive)
- Check for extra spaces in column names
- Ensure all 51 columns are present

### **"Invalid data type" Error**
- Check that numeric fields contain numbers (not text)
- Verify dates are in proper format
- Look at `import_errors.csv` for specific row errors

### **"Permission denied" Error**
- Close Excel file before importing
- Ensure database is not locked by another process
- Check file permissions

### **No Containers Imported**
- Verify Excel file path is correct
- Check that Excel has data rows (not just headers)
- Review console output for transformation errors

---

## 📝 Example Usage

```bash
# Step 1: Backup
copy yard_optimization.db yard_optimization.db.backup

# Step 2: Migrate
python migrate_database.py

# Step 3: Import
python import_containers_from_excel.py "container_events.xlsx"

# Step 4: Verify
# Check import_errors.csv if any errors occurred
```

---

## ✅ Verification

After import, verify the data:

```python
from database import SessionLocal
from models import Container

db = SessionLocal()
containers = db.query(Container).all()
print(f"Total containers: {len(containers)}")

# Check a sample container
sample = containers[0]
print(f"Container ID: {sample.container_id}")
print(f"Movement ID: {sample.movement_id}")
print(f"Event Type: {sample.event_type}")
print(f"Stack ID: {sample.stack_id}")
```

---

## 🎯 Next Steps

After successful import:
1. ✅ Verify container count in database
2. ✅ Check sample records for accuracy
3. ✅ Update your frontend to display new fields
4. ✅ Create API endpoints for new event data queries
5. ✅ Build analytics dashboards using the new metrics

---

## 📞 Support

If you encounter issues:
1. Check `import_errors.csv` for detailed error messages
2. Review console output for warnings
3. Verify database migration completed successfully
4. Ensure Excel file format is correct

---

**Last Updated:** 2026-02-04
**Version:** 1.0

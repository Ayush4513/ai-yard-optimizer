"""
Seed script to populate the database with sample data for testing/demo
Run this after starting the backend for the first time
"""
from Database.database import SessionLocal, Base, engine
from Database import models
from datetime import datetime, timedelta

# Create all tables first
print("Creating database tables...")
Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("Seeding database with sample data...")

# Clear existing data (optional - comment out if you want to keep existing data)
print("Clearing existing data...")
try:
    db.query(models.Container).delete()
    db.query(models.YardLocation).delete()
    db.query(models.Block).delete()
    db.query(models.Yard).delete()
    db.commit()
except:
    db.rollback()

# ============================================================================
# CREATE YARDS
# ============================================================================
print("Creating yards...")

yards = [
    models.Yard(yard_id="Y1", yard_name="Sea-Side Yard 1", yard_type="Sea-Side"),
    models.Yard(yard_id="Y2", yard_name="Land-Side Yard 2", yard_type="Land-Side"),
    models.Yard(yard_id="Y3", yard_name="OOG Yard", yard_type="OOG"),
]

db.add_all(yards)
db.commit()

# ============================================================================
# CREATE BLOCKS
# ============================================================================
print("Creating blocks...")

blocks = [
    # Sea-Side Yard blocks
    models.Block(
        block_id="BLK-A1",
        yard_name="Sea-Side Yard 1",
        block_name="A1",
        block_type="General",
        position_x=0,
        position_y=0,
        total_slots=60,
        occupied_slots=0
    ),
    models.Block(
        block_id="BLK-A2",
        yard_name="Sea-Side Yard 1",
        block_name="A2",
        block_type="Reefer",
        position_x=100,
        position_y=0,
        total_slots=40,
        occupied_slots=0
    ),
    models.Block(
        block_id="BLK-A3",
        yard_name="Sea-Side Yard 1",
        block_name="A3",
        block_type="Hazmat",
        position_x=200,
        position_y=0,
        total_slots=30,
        occupied_slots=0
    ),
    # Land-Side Yard blocks
    models.Block(
        block_id="BLK-B1",
        yard_name="Land-Side Yard 2",
        block_name="B1",
        block_type="General",
        position_x=0,
        position_y=100,
        total_slots=80,
        occupied_slots=0
    ),
    models.Block(
        block_id="BLK-B2",
        yard_name="Land-Side Yard 2",
        block_name="B2",
        block_type="Empty",
        position_x=100,
        position_y=100,
        total_slots=50,
        occupied_slots=0
    ),
]

db.add_all(blocks)
db.commit()

# ============================================================================
# CREATE YARD LOCATIONS
# ============================================================================
print("Creating yard locations...")

locations = []
location_counter = 1

# Create locations for each block
for block in blocks:
    # Simple grid: 5 bays x 4 rows x 3 tiers = 60 locations per general block
    num_bays = 5
    num_rows = 4
    num_tiers = 3

    if block.block_type == "Reefer":
        num_bays = 4
    elif block.block_type == "Hazmat":
        num_bays = 3
    elif block.block_type == "Empty":
        num_bays = 5
        num_rows = 4

    for bay in range(1, num_bays + 1):
        for row in range(1, num_rows + 1):
            for tier in range(1, num_tiers + 1):
                location = models.YardLocation(
                    location_id=f"LOC-{location_counter:04d}",
                    yard_name=block.yard_name,
                    block_id=block.block_id,
                    bay=bay,
                    row=row,
                    tier=tier,
                    occupied=False,
                    status="actual"
                )
                locations.append(location)
                location_counter += 1

db.add_all(locations)
db.commit()

# ============================================================================
# CREATE SAMPLE CONTAINERS
# ============================================================================
print("Creating sample containers...")

containers = [
    # Export containers
    models.Container(
        container_id="CNT-001",
        container_number="MAEU1234567",
        iso_code="22G1",
        size_teu=1,
        container_type="Dry",
        load_status="Full",
        weight_mt=22.5,
        weight_class="Heavy",
        cargo_description="Electronics - Laptops",
        seal_number="SL123456",
        type="export_container",
        customs_status="Cleared",
        shipping_line="Maersk",
        consignee="ABC Electronics Ltd",
        vessel_id="VSL001",
        voyage_id="V2024-01",
        pod="Singapore",
        pod_priority=1,
        cutoff_datetime=(datetime.now() + timedelta(days=2)).isoformat(),
        hazmat_flag=False,
        reefer_flag=False,
        gate_in_time=datetime.now().isoformat(),
        expected_pickup_time=(datetime.now() + timedelta(days=3)).isoformat(),
        dwell_time_hours=12.5
    ),
    models.Container(
        container_id="CNT-002",
        container_number="MSC9876543",
        iso_code="42R1",
        size_teu=2,
        container_type="Reefer",
        load_status="Full",
        weight_mt=28.0,
        weight_class="Heavy",
        cargo_description="Frozen Seafood",
        seal_number="SL789012",
        type="export_container",
        customs_status="Cleared",
        shipping_line="MSC",
        consignee="Fresh Foods Inc",
        vessel_id="VSL002",
        voyage_id="V2024-02",
        pod="Rotterdam",
        pod_priority=2,
        cutoff_datetime=(datetime.now() + timedelta(days=1)).isoformat(),
        hazmat_flag=False,
        reefer_flag=True,
        set_temperature=-18.0,
        current_temperature=-17.5,
        ventilation_setting="Closed",
        humidity_setting=65.0,
        gate_in_time=(datetime.now() - timedelta(hours=6)).isoformat(),
        expected_pickup_time=(datetime.now() + timedelta(days=1)).isoformat(),
        dwell_time_hours=6.0
    ),
    models.Container(
        container_id="CNT-003",
        container_number="CMAU5555555",
        iso_code="22G1",
        size_teu=1,
        container_type="Hazardous",
        load_status="Full",
        weight_mt=18.0,
        weight_class="Medium",
        cargo_description="Chemicals - Class 3 Flammable Liquid",
        seal_number="SL345678",
        type="export_container",
        customs_status="Cleared",
        shipping_line="CMA CGM",
        consignee="Chemical Corp",
        vessel_id="VSL001",
        voyage_id="V2024-01",
        pod="Singapore",
        pod_priority=1,
        cutoff_datetime=(datetime.now() + timedelta(days=2)).isoformat(),
        hazmat_flag=True,
        imdg_class="3",
        un_number="UN1234",
        hazmat_segregation="SGG 1.1",
        reefer_flag=False,
        gate_in_time=(datetime.now() - timedelta(hours=3)).isoformat(),
        expected_pickup_time=(datetime.now() + timedelta(days=2)).isoformat(),
        dwell_time_hours=3.0
    ),
    # Import containers
    models.Container(
        container_id="CNT-004",
        container_number="HLCU2222222",
        iso_code="42G1",
        size_teu=2,
        container_type="Dry",
        load_status="Full",
        weight_mt=25.0,
        weight_class="Heavy",
        cargo_description="Machinery Parts",
        seal_number="SL901234",
        type="import_container",
        customs_status="Pending",
        shipping_line="Hapag Lloyd",
        consignee="Manufacturing Co",
        vessel_id="VSL003",
        voyage_id="V2024-03",
        pod="Chennai",
        pod_priority=3,
        hazmat_flag=False,
        reefer_flag=False,
        gate_in_time=(datetime.now() - timedelta(hours=24)).isoformat(),
        expected_pickup_time=(datetime.now() + timedelta(days=5)).isoformat(),
        dwell_time_hours=24.0
    ),
    models.Container(
        container_id="CNT-005",
        container_number="OOLU7777777",
        iso_code="22G1",
        size_teu=1,
        container_type="Dry",
        load_status="Full",
        weight_mt=15.0,
        weight_class="Light",
        cargo_description="Textiles and Garments",
        seal_number="SL567890",
        type="import_container",
        customs_status="Hold",
        shipping_line="OOCL",
        consignee="Fashion Imports",
        vessel_id="VSL004",
        voyage_id="V2024-04",
        pod="Mumbai",
        pod_priority=4,
        hazmat_flag=False,
        reefer_flag=False,
        gate_in_time=(datetime.now() - timedelta(hours=48)).isoformat(),
        expected_pickup_time=(datetime.now() + timedelta(days=10)).isoformat(),
        dwell_time_hours=48.0
    ),
    # Empty containers
    models.Container(
        container_id="CNT-006",
        container_number="TCLU3333333",
        iso_code="22G1",
        size_teu=1,
        container_type="Dry",
        load_status="Empty",
        weight_mt=2.3,
        weight_class="Light",
        cargo_description="Empty Container",
        type="empty",
        customs_status="Cleared",
        shipping_line="Maersk",
        hazmat_flag=False,
        reefer_flag=False,
        gate_in_time=(datetime.now() - timedelta(hours=12)).isoformat(),
        dwell_time_hours=12.0
    ),
    models.Container(
        container_id="CNT-007",
        container_number="YMLU8888888",
        iso_code="42G1",
        size_teu=2,
        container_type="Dry",
        load_status="Empty",
        weight_mt=3.8,
        weight_class="Light",
        cargo_description="Empty Container",
        type="empty",
        customs_status="Cleared",
        shipping_line="Yang Ming",
        hazmat_flag=False,
        reefer_flag=False,
        gate_in_time=(datetime.now() - timedelta(hours=8)).isoformat(),
        dwell_time_hours=8.0
    ),
]

db.add_all(containers)
db.commit()

# ============================================================================
# SUMMARY
# ============================================================================
print("\nDatabase seeded successfully!")
print(f"   - {len(yards)} yards created")
print(f"   - {len(blocks)} blocks created")
print(f"   - {len(locations)} locations created")
print(f"   - {len(containers)} containers created")
print("\nYou can now:")
print("   1. Start the backend: uvicorn main:app --reload")
print("   2. View data at: http://localhost:8000/docs")
print("   3. Test endpoints with sample data!")

db.close()

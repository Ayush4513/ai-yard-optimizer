"""
Seed Fake Containers for V2 Tables - 75% Occupancy

This script generates realistic fake container data to fill ~75% of the
yard_locations_v2 table, creating a visually meaningful demo.

V2 Configuration:
- 6 blocks: SS1-B1 (Reefer), SS3-B1 (General), SS5-B4 (Hazmat),
            LS1-B1 (Reefer), LS2-B1 (General), LS4-B1 (Hazmat)
- Each block: 5 bays x 7 rows x 4 tiers = 140 slots
- Total: 840 slots
- Target: 75% = 630 containers
"""

import random
import string
from sqlalchemy import text
from Database.database import SessionLocal

# Configuration
TARGET_OCCUPANCY = 0.75  # 75%

# Shipping lines with realistic distribution
SHIPPING_LINES = [
    ("Maersk", 0.25),
    ("MSC", 0.20),
    ("CMA CGM", 0.15),
    ("COSCO", 0.15),
    ("Hapag-Lloyd", 0.10),
    ("ONE", 0.10),
    ("Evergreen", 0.05),
]

# PODs based on block location (Sea-Side = export ports, Land-Side = import destinations)
SEA_SIDE_PODS = ["Singapore", "Dubai", "Rotterdam", "Shanghai", "Colombo"]
LAND_SIDE_PODS = ["Kochi", "JNPT", "Mundra", "Chennai", "Vizag"]

# Container types with distribution
CONTAINER_TYPES = [
    ("Dry", 0.70),
    ("Reefer", 0.15),
    ("Hazardous", 0.10),
    ("OOG", 0.05),
]

# Weight classes
WEIGHT_CLASSES = [
    ("Light", 0.30, 5, 12),      # 5-12 MT
    ("Medium", 0.45, 12, 20),    # 12-20 MT
    ("Heavy", 0.25, 20, 30),     # 20-30 MT
]

# Consignees
CONSIGNEES = [
    "ABC Corp", "XYZ Ltd", "Global Trade Inc", "Ocean Freight Co",
    "Logistics Plus", "Marine Express", "Container World", "Freight Masters",
    "Cargo Solutions", "Trade Link", "Port Services", "Shipping Global"
]


def weighted_choice(choices):
    """Select from weighted choices list [(value, weight), ...]"""
    total = sum(w for _, w in choices)
    r = random.uniform(0, total)
    cumulative = 0
    for value, weight in choices:
        cumulative += weight
        if r <= cumulative:
            return value
    return choices[-1][0]


def generate_container_number():
    """Generate realistic container number (4 letters + 7 digits)"""
    prefix = ''.join(random.choices(string.ascii_uppercase, k=4))
    numbers = ''.join(random.choices(string.digits, k=7))
    return f"{prefix}{numbers}"


def generate_iso_code(container_type, size_teu):
    """Generate ISO code based on container type and size"""
    size_code = "22" if size_teu == 1 else "42"  # 20ft or 40ft
    type_codes = {
        "Dry": "G1",
        "Reefer": "R1",
        "Hazardous": "G1",  # Same as dry but with hazmat flag
        "OOG": "U1",
    }
    return f"{size_code}{type_codes.get(container_type, 'G1')}"


def seed_fake_containers():
    """Main function to seed fake container data into v2 tables."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("SEEDING FAKE CONTAINERS FOR V2 TABLES (75% Occupancy)")
        print("=" * 60)

        # Step 1: Get all v2 locations
        locations = db.execute(text("""
            SELECT location_id, block_id, bay, row, tier
            FROM yard_locations_v2
            ORDER BY block_id, bay, row, tier
        """)).fetchall()

        total_locations = len(locations)
        target_count = int(total_locations * TARGET_OCCUPANCY)
        print(f"\nTotal locations: {total_locations}")
        print(f"Target occupancy: {TARGET_OCCUPANCY * 100}% = {target_count} containers")

        # Step 2: Get block info for type-appropriate container generation
        blocks = db.execute(text("""
            SELECT block_id, block_type, yard_id
            FROM blocks_v2
        """)).fetchall()
        block_info = {b[0]: {"type": b[1], "yard": b[2]} for b in blocks}
        print(f"\nBlocks: {list(block_info.keys())}")

        # Step 3: Clear existing v2 container data
        print("\nClearing existing v2 data...")
        db.execute(text("DELETE FROM containers_v2"))
        db.execute(text("""
            UPDATE yard_locations_v2
            SET occupied = 0, container_id = NULL, status = NULL
        """))
        db.execute(text("UPDATE blocks_v2 SET occupied_slots = 0"))
        db.commit()

        # Step 4: Group locations by block for stacking logic
        locations_by_block = {}
        for loc in locations:
            block_id = loc[1]
            if block_id not in locations_by_block:
                locations_by_block[block_id] = []
            locations_by_block[block_id].append({
                "location_id": loc[0],
                "block_id": loc[1],
                "bay": loc[2],
                "row": loc[3],
                "tier": loc[4],
            })

        # Step 5: Select locations to fill (respecting stacking rules)
        # For each block, fill from tier 1 up (no floating containers)
        selected_locations = []

        for block_id, locs in locations_by_block.items():
            # Group by bay-row stack
            stacks = {}
            for loc in locs:
                key = (loc["bay"], loc["row"])
                if key not in stacks:
                    stacks[key] = []
                stacks[key].append(loc)

            # Sort each stack by tier (1, 2, 3, 4)
            for key in stacks:
                stacks[key].sort(key=lambda x: x["tier"])

            # Randomly select stacks and fill from bottom
            stack_keys = list(stacks.keys())
            random.shuffle(stack_keys)

            # Calculate how many slots to fill in this block
            block_slots = len(locs)
            block_target = int(block_slots * TARGET_OCCUPANCY)
            block_filled = 0

            for key in stack_keys:
                if block_filled >= block_target:
                    break

                stack = stacks[key]
                # Randomly decide how high to fill this stack (1-4 tiers)
                max_fill = random.choices([1, 2, 3, 4], weights=[0.1, 0.25, 0.35, 0.3])[0]

                for i, loc in enumerate(stack):
                    if i >= max_fill:
                        break
                    if block_filled >= block_target:
                        break
                    selected_locations.append(loc)
                    block_filled += 1

        print(f"\nSelected {len(selected_locations)} locations to fill")

        # Step 6: Generate containers and place them
        print("\nGenerating containers...")
        container_idx = 0

        for loc in selected_locations:
            container_idx += 1
            block_id = loc["block_id"]
            info = block_info[block_id]
            is_sea_side = info["yard"].startswith("SS")
            block_type = info["type"]

            # Generate container attributes
            container_id = f"FAKE-{container_idx:06d}"
            container_number = generate_container_number()

            # Container type based on block type
            if block_type == "Reefer":
                container_type = "Reefer"
                reefer_flag = True
                hazmat_flag = False
            elif block_type == "Hazmat":
                container_type = "Hazardous"
                reefer_flag = False
                hazmat_flag = True
            else:
                container_type = weighted_choice([("Dry", 0.85), ("Reefer", 0.10), ("Hazardous", 0.05)])
                reefer_flag = container_type == "Reefer"
                hazmat_flag = container_type == "Hazardous"

            size_teu = random.choices([1, 2], weights=[0.4, 0.6])[0]
            iso_code = generate_iso_code(container_type, size_teu)

            # Weight (Heavy containers shouldn't be on high tiers)
            if loc["tier"] > 2:
                weight_class = weighted_choice([("Light", 0.5), ("Medium", 0.45), ("Heavy", 0.05)])
            else:
                weight_class = weighted_choice([(w[0], w[1]) for w in WEIGHT_CLASSES])

            weight_ranges = {"Light": (5, 12), "Medium": (12, 20), "Heavy": (20, 30)}
            weight_mt = round(random.uniform(*weight_ranges[weight_class]), 2)

            # Movement type based on yard side
            if is_sea_side:
                movement_type = "export_container"
                pod = random.choice(SEA_SIDE_PODS)
            else:
                movement_type = "import_container"
                pod = random.choice(LAND_SIDE_PODS)

            shipping_line = weighted_choice(SHIPPING_LINES)
            consignee = random.choice(CONSIGNEES)
            load_status = "Full" if movement_type != "empty" else "Empty"

            # Insert container
            db.execute(text("""
                INSERT INTO containers_v2 (
                    container_id, container_number, iso_code, size_teu,
                    container_type, load_status, weight_mt, weight_class,
                    type, shipping_line, pod, consignee,
                    hazmat_flag, reefer_flag, block_id, bay, row, tier,
                    current_location_id, customs_status, cargo_description
                ) VALUES (
                    :container_id, :container_number, :iso_code, :size_teu,
                    :container_type, :load_status, :weight_mt, :weight_class,
                    :type, :shipping_line, :pod, :consignee,
                    :hazmat_flag, :reefer_flag, :block_id, :bay, :row, :tier,
                    :location_id, 'Cleared', 'General Cargo'
                )
            """), {
                "container_id": container_id,
                "container_number": container_number,
                "iso_code": iso_code,
                "size_teu": size_teu,
                "container_type": container_type,
                "load_status": load_status,
                "weight_mt": weight_mt,
                "weight_class": weight_class,
                "type": movement_type,
                "shipping_line": shipping_line,
                "pod": pod,
                "consignee": consignee,
                "hazmat_flag": 1 if hazmat_flag else 0,
                "reefer_flag": 1 if reefer_flag else 0,
                "block_id": block_id,
                "bay": loc["bay"],
                "row": loc["row"],
                "tier": loc["tier"],
                "location_id": loc["location_id"],
            })

            # Update location
            db.execute(text("""
                UPDATE yard_locations_v2
                SET occupied = 1, container_id = :container_id, status = 'actual'
                WHERE location_id = :location_id
            """), {"container_id": container_id, "location_id": loc["location_id"]})

        # Step 7: Update block occupied_slots
        db.execute(text("""
            UPDATE blocks_v2
            SET occupied_slots = (
                SELECT COUNT(*) FROM yard_locations_v2
                WHERE yard_locations_v2.block_id = blocks_v2.block_id AND occupied = 1
            )
        """))

        db.commit()

        # Step 8: Summary
        print("\n" + "=" * 60)
        print("SEEDING COMPLETE")
        print("=" * 60)

        # Verify counts
        container_count = db.execute(text("SELECT COUNT(*) FROM containers_v2")).scalar()
        occupied_count = db.execute(text("SELECT COUNT(*) FROM yard_locations_v2 WHERE occupied = 1")).scalar()

        print(f"\nContainers created: {container_count}")
        print(f"Locations occupied: {occupied_count}")
        print(f"Actual occupancy: {round(occupied_count / total_locations * 100, 1)}%")

        # Block summary
        print("\nBlock occupancy:")
        blocks_summary = db.execute(text("""
            SELECT block_id, block_type, total_slots, occupied_slots
            FROM blocks_v2
            ORDER BY block_id
        """)).fetchall()

        for b in blocks_summary:
            pct = round(b[3] / b[2] * 100, 1) if b[2] > 0 else 0
            print(f"  {b[0]} ({b[1]}): {b[3]}/{b[2]} = {pct}%")

        # POD distribution
        print("\nPOD distribution:")
        pod_dist = db.execute(text("""
            SELECT pod, COUNT(*) as cnt
            FROM containers_v2
            GROUP BY pod
            ORDER BY cnt DESC
        """)).fetchall()
        for p in pod_dist:
            print(f"  {p[0]}: {p[1]}")

        # Shipping line distribution
        print("\nShipping line distribution:")
        line_dist = db.execute(text("""
            SELECT shipping_line, COUNT(*) as cnt
            FROM containers_v2
            GROUP BY shipping_line
            ORDER BY cnt DESC
        """)).fetchall()
        for l in line_dist:
            print(f"  {l[0]}: {l[1]}")

        return {
            "containers": container_count,
            "occupied": occupied_count,
            "occupancy_percent": round(occupied_count / total_locations * 100, 1)
        }

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_fake_containers()

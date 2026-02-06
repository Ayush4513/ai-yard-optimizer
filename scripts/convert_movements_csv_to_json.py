"""Convert container movements CSV to JSON format (preserving all columns)."""
import csv
import json
import sys
from pathlib import Path
from typing import List, Dict

def convert_movements_csv(csv_path: str) -> List[Dict]:
    """Convert container movements CSV to JSON format, preserving all columns."""
    movements = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Get all column names
            fieldnames = reader.fieldnames
            if not fieldnames:
                print(f"⚠️  Warning: No headers found in {csv_path}")
                return movements
            
            print(f"   Found {len(fieldnames)} columns")
            print(f"   Columns: {', '.join(fieldnames[:10])}...")
            
            for row_num, row in enumerate(reader, start=2):
                # Preserve all columns - create a clean dict with all values
                movement = {}
                for key, value in row.items():
                    # Clean up the key name (remove extra spaces)
                    clean_key = key.strip() if key else ""
                    # Preserve the value as-is (or empty string if None)
                    movement[clean_key] = value.strip() if value else ""
                
                movements.append(movement)
                
                if row_num % 100 == 0:
                    print(f"   Processed {row_num - 1} rows...")
                    
    except Exception as e:
        print(f"❌ Error reading {csv_path}: {e}")
        import traceback
        traceback.print_exc()
    
    return movements


def main():
    """Convert container movements CSV to JSON."""
    # Check multiple possible locations for CSV files
    possible_roots = [
        Path("/app/root"),  # Mounted project root
        Path(__file__).parent.parent,  # Relative to script location
        Path("/app")  # Fallback
    ]
    
    project_root = None
    for root in possible_roots:
        test_file = root / "container_movement_dataset_v3 (3)(Container Movements).csv"
        if test_file.exists():
            project_root = root
            break
    
    if not project_root:
        print("❌ Could not find project root with CSV files!")
        print(f"   Checked: {[str(r) for r in possible_roots]}")
        sys.exit(1)
    
    data_dir = Path("/app/data")  # Always use /app/data for output
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert container movements
    movements_csv = project_root / "container_movement_dataset_v3 (3)(Container Movements).csv"
    if movements_csv.exists():
        print(f"Converting {movements_csv.name}...")
        movements = convert_movements_csv(str(movements_csv))
        movements_json = data_dir / "container_movements.json"
        with open(movements_json, 'w', encoding='utf-8') as f:
            json.dump(movements, f, indent=2, ensure_ascii=False)
        print(f"✅ Converted {len(movements)} movements to {movements_json}")
        print(f"   Total columns preserved: {len(movements[0].keys()) if movements else 0}")
    else:
        print(f"❌ {movements_csv.name} not found!")
        sys.exit(1)


if __name__ == "__main__":
    main()


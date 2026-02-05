"""Convert CSV stacking rules to JSON format for ChromaDB ingestion."""
import csv
import json
import sys
from pathlib import Path
from typing import List, Dict

def convert_hazmat_rules(csv_path: str) -> List[Dict]:
    """Convert hazmat handling CSV to JSON format."""
    rules = []
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            # Try to detect delimiter
            first_line = f.readline()
            f.seek(0)
            
            # Check if it's a valid CSV
            if not first_line.strip():
                print(f"⚠️  Warning: {csv_path} appears to be empty")
                return rules
            
            reader = csv.DictReader(f)
            
            # Get all column names (case-insensitive matching)
            fieldnames = reader.fieldnames
            if not fieldnames:
                print(f"⚠️  Warning: No headers found in {csv_path}")
                return rules
            
            print(f"   Found columns: {', '.join(fieldnames[:5])}...")
            
            for row_num, row in enumerate(reader, start=2):
                # Try multiple possible column name variations (case-insensitive)
                rule_id = (row.get("rule_id") or row.get("Rule ID") or 
                          row.get("Rule_ID") or row.get("RULE_ID") or "").strip()
                rule_name = (row.get("rule_name") or row.get("Rule Name") or 
                            row.get("Rule_Name") or row.get("RULE_NAME") or "").strip()
                
                # Skip if no rule_id or rule_name
                if not rule_id and not rule_name:
                    continue
                
                # Use row number as rule_id if missing
                if not rule_id:
                    rule_id = f"HAZ-{row_num}"
                
                # Map CSV columns to JSON format (try multiple variations)
                rule = {
                    "ruleId": rule_id,
                    "ruleName": rule_name or f"Hazmat Rule {row_num}",
                    "ruleCategory": "safety_constraint",
                    "ruleType": "hazmat",
                    "priority": (row.get("priority") or row.get("Priority") or "MEDIUM").strip(),
                    "applicableZones": ["Hazmat"],
                    "constraint": {
                        "condition": (row.get("conditions") or row.get("Conditions") or "").strip(),
                        "action": (row.get("constraint") or row.get("Constraint") or "FORBID").strip(),
                        "errorMessage": (row.get("violation_message") or row.get("Violation Message") or 
                                        row.get("violation") or "").strip()
                    },
                    "metadata": {
                        "appliesLevel": (row.get("applies_level") or row.get("Applies Level") or "").strip(),
                        "constraintParams": (row.get("constraint_params") or row.get("Constraint Params") or "").strip(),
                        "category": (row.get("category") or row.get("Category") or "Hazmat").strip()
                    }
                }
                
                # Build detailed description for better embedding
                rule["ruleDescription"] = f"""
                Rule: {rule['ruleName']}
                Category: {rule['metadata']['category']}
                Priority: {rule['priority']}
                Applies at: {rule['metadata']['appliesLevel']} level
                Conditions: {rule['constraint']['condition']}
                Constraint: {rule['constraint']['action']}
                Violation: {rule['constraint']['errorMessage']}
                """.strip()
                
                rules.append(rule)
    except Exception as e:
        print(f"❌ Error reading {csv_path}: {e}")
        import traceback
        traceback.print_exc()
    
    return rules


def convert_master_rules(csv_path: str) -> List[Dict]:
    """Convert master stacking rules CSV to JSON format."""
    rules = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Map CSV columns to JSON format
            rule_id = row.get("Rule ID", "").strip()
            if not rule_id:
                continue
            
            # Determine category (try multiple variations)
            category = (row.get("Category") or row.get("category") or 
                       row.get("CATEGORY") or "").strip()
            category_mapping = {
                "Commercial Grouping": "operational_rule",
                "Operational Grouping": "operational_rule",
                "Delivery Model": "operational_rule",
                "Flow Segregation": "operational_rule",
                "Port of Delivery": "operational_rule",
                "Size Compatibility": "physical_constraint",
                "Weight": "physical_constraint",
                "Height": "physical_constraint",
                "Safety": "safety_constraint",
                "Engineering": "safety_constraint",
                "Hazmat": "safety_constraint",
                "Special Cargo": "safety_constraint",
                "Planning": "operational_rule"
            }
            rule_category = category_mapping.get(category, "operational_rule")
            
            # Determine rule type
            rule_type_mapping = {
                "Commercial Grouping": "grouping",
                "Operational Grouping": "grouping",
                "Delivery Model": "segregation",
                "Flow Segregation": "segregation",
                "Port of Delivery": "grouping",
                "Size Compatibility": "stacking",
                "Weight": "stacking",
                "Height": "stacking",
                "Safety": "stacking",
                "Engineering": "stacking",
                "Hazmat": "hazmat",
                "Special Cargo": "special_cargo",
                "Planning": "planning"
            }
            rule_type = rule_type_mapping.get(category, "stacking")
            
            # Map priority (try multiple variations)
            priority_str = (row.get("Priority") or row.get("priority") or 
                           row.get("PRIORITY") or "P2 Productivity").strip()
            priority_mapping = {
                "P0 Safety": "CRITICAL",
                "P1 Regulatory": "HIGH",
                "P2 Productivity": "MEDIUM",
                "P3 Efficiency": "LOW"
            }
            priority = priority_mapping.get(priority_str, "MEDIUM")
            
            # Determine applicable zones (try multiple variations)
            applies_level = (row.get("Applies Level") or row.get("applies_level") or 
                           row.get("Applies_Level") or "").strip()
            applicable_zones = []
            description = (row.get("Description") or row.get("description") or "").strip()
            if "Export" in description or "export" in description.lower():
                applicable_zones.append("Export")
            if "Import" in description or "import" in description.lower():
                applicable_zones.append("Import")
            if not applicable_zones:
                applicable_zones = ["Export", "Import"]  # Default
            
            # Build rule description (try multiple variations)
            conditions = (row.get("Conditions") or row.get("conditions") or "").strip()
            violation_msg = (row.get("Violation Message") or row.get("violation_message") or 
                           row.get("Violation_Message") or row.get("violation") or "").strip()
            
            rule_name = (row.get("Rule Name") or row.get("rule_name") or 
                        row.get("Rule_Name") or f"Master Rule {row_num}").strip()
            constraint = (row.get("Constraint") or row.get("constraint") or "FORBID").strip()
            
            rule_description = f"""
            Rule: {rule_name}
            Category: {category}
            Priority: {priority_str}
            Description: {description}
            Applies at: {applies_level} level
            Conditions: {conditions}
            Constraint: {constraint}
            Violation: {violation_msg}
            Rule Strength: {row.get('Rule Strength') or row.get('rule_strength') or ''}
            """.strip()
            
            rule = {
                "ruleId": rule_id,
                "ruleName": rule_name,
                "ruleDescription": rule_description,
                "ruleCategory": rule_category,
                "ruleType": rule_type,
                "priority": priority,
                "applicableZones": applicable_zones,
                "constraint": {
                    "condition": conditions,
                    "action": constraint,
                    "errorMessage": violation_msg
                },
                "metadata": {
                    "appliesLevel": applies_level,
                    "ruleStrength": (row.get("Rule Strength") or row.get("rule_strength") or "").strip(),
                    "constraintParams": (row.get("Constraint Params") or row.get("constraint_params") or "").strip(),
                    "exceptions": (row.get("Exceptions") or row.get("exceptions") or "").strip(),
                    "configVariables": (row.get("Config Variables") or row.get("config_variables") or "").strip(),
                    "conflictResolution": (row.get("Conflict Resolution") or row.get("conflict_resolution") or "").strip(),
                    "testCases": (row.get("Test Cases") or row.get("test_cases") or "").strip()
                }
            }
            
            rules.append(rule)
    except Exception as e:
        print(f"❌ Error reading {csv_path}: {e}")
        import traceback
        traceback.print_exc()
    
    return rules


def main():
    """Convert both CSV files to JSON."""
    project_root = Path(__file__).parent.parent
    data_dir = project_root / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Convert hazmat rules
    hazmat_csv = project_root / "stacking_rules(HAZ Handling).csv"
    if hazmat_csv.exists():
        print(f"Converting {hazmat_csv.name}...")
        hazmat_rules = convert_hazmat_rules(str(hazmat_csv))
        hazmat_json = data_dir / "hazmat_rules.json"
        with open(hazmat_json, 'w', encoding='utf-8') as f:
            json.dump(hazmat_rules, f, indent=2, ensure_ascii=False)
        print(f"✅ Converted {len(hazmat_rules)} hazmat rules to {hazmat_json}")
    else:
        print(f"⚠️  {hazmat_csv.name} not found. Skipping...")
        hazmat_rules = []
    
    # Convert master rules
    master_csv = project_root / "stacking_rules(Stacking Rules Master).csv"
    if master_csv.exists():
        print(f"Converting {master_csv.name}...")
        master_rules = convert_master_rules(str(master_csv))
        master_json = data_dir / "master_rules.json"
        with open(master_json, 'w', encoding='utf-8') as f:
            json.dump(master_rules, f, indent=2, ensure_ascii=False)
        print(f"✅ Converted {len(master_rules)} master rules to {master_json}")
    else:
        print(f"⚠️  {master_csv.name} not found. Skipping...")
        master_rules = []
    
    # Combine all rules
    all_rules = hazmat_rules + master_rules
    combined_json = data_dir / "all_rules.json"
    with open(combined_json, 'w', encoding='utf-8') as f:
        json.dump(all_rules, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Total: {len(all_rules)} rules converted")
    print(f"✅ Combined rules saved to {combined_json}")
    print(f"\n📊 Breakdown:")
    print(f"   - Hazmat rules: {len(hazmat_rules)}")
    print(f"   - Master rules: {len(master_rules)}")
    print(f"   - Total: {len(all_rules)}")


if __name__ == "__main__":
    main()


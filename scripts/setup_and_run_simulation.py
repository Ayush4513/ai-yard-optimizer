"""Master script: Setup and run complete simulation test."""
import subprocess
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def run_script(script_name: str, description: str):
    """Run a Python script and handle errors."""
    logger.info(f"\n{'='*60}")
    logger.info(f"{description}")
    logger.info(f"{'='*60}")
    
    # Use absolute path to avoid Git Bash path issues
    script_path = Path("/app/scripts") / script_name
    if not script_path.exists():
        logger.error(f"❌ Script not found: {script_path}")
        return False
    
    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd="/app",  # Use absolute path for cwd too
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(result.stdout)
        if result.stderr:
            logger.warning(result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Error running {script_name}:")
        logger.error(e.stdout)
        logger.error(e.stderr)
        return False


def main():
    """Run the complete simulation setup and test."""
    logger.info("="*60)
    logger.info("CONTAINER YARD SIMULATION - COMPLETE SETUP")
    logger.info("="*60)
    
    # Step 1: Convert CSVs to JSON
    steps = [
        ("convert_movements_csv_to_json.py", "Step 1: Convert container movements CSV to JSON"),
        ("convert_rules_csv_to_json.py", "Step 2: Convert stacking rules CSVs to JSON"),
        ("ingest_rules.py", "Step 3: Load rules to ChromaDB"),
        ("run_simulation_test.py", "Step 4: Run simulation test (20 containers in 4 batches)")
    ]
    
    for script, description in steps:
        success = run_script(script, description)
        if not success:
            logger.error(f"\n❌ Failed at: {description}")
            logger.error("Please fix the error and try again.")
            sys.exit(1)
    
    logger.info("\n" + "="*60)
    logger.info("✅ SIMULATION SETUP AND TEST COMPLETE!")
    logger.info("="*60)
    logger.info("\nNext steps:")
    logger.info("1. Check simulation_results.json for detailed results")
    logger.info("2. Verify Neo4j has new container nodes and relationships")
    logger.info("3. Verify ChromaDB has new placement patterns")
    logger.info("4. Check frontend yard map for visual updates")


if __name__ == "__main__":
    main()


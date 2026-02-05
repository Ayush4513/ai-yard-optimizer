# Scripts Documentation

## Database Initialization

### init_databases.py
Initialize both Neo4j schema and ChromaDB collections.

```bash
python scripts/init_databases.py
```

## Data Ingestion

### convert_rules_csv_to_json.py
Convert stacking rules CSV files to JSON format.

**Input**: 
- `stacking_rules(HAZ Handling).csv`
- `stacking_rules(Stacking Rules Master).csv`

**Output**: 
- `data/hazmat_rules.json`
- `data/master_rules.json`
- `data/all_rules.json` (combined)

```bash
python scripts/convert_rules_csv_to_json.py
```

### ingest_rules.py
Ingest converted rules JSON into ChromaDB.

**Input**: `data/all_rules.json`

**Output**: ChromaDB collection `yard_rules`

```bash
python scripts/ingest_rules.py
```

### ingest_historical_data.py
Ingest historical container movement data into ChromaDB.

**Input**: `container_movement_dataset_v3 (3)(Container Movements).csv`

**Output**: ChromaDB collection `historical_patterns`

**Features**:
- Extracts patterns from each movement event
- Creates embeddings for semantic search
- Stores metadata for filtering
- Processes all events (may take a few minutes for large datasets)

```bash
python scripts/ingest_historical_data.py
```

## Testing

### test_connections.py
Test all database connections and retrieval chain.

```bash
python scripts/test_connections.py
```

## Security Scripts

### clear_env_keys.bat / clear_env_keys.sh
Clear API keys from .env file, keeping only placeholders.

**Windows:**
```cmd
scripts\clear_env_keys.bat
```

**Linux/Mac:**
```bash
bash scripts/clear_env_keys.sh
```

> 💡 **Note**: All API keys should be stored in `.env` file only. See `SECURITY.md` for details.

## Usage Examples

### Full Data Ingestion Pipeline

```bash
# 1. Convert rules
python scripts/convert_rules_csv_to_json.py

# 2. Ingest rules
python scripts/ingest_rules.py

# 3. Ingest historical data
python scripts/ingest_historical_data.py

# 4. Test everything
python scripts/test_connections.py
```

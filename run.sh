#!/bin/bash
# Run script for Container Yard Optimization API

echo "🚀 Starting Container Yard Optimization API..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "💡 Run 'bash setup.sh' first to set up the project"
    exit 1
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Check if Neo4j is running
echo "🔍 Checking Neo4j connection..."
if ! docker ps | grep -q "container_yard_neo4j"; then
    echo "⚠️  Neo4j container not running. Starting it..."
    docker-compose up -d
    echo "⏳ Waiting for Neo4j to be ready..."
    sleep 10
fi

# Check if rules are ingested
if [ ! -f "data/all_rules.json" ]; then
    echo "⚠️  Rules not converted yet. Converting CSV to JSON..."
    venv/bin/python scripts/convert_rules_csv_to_json.py
    
    if [ -f "data/all_rules.json" ]; then
        echo "📥 Ingesting rules into ChromaDB..."
        venv/bin/python scripts/ingest_rules.py
    fi
fi

# Check if historical data is ingested
if [ -f "container_movement_dataset_v3 (3)(Container Movements).csv" ]; then
    echo "🔍 Checking historical data ingestion..."
    venv/bin/python -c "
import sys; sys.path.insert(0, 'Yard-Optimization/backend'); from Modules.database.chroma_client import chroma_client
collections = chroma_client.initialize_collections()
count = collections['historical_patterns'].count()
if count == 0:
    print('⚠️  No historical patterns in ChromaDB. Ingesting...')
    import subprocess
    subprocess.run(['venv/bin/python', 'scripts/ingest_historical_data.py'])
else:
    print(f'✅ ChromaDB has {count} historical patterns')
" 2>/dev/null || {
    echo "📊 Ingesting historical data..."
    venv/bin/python scripts/ingest_historical_data.py
}
fi

# Check if ChromaDB has rules
venv/bin/python -c "
import sys; sys.path.insert(0, 'Yard-Optimization/backend'); from Modules.database.chroma_client import chroma_client
collections = chroma_client.initialize_collections()
count = collections['yard_rules'].count()
if count == 0:
    print('⚠️  No rules in ChromaDB. Ingesting...')
    import subprocess
    subprocess.run(['venv/bin/python', 'scripts/ingest_rules.py'])
else:
    print(f'✅ ChromaDB has {count} rules')
" 2>/dev/null || {
    echo "📥 Ingesting rules into ChromaDB..."
    venv/bin/python scripts/ingest_rules.py
}

# Start the API
echo ""
echo "🌐 Starting FastAPI server..."
echo "   API Docs: http://localhost:8000/docs"
echo "   Health: http://localhost:8000/health"
echo "   Neo4j Browser: http://localhost:7474"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd Yard-Optimization/backend && ../../venv/bin/python -m Modules.main


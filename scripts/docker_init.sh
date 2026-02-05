#!/bin/bash
# Initialize databases when running in Docker

echo "🗄️  Initializing databases in Docker..."

# Wait for Neo4j to be ready
echo "⏳ Waiting for Neo4j..."
until docker-compose exec -T neo4j cypher-shell -u neo4j -p container_yard_password "RETURN 1" > /dev/null 2>&1; do
    echo "   Neo4j not ready yet, waiting..."
    sleep 2
done
echo "✅ Neo4j is ready"

# Wait for ChromaDB to be ready
echo "⏳ Waiting for ChromaDB..."
until curl -f http://localhost:8001/api/v1/heartbeat > /dev/null 2>&1; do
    echo "   ChromaDB not ready yet, waiting..."
    sleep 2
done
echo "✅ ChromaDB is ready"

# Initialize Neo4j schema
echo "📊 Initializing Neo4j schema..."
docker-compose exec -T api python scripts/init_databases.py

# Convert and ingest rules if CSV files exist
if [ -f "stacking_rules(HAZ Handling).csv" ] || [ -f "stacking_rules(Stacking Rules Master).csv" ]; then
    echo "📋 Converting stacking rules CSV to JSON..."
    docker-compose exec -T api python scripts/convert_rules_csv_to_json.py
    
    if [ -f "data/all_rules.json" ]; then
        echo "📥 Ingesting rules into ChromaDB..."
        docker-compose exec -T api python scripts/ingest_rules.py
    fi
fi

# Ingest historical movement data if CSV exists
if [ -f "container_movement_dataset_v3 (3)(Container Movements).csv" ]; then
    echo "📊 Ingesting historical movement data (3 months)..."
    echo "   (This may take a few minutes for large datasets)"
    docker-compose exec -T api python scripts/ingest_historical_data.py
fi

echo ""
echo "✅ Database initialization complete!"


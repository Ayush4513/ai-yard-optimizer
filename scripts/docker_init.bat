@echo off
REM Initialize databases when running in Docker

echo 🗄️  Initializing databases in Docker...

REM Wait for Neo4j to be ready
echo ⏳ Waiting for Neo4j...
:wait_neo4j
docker-compose exec -T neo4j cypher-shell -u neo4j -p container_yard_password "RETURN 1" >nul 2>&1
if errorlevel 1 (
    echo    Neo4j not ready yet, waiting...
    timeout /t 2 /nobreak >nul
    goto wait_neo4j
)
echo ✅ Neo4j is ready

REM Wait for ChromaDB to be ready
echo ⏳ Waiting for ChromaDB...
:wait_chromadb
curl -f http://localhost:8001/api/v1/heartbeat >nul 2>&1
if errorlevel 1 (
    echo    ChromaDB not ready yet, waiting...
    timeout /t 2 /nobreak >nul
    goto wait_chromadb
)
echo ✅ ChromaDB is ready

REM Initialize Neo4j schema
echo 📊 Initializing Neo4j schema...
docker-compose exec -T api python scripts/init_databases.py

REM Convert and ingest rules if CSV files exist
if exist "stacking_rules(HAZ Handling).csv" (
    echo 📋 Converting stacking rules CSV to JSON...
    docker-compose exec -T api python scripts\convert_rules_csv_to_json.py
    
    if exist "data\all_rules.json" (
        echo 📥 Ingesting rules into ChromaDB...
        docker-compose exec -T api python scripts\ingest_rules.py
    )
) else if exist "stacking_rules(Stacking Rules Master).csv" (
    echo 📋 Converting stacking rules CSV to JSON...
    docker-compose exec -T api python scripts\convert_rules_csv_to_json.py
    
    if exist "data\all_rules.json" (
        echo 📥 Ingesting rules into ChromaDB...
        docker-compose exec -T api python scripts\ingest_rules.py
    )
)

REM Ingest historical movement data if CSV exists
if exist "container_movement_dataset_v3 (3)(Container Movements).csv" (
    echo 📊 Ingesting historical movement data (3 months)...
    echo    (This may take a few minutes for large datasets)
    docker-compose exec -T api python scripts\ingest_historical_data.py
)

echo.
echo ✅ Database initialization complete!
echo.


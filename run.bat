@echo off
REM Run script for Container Yard Optimization API

echo 🚀 Starting Container Yard Optimization API...

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found!
    echo 💡 Run 'setup.bat' first to set up the project
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if Neo4j is running
echo 🔍 Checking Neo4j connection...
docker ps | findstr "container_yard_neo4j" >nul
if errorlevel 1 (
    echo ⚠️  Neo4j container not running. Starting it...
    docker-compose up -d
    echo ⏳ Waiting for Neo4j to be ready...
    timeout /t 10 /nobreak
)

REM Check if rules are converted
if not exist "data\all_rules.json" (
    echo ⚠️  Rules not converted yet. Converting CSV to JSON...
    venv\Scripts\python.exe scripts\convert_rules_csv_to_json.py
    
    if exist "data\all_rules.json" (
        echo 📥 Ingesting rules into ChromaDB...
        venv\Scripts\python.exe scripts\ingest_rules.py
    )
)

REM Check if ChromaDB has rules and ingest if needed
venv\Scripts\python.exe -c "import sys, os; sys.path.insert(0, os.path.join('Yard-Optimization', 'backend')); from Modules.database.chroma_client import chroma_client; collections = chroma_client.initialize_collections(); count = collections['yard_rules'].count(); print(f'ChromaDB has {count} rules') if count > 0 else (print('No rules found. Ingesting...'), __import__('subprocess').run(['venv\\Scripts\\python.exe', 'scripts\\ingest_rules.py']))" 2>nul || (
    echo 📥 Ingesting rules into ChromaDB...
    venv\Scripts\python.exe scripts\ingest_rules.py
)

REM Check if historical data is ingested
if exist "container_movement_dataset_v3 (3)(Container Movements).csv" (
    echo 🔍 Checking historical data ingestion...
    venv\Scripts\python.exe -c "import sys, os; sys.path.insert(0, os.path.join('Yard-Optimization', 'backend')); from Modules.database.chroma_client import chroma_client; collections = chroma_client.initialize_collections(); count = collections['historical_patterns'].count(); print(f'ChromaDB has {count} historical patterns') if count > 0 else (print('No patterns found. Ingesting...'), __import__('subprocess').run(['venv\\Scripts\\python.exe', 'scripts\\ingest_historical_data.py']))" 2>nul || (
        echo 📊 Ingesting historical data...
        venv\Scripts\python.exe scripts\ingest_historical_data.py
    )
)

REM Start the API
echo.
echo 🌐 Starting FastAPI server...
echo    API Docs: http://localhost:8000/docs
echo    Health: http://localhost:8000/health
echo    Neo4j Browser: http://localhost:7474
echo.
echo Press Ctrl+C to stop
echo.

cd Yard-Optimization\backend && ..\..\venv\Scripts\python.exe -m Modules.main


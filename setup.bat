@echo off
REM Setup script for Windows

echo 🚀 Setting up Container Yard Optimization Project...

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found!
    echo.
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo 📋 Python found:
python --version

REM Create virtual environment
echo 📦 Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ❌ Failed to create virtual environment
    pause
    exit /b 1
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📥 Installing dependencies...
python -m pip install --upgrade pip

REM Install core dependencies first (without ChromaDB to avoid onnxruntime issue)
echo 📦 Installing core dependencies...
python -m pip install fastapi uvicorn pydantic python-dotenv neo4j sentence-transformers langchain langchain-community langchain-anthropic langchain-core anthropic python-multipart httpx

REM Try to install pydantic with pre-built wheels first (avoids Rust requirement)
echo 🔧 Installing pydantic (pre-built wheel to avoid Rust requirement)...
python -m pip install --only-binary :all: pydantic 2>nul || echo ⚠️  Pre-built wheel not available, will compile (requires Rust)

REM Install ChromaDB client (lightweight, connects to Docker instance)
echo 📦 Installing ChromaDB client (connects to Docker instance)...
python -m pip install chromadb 2>nul || (
    echo ⚠️  ChromaDB client installation failed
    echo 💡 This is just the client library - ChromaDB runs in Docker
    echo    Retrying installation...
    python -m pip install chromadb --no-deps 2>nul
    python -m pip install httpx uvicorn 2>nul
)

REM Verify critical packages
echo.
echo 🔍 Verifying installations...
python -c "import pydantic; print('✅ Pydantic OK')" 2>nul || echo ⚠️  Pydantic not installed
python -c "import neo4j; print('✅ Neo4j client OK')" 2>nul || echo ⚠️  Neo4j client not installed
python -c "import chromadb; print('✅ ChromaDB client OK')" 2>nul || echo ⚠️  ChromaDB client not installed
echo    (ChromaDB server runs in Docker - will be verified after containers start)

REM If pydantic installation failed, provide helpful message
python -c "import pydantic" 2>nul || (
    echo.
    echo ⚠️  Pydantic installation may have failed due to missing Rust.
    echo.
    echo 💡 Solutions:
    echo    1. Install Rust from https://rustup.rs/ (recommended)
    echo    2. Or see INSTALL_RUST.md for detailed instructions
    echo    3. Or try: pip install --only-binary :all: pydantic
    echo.
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    if exist .env.example (
        copy .env.example .env
        echo ✅ .env file created from .env.example
    ) else (
        REM Create .env file with default values
        (
            echo # Neo4j Configuration
            echo NEO4J_URI=bolt://localhost:7687
            echo NEO4J_USER=neo4j
            echo NEO4J_PASSWORD=container_yard_password
            echo.
            echo # ChromaDB Configuration
            echo CHROMA_DB_PATH=./chroma_db
            echo.
            echo # Anthropic Configuration (Required for LLM/RAG features)
            echo ANTHROPIC_API_KEY=
            echo ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
            echo.
            echo # ChromaDB Configuration (Docker)
            echo CHROMA_USE_DOCKER=true
            echo CHROMA_HOST=localhost
            echo CHROMA_PORT=8001
            echo.
            echo # LangChain Configuration (Optional)
            echo LANGCHAIN_TRACING_V2=false
            echo LANGCHAIN_API_KEY=
        ) > .env
        echo ✅ .env file created with default values
    )
    echo    You can edit .env to customize configuration.
)

REM Start Docker containers (Neo4j and ChromaDB)
echo 🐳 Starting Docker containers (Neo4j and ChromaDB)...
docker-compose up -d

REM Wait for Docker containers to be ready
echo ⏳ Waiting for Docker containers to be ready...
echo    (Neo4j and ChromaDB starting...)
ping 127.0.0.1 -n 11 >nul

REM Initialize databases
echo 🗄️  Initializing databases...
python scripts\init_databases.py

REM Convert and ingest rules if CSV files exist
if exist "stacking_rules(HAZ Handling).csv" (
    echo 📋 Converting stacking rules CSV to JSON...
    python scripts\convert_rules_csv_to_json.py
    
    if exist "data\all_rules.json" (
        echo 📥 Ingesting rules into ChromaDB...
        python scripts\ingest_rules.py
    )
) else if exist "stacking_rules(Stacking Rules Master).csv" (
    echo 📋 Converting stacking rules CSV to JSON...
    python scripts\convert_rules_csv_to_json.py
    
    if exist "data\all_rules.json" (
        echo 📥 Ingesting rules into ChromaDB...
        python scripts\ingest_rules.py
    )
) else (
    echo ⚠️  Stacking rules CSV files not found. Skipping rules ingestion.
    echo    Place CSV files in project root to auto-convert and ingest.
)

REM Ingest historical movement data if CSV exists
if exist "container_movement_dataset_v3 (3)(Container Movements).csv" (
    echo 📊 Ingesting historical movement data (3 months)...
    echo    (This may take a few minutes for large datasets)
    python scripts\ingest_historical_data.py
) else (
    echo ℹ️  Historical movement CSV not found. Skipping historical data ingestion.
    echo    Place 'container_movement_dataset_v3 (3)(Container Movements).csv' in project root to ingest.
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Run the application: run.bat
echo 2. Or manually: cd Yard-Optimization\backend ^&^& python -m Modules.main
echo 3. Test connections: python scripts\test_connections.py
echo 4. Access Neo4j Browser: http://localhost:7474
echo 5. Access API docs: http://localhost:8000/docs

pause


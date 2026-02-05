#!/bin/bash
# Setup script for Container Yard Optimization Project

echo "🚀 Setting up Container Yard Optimization Project..."

# Detect Python command (check python first, then python3)
if command -v python &> /dev/null; then
    PYTHON_CMD="python"
elif command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    echo "❌ Python not found. Please install Python 3.11+"
    echo "   On Windows, use setup.bat instead"
    exit 1
fi

echo "📋 Using Python: $PYTHON_CMD"
if ! $PYTHON_CMD --version 2>/dev/null; then
    echo "❌ Python command failed. On Windows, please use setup.bat instead"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
if $PYTHON_CMD -m venv venv; then
    echo "✅ Virtual environment created"
else
    echo "❌ Failed to create virtual environment"
    exit 1
fi

# Check if venv was created
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment directory not found"
    exit 1
fi

# Use venv's python directly (more reliable in scripts)
VENV_PYTHON="venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    echo "❌ Virtual environment Python not found"
    exit 1
fi

# Install dependencies
echo "📥 Installing dependencies..."
$VENV_PYTHON -m pip install --upgrade pip

# Try to install pydantic with pre-built wheels first (avoids Rust requirement)
echo "🔧 Installing pydantic (pre-built wheel to avoid Rust requirement)..."
$VENV_PYTHON -m pip install --only-binary :all: pydantic 2>/dev/null || echo "⚠️  Pre-built wheel not available, will compile (requires Rust)"

# Install all dependencies
echo "📦 Installing all dependencies..."
$VENV_PYTHON -m pip install -r requirements.txt

# Check if pydantic installation succeeded
if ! $VENV_PYTHON -c "import pydantic" 2>/dev/null; then
    echo ""
    echo "⚠️  Pydantic installation may have failed due to missing Rust."
    echo ""
    echo "💡 Solutions:"
    echo "   1. Install Rust from https://rustup.rs/ (recommended)"
    echo "   2. Or see INSTALL_RUST.md for detailed instructions"
    echo "   3. Or try: pip install --only-binary :all: pydantic"
    echo ""
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
    else
        # Create minimal .env file
        cat > .env << EOF
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=container_yard_password

# ChromaDB Configuration
CHROMA_DB_PATH=./chroma_db

# Anthropic Configuration (Required for LLM/RAG features)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# ChromaDB Configuration (Docker)
CHROMA_USE_DOCKER=true
CHROMA_HOST=localhost
CHROMA_PORT=8001

# LangChain Configuration (Optional)
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=
EOF
        echo "✅ .env file created with default values"
    fi
    echo "   You can edit .env to customize configuration."
fi

# Start Docker containers (Neo4j and ChromaDB)
echo "🐳 Starting Docker containers (Neo4j and ChromaDB)..."
docker-compose up -d

# Wait for Docker containers to be ready
echo "⏳ Waiting for Docker containers to be ready..."
echo "   (Neo4j and ChromaDB starting...)"
sleep 10

# Initialize databases
echo "🗄️  Initializing databases..."
$VENV_PYTHON scripts/init_databases.py

# Convert and ingest rules if CSV files exist
if [ -f "stacking_rules(HAZ Handling).csv" ] || [ -f "stacking_rules(Stacking Rules Master).csv" ]; then
    echo "📋 Converting stacking rules CSV to JSON..."
    $VENV_PYTHON scripts/convert_rules_csv_to_json.py
    
    if [ -f "data/all_rules.json" ]; then
        echo "📥 Ingesting rules into ChromaDB..."
        $VENV_PYTHON scripts/ingest_rules.py
    fi
else
    echo "⚠️  Stacking rules CSV files not found. Skipping rules ingestion."
    echo "   Place CSV files in project root to auto-convert and ingest."
fi

# Ingest historical movement data if CSV exists
if [ -f "container_movement_dataset_v3 (3)(Container Movements).csv" ]; then
    echo "📊 Ingesting historical movement data (3 months)..."
    echo "   (This may take a few minutes for large datasets)"
    $VENV_PYTHON scripts/ingest_historical_data.py
else
    echo "ℹ️  Historical movement CSV not found. Skipping historical data ingestion."
    echo "   Place 'container_movement_dataset_v3 (3)(Container Movements).csv' in project root to ingest."
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Run the application: bash run.sh"
echo "2. Or manually: cd Yard-Optimization/backend && $VENV_PYTHON -m Modules.main"
echo "3. Test connections: $VENV_PYTHON scripts/test_connections.py"
echo "4. Access Neo4j Browser: http://localhost:7474"
echo "5. Access API docs: http://localhost:8000/docs"


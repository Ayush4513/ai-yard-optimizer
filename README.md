# Container Yard Optimization - AI Hackathon 2026

AI-powered container yard optimization system with RAG (Retrieval Augmented Generation) using ChromaDB and Neo4j.

## 🏗️ Architecture

- **ChromaDB**: Vector database for semantic search (yard rules, historical patterns, research insights)
- **Neo4j**: Graph database for container relationships and yard state
- **LangChain**: Retrieval chain for hybrid querying
- **Anthropic Claude**: LLM for data generation, explanations, and reasoning (optional)
- **FastAPI**: REST API framework

## 🔐 Security Note

**API Keys**: Never commit API keys to Git! 
- ✅ Store all API keys in `.env` file only (already in `.gitignore`)
- ✅ See `SECURITY.md` for best practices
- ❌ Never commit `.env` with real API keys
- ❌ Never hardcode keys in any source files

## Quick Start

### 🐳 Docker Setup (Recommended - No Local Installation!)

**Prerequisites**: Only Docker and Docker Compose needed!

```bash
# 1. Create .env file with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# 2. Start everything
docker-compose up -d

# 3. Access the API
# API Docs: http://localhost:8000/docs
# Health: http://localhost:8000/health
```

That's it! All services (Neo4j, ChromaDB, FastAPI) run in Docker containers.

> 📖 **See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker setup guide**

### 💻 Local Development Setup (Optional)

If you prefer local development:

**Prerequisites:**
- Python 3.11+
- Docker and Docker Compose (for Neo4j and ChromaDB)
- Git

**Windows:**
```powershell
.\setup.bat
```

**Linux/Mac:**
```bash
bash setup.sh
```

> 💡 **Windows Users**: See [QUICK_START_WINDOWS.md](QUICK_START_WINDOWS.md) for detailed Windows setup guide.

### Manual Setup

1. **Clone and navigate to project**
```bash
cd ai-hackathon-2026-Team2
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

> ⚠️ **Note**: If you encounter Rust/Cargo errors during `pydantic-core` installation:
> - **Windows**: Install Rust from https://rustup.rs/ or see `INSTALL_RUST.md`
> - **Quick fix**: `pip install --only-binary :all: pydantic` then retry

4. **Set up API keys in .env file**
```bash
# Edit .env file and add your API keys:
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-openai-key-here
```

> 🔐 **Security**: See `SECURITY.md` for best practices. Never commit `.env` with real API keys to Git!

5. **Start Neo4j with Docker**
```bash
docker-compose up -d
```

6. **Convert and ingest stacking rules**
```bash
# Convert CSV to JSON
python scripts/convert_rules_csv_to_json.py

# Ingest rules into ChromaDB
python scripts/ingest_rules.py
```

7. **Ingest historical movement data (3 months)**
```bash
# Place CSV file in project root: container_movement_dataset_v3 (3)(Container Movements).csv
python scripts/ingest_historical_data.py
```

7. **Run the application**

**Windows:**
```bash
run.bat
```

**Linux/Mac:**
```bash
bash run.sh
```

**Or manually:**
```bash
cd Yard-Optimization/backend && python -m Modules.main
# Or
cd Yard-Optimization/backend && uvicorn Modules.main:app --reload
```

8. **Test the API**
```bash
# Health check
curl http://localhost:8000/health

# RAG retrieval test
curl -X POST "http://localhost:8000/api/v1/rag/retrieve?query=stacking rules for heavy containers"
```

## 📁 Project Structure

```
ai-hackathon-2026-Team2/
├── Yard-Optimization/
│   └── backend/
│       └── Modules/
│           ├── __init__.py
│           ├── config.py              # Configuration management
│   ├── main.py                # FastAPI application
│   ├── database/
│   │   ├── __init__.py
│   │   ├── neo4j_client.py   # Neo4j connection & schema
│   │   └── chroma_client.py  # ChromaDB initialization
│   └── rag/
│       ├── __init__.py
│       └── retrieval_chain.py # LangChain retrieval chain
├── scripts/
│   ├── init_databases.py      # Initialize databases
│   ├── test_connections.py   # Test all connections
│   ├── convert_rules_csv_to_json.py  # Convert CSV rules to JSON
│   └── ingest_rules.py        # Ingest rules into ChromaDB
├── data/                      # Converted rules JSON files
│   ├── hazmat_rules.json
│   ├── master_rules.json
│   └── all_rules.json
├── chroma_db/                 # ChromaDB persistent storage (created automatically)
├── docker-compose.yml         # Neo4j Docker setup
├── requirements.txt           # Python dependencies
├── setup.sh / setup.bat       # Setup scripts
├── run.sh / run.bat           # Run scripts
├── .env.example              # Environment variables template
└── README.md
```

## 🔧 Configuration

### Neo4j
- **URI**: `bolt://localhost:7687`
- **Username**: `neo4j`
- **Password**: `container_yard_password` (change in production!)

### ChromaDB
- **Server**: Runs in Docker container (port 8001)
- **Client**: Lightweight Python library connects to Docker instance
- **Collections**: 
  - `yard_rules`: 50+ stacking rules
  - `historical_patterns`: Extracted patterns from 3 months of movement data
  - `terminal_config`: Terminal configuration and layout
  - `research_insights`: Research model insights
- **Configuration**: See `CHROMADB_DOCKER.md` for details

### Anthropic Claude
- **Model**: `claude-3-5-sonnet-20241022` (default)
- **Purpose**: Data generation, explanations, reasoning
- **API Key**: Add `ANTHROPIC_API_KEY=sk-ant-your-key-here` to `.env` file (optional but recommended)

## 📊 Database Initialization

### Neo4j Schema
The schema is automatically initialized on startup:
- **Constraints**: Unique constraints on Container, Slot, Vessel, TruckAppointment
- **Indexes**: Indexes on status, type, zoneType, voyageNumber

### ChromaDB Collections
Collections are created automatically:
- `yard_rules`: Yard stacking rules and constraints
- `historical_patterns`: Historical container movement patterns
- `terminal_config`: Terminal configuration and layout
- `research_insights`: Research model insights

## 🔍 RAG Retrieval

The system supports hybrid retrieval:
- **ChromaDB**: Semantic search for knowledge (rules, patterns, research)
- **Neo4j**: Graph queries for operational state (containers, slots, relationships)

Example:
```python
from Modules.rag.retrieval_chain import retrieval_chain

results = retrieval_chain.hybrid_retrieve(
    query="stacking rules for Export containers",
    neo4j_query_type="available_slots",
    neo4j_params={"zoneType": "Export", "limit": 10}
)
```

## 🧪 Testing

```bash
# Test all connections
python scripts/test_connections.py

# Test Neo4j connection
cd Yard-Optimization/backend && python -c "from Modules.database.neo4j_client import neo4j_client; neo4j_client.connect(); print('Neo4j connected!')"

# Test ChromaDB
cd Yard-Optimization/backend && python -c "from Modules.database.chroma_client import chroma_client; collections = chroma_client.initialize_collections(); print(f'Collections: {list(collections.keys())}')"

# Test RAG retrieval
cd Yard-Optimization/backend && python -c "from Modules.rag.retrieval_chain import HybridRetrievalChain; chain = HybridRetrievalChain(); results = chain.retrieve_from_chromadb('stacking rules for heavy containers'); print(f'Retrieved {len(results)} results')"

# Check rules count
cd Yard-Optimization/backend && python -c "from Modules.database.chroma_client import chroma_client; collection = chroma_client.get_or_create_collection('yard_rules'); print(f'Rules in ChromaDB: {collection.count()}')"
```

## 📊 Data Sources

### Stacking Rules (50+ Rules)

The system includes **50+ stacking rules** covering:

### Rule Categories
- **Hazmat Rules (18 rules)**: IMDG class segregation, explosives isolation, DG handling
- **Commercial Grouping (3 rules)**: Consignee, shipping line, CFS grouping
- **Size Compatibility (3 rules)**: Like-on-like stacking, 20ft/40ft restrictions
- **Weight Rules (2 rules)**: Heavy at bottom, weight gradient
- **Safety Rules (4 rules)**: Live animals, tier caps, ground bearing, height stability
- **Special Cargo (3 rules)**: Reefer requirements, OOG handling
- **Planning Rules (5 rules)**: Vessel cutoff, dwell time, rehandle minimization
- **Flow Segregation (1 rule)**: Export/Import separation
- **Delivery Model (1 rule)**: CFS vs DPD segregation

### Rules Format
Rules are provided in CSV format:
- `stacking_rules(HAZ Handling).csv` - 18 hazmat rules
- `stacking_rules(Stacking Rules Master).csv` - 32+ master rules

### Rules Ingestion
Rules are automatically converted and ingested:
1. **Convert**: CSV → JSON (`scripts/convert_rules_csv_to_json.py`)
2. **Ingest**: JSON → ChromaDB (`scripts/ingest_rules.py`)

Rules are stored in ChromaDB `yard_rules` collection for semantic search.

### Historical Movement Data (3 Months)

**File**: `container_movement_dataset_v3 (3)(Container Movements).csv`

**Data Includes**:
- Container movement events (Gate In, Stack, Unstack, Yard Shift, Rehandle, Vessel Load, etc.)
- Container properties (size, type, weight, POD, vessel assignment)
- Location details (blocks, stacks, tiers)
- Equipment usage (RTG, QC, trucks)
- ML labels (rehandle flag, optimality tag, move intent)
- Yard state (utilization, congestion levels)
- Exception flags and reasons

**Ingestion**:
- Automatically processed by `scripts/ingest_historical_data.py`
- Extracts patterns from each movement event
- Stores in ChromaDB `historical_patterns` collection
- Used for pattern matching and prediction

**Pattern Extraction**:
- Event type and context
- Container characteristics
- Stacking outcomes (rehandles, optimality)
- Yard state at time of event
- Exception scenarios

This historical data enables:
- Pattern recognition for similar scenarios
- Prediction of rehandle risks
- Learning from past decisions
- Dwell time predictions

## 📝 Next Steps

1. ✅ **Yard Rules**: 50+ rules ingested into ChromaDB
2. ✅ **Historical Data**: 3 months of movement data (auto-ingested from CSV)
3. **Ingest Terminal Config**: Add TICT terminal configuration
4. **Ingest Research PDF**: Process research model PDF
5. **Build Generation Logic**: Implement data generation with RAG + Claude LLM

## 🐛 Troubleshooting

### Neo4j Connection Issues
- Ensure Docker container is running: `docker ps`
- Check logs: `docker-compose logs neo4j`
- Verify credentials in `.env`

### ChromaDB Issues
- **ChromaDB runs in Docker** - no local installation needed!
- Check if container is running: `docker ps | findstr chromadb` (Windows) or `docker ps | grep chromadb` (Linux/Mac)
- View logs: `docker-compose logs chromadb`
- Restart: `docker-compose restart chromadb`
- See `CHROMADB_DOCKER.md` for detailed troubleshooting

### Port Conflicts
- Neo4j ports: 7474 (HTTP), 7687 (Bolt)
- ChromaDB: 8001 (API)
- FastAPI: 8000
- Change in `docker-compose.yml` and `.env` if needed

## 📚 Documentation

- [FastAPI Docs](http://localhost:8000/docs) (when running)
- [Neo4j Browser](http://localhost:7474)
- LangChain: https://python.langchain.com/

## 🔄 Running the Application

### Quick Run (Recommended)

**Windows:**
```bash
run.bat
```

**Linux/Mac:**
```bash
bash run.sh
```

The run scripts will:
- ✅ Check and start Neo4j if needed
- ✅ Convert CSV rules to JSON if needed
- ✅ Ingest rules into ChromaDB if needed
- ✅ Start the FastAPI server

### Manual Run

```bash
# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Start Neo4j
docker-compose up -d

# Initialize databases (first time only)
python scripts/init_databases.py

# Convert and ingest rules (first time only)
python scripts/convert_rules_csv_to_json.py
python scripts/ingest_rules.py

# Start API
cd Yard-Optimization/backend && python -m Modules.main
```

## 📊 API Endpoints

- **Health Check**: `GET /health`
- **Root**: `GET /`
- **RAG Retrieve**: `POST /api/v1/rag/retrieve?query=<your_query>`
- **LLM Generate**: `POST /api/v1/llm/generate` (with Anthropic Claude)
- **API Documentation**: http://localhost:8000/docs (Swagger UI)

### LLM Endpoint Example

```bash
curl -X POST "http://localhost:8000/api/v1/llm/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain why slot 1A-05-12-01 is recommended for container ABCD1234567",
    "use_context": true,
    "collection": "yard_rules"
  }'
```

## 🔍 Querying Rules

### Via API
```bash
curl -X POST "http://localhost:8000/api/v1/rag/retrieve?query=stacking rules for heavy containers"
```

### Via Python
```python
from Modules.rag.retrieval_chain import HybridRetrievalChain

chain = HybridRetrievalChain(collection_name="yard_rules")
results = chain.retrieve_from_chromadb(
    query="stacking rules for Export containers with hazmat",
    top_k=5
)

for result in results:
    print(f"Rule: {result['metadata']['ruleName']}")
    print(f"Score: {result['score']}")
    print(f"Description: {result['content'][:100]}...")
```

## 👥 Team 2 - AI Hackathon 2026


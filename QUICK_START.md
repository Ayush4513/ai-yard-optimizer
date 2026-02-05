# Quick Start Guide - Container Yard Optimization

## 🚀 Quick Commands to Run the Project

### Option 1: Docker (Recommended - Everything in Containers)

#### First Time Setup:
```powershell
# Navigate to project directory
cd ai-hackathon-2026-Team2

# Create .env file (if not exists)
if (-not (Test-Path .env)) {
    @"
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=container_yard_password
CHROMA_USE_DOCKER=true
CHROMA_HOST=chromadb
CHROMA_PORT=8000
"@ | Out-File -FilePath .env -Encoding utf8
    Write-Host "✅ Created .env file - Please add your ANTHROPIC_API_KEY"
}

# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps
```

#### Daily Use:
```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

#### Access Points:
- **Frontend UI**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health
- **Neo4j Browser**: http://localhost:7474
- **ChromaDB**: http://localhost:8001

---

### Option 2: Local Development (Backend + Frontend Separate)

#### Step 1: Start Databases (Docker)
```powershell
# Start only databases
docker-compose up -d neo4j chromadb sqlite
```

#### Step 2: Setup Backend (Python)
```powershell
# Navigate to project
cd ai-hackathon-2026-Team2

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
if (-not (Test-Path .env)) {
    @"
ANTHROPIC_API_KEY=sk-ant-your-key-here
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=container_yard_password
CHROMA_USE_DOCKER=true
CHROMA_HOST=localhost
CHROMA_PORT=8001
"@ | Out-File -FilePath .env -Encoding utf8
}

# Convert rules (first time only)
python scripts/convert_rules_csv_to_json.py

# Ingest rules (first time only)
python scripts/ingest_rules.py

# Start backend API
python -m src.main
# OR
cd Yard-Optimization\backend
python -m Modules.main
```

#### Step 3: Setup Frontend (Node.js)
```powershell
# Open new terminal
cd ai-hackathon-2026-Team2\Yard-Optimization

# Install dependencies (first time only)
npm install

# Start frontend dev server
npm run dev
```

---

## 📋 Complete Setup Checklist

### First Time Setup:

1. **Prerequisites Check:**
   ```powershell
   # Check Docker
   docker --version
   docker-compose --version
   
   # Check Python (for local dev)
   python --version
   
   # Check Node.js (for frontend)
   node --version
   npm --version
   ```

2. **Environment Setup:**
   ```powershell
   # Create .env file
   Copy-Item .env.example .env  # If exists
   # OR manually create .env with:
   # ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Data Ingestion (First Time):**
   ```powershell
   # Convert CSV rules to JSON
   python scripts/convert_rules_csv_to_json.py
   
   # Ingest rules into ChromaDB
   python scripts/ingest_rules.py
   
   # Ingest historical data (optional)
   python scripts/ingest_historical_data.py
   
   # Ingest SQLite data to Neo4j (optional)
   python scripts/ingest_to_neo4j.py
   ```

---

## 🔧 Useful Commands

### Docker Commands:
```powershell
# View all running containers
docker ps

# View logs for specific service
docker-compose logs api
docker-compose logs frontend
docker-compose logs neo4j

# Restart a specific service
docker-compose restart api

# Rebuild a specific service
docker-compose up -d --build api

# Execute command in container
docker-compose exec api python -m src.main
```

### Database Commands:
```powershell
# Test database connections
python scripts/test_connections.py

# Check Neo4j data
# Open http://localhost:7474
# Login: neo4j / container_yard_password

# Check ChromaDB collections
python -c "from src.database.chroma_client import chroma_client; collections = chroma_client.initialize_collections(); print([(name, c.count()) for name, c in collections.items()])"
```

### Frontend Commands:
```powershell
cd Yard-Optimization

# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🐛 Troubleshooting

### Port Already in Use:
```powershell
# Check what's using the port
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Docker Issues:
```powershell
# Restart Docker Desktop
# Then:
docker-compose down
docker-compose up -d --build
```

### Database Connection Issues:
```powershell
# Check if containers are running
docker ps

# Check container logs
docker-compose logs neo4j
docker-compose logs chromadb

# Restart databases
docker-compose restart neo4j chromadb
```

### Frontend Not Loading:
```powershell
# Check if API is running
curl http://localhost:8000/health

# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up -d --build frontend
```

---

## ✅ Verification Steps

After starting, verify everything works:

```powershell
# 1. Check all containers are running
docker-compose ps

# 2. Test API health
curl http://localhost:8000/health

# 3. Test database connections
python scripts/test_connections.py

# 4. Open frontend
Start-Process "http://localhost:5173"

# 5. Open API docs
Start-Process "http://localhost:8000/docs"
```

---

## 📝 Quick Reference

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| Frontend | 5173 | http://localhost:5173 | - |
| API | 8000 | http://localhost:8000 | - |
| API Docs | 8000 | http://localhost:8000/docs | - |
| Neo4j Browser | 7474 | http://localhost:7474 | neo4j / container_yard_password |
| ChromaDB | 8001 | http://localhost:8001 | - |

---

## 🎯 Next Steps

1. ✅ Start all services: `docker-compose up -d`
2. ✅ Verify health: `curl http://localhost:8000/health`
3. ✅ Open frontend: http://localhost:5173
4. ✅ Test API: http://localhost:8000/docs
5. ✅ Ingest data: `python scripts/ingest_to_neo4j.py`


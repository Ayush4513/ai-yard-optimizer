# Troubleshooting Guide

## Common Docker Issues

### API Container Fails to Start

**Error**: `target api: failed to receive status: rpc error: code = Unavailable desc = error reading from server: EOF`

**Causes**:
1. SQLite database initialization failing
2. Database connection timeout
3. Missing dependencies
4. Path issues in Docker

**Solutions**:

1. **Check container logs**:
   ```powershell
   docker-compose logs api
   ```

2. **Check if databases are running**:
   ```powershell
   docker-compose ps
   ```

3. **Rebuild containers**:
   ```powershell
   docker-compose down
   docker-compose up -d --build
   ```

4. **Check SQLite file exists**:
   ```powershell
   # Verify SQLite file is in the right place
   ls data/sqlite/yard_optimization.db
   ls Yard-Optimization/backend/yard_optimization.db
   ```

5. **Start without frontend** (to isolate issue):
   ```powershell
   docker-compose up -d neo4j chromadb sqlite api
   ```

6. **Check environment variables**:
   ```powershell
   docker-compose exec api env | grep -E "NEO4J|CHROMA|SQLITE"
   ```

### SQLite Database Errors

**Error**: SQL errors during startup

**Solutions**:

1. **SQLite is read-only in Docker** - This is expected. The app uses SQLite for:
   - Reading existing data (movement history, vessel plans)
   - NOT for writing new data (that goes to Neo4j)

2. **If SQLite file doesn't exist**:
   ```powershell
   # Copy database file to data/sqlite
   mkdir -p data/sqlite
   Copy-Item "Yard-Optimization\backend\yard_optimization.db" -Destination "data\sqlite\yard_optimization.db" -Force
   ```

3. **SQLAlchemy table creation** - The app now handles this gracefully:
   - Tables are created in startup event (not at import)
   - If SQLite fails, app continues without CRUD features
   - RAG/GraphRAG features still work

### Neo4j Connection Issues

**Error**: Failed to connect to Neo4j

**Solutions**:

1. **Wait for Neo4j to be healthy**:
   ```powershell
   docker-compose ps neo4j
   # Should show "healthy" status
   ```

2. **Check Neo4j logs**:
   ```powershell
   docker-compose logs neo4j
   ```

3. **Test Neo4j connection**:
   ```powershell
   docker-compose exec api python -c "from src.database.neo4j_client import neo4j_client; print('Connected:', neo4j_client.connect())"
   ```

### ChromaDB Connection Issues

**Error**: Failed to connect to ChromaDB

**Solutions**:

1. **Check ChromaDB is running**:
   ```powershell
   docker-compose ps chromadb
   ```

2. **Check ChromaDB logs**:
   ```powershell
   docker-compose logs chromadb
   ```

3. **Verify ChromaDB port**:
   - ChromaDB should be on port 8001 (host) → 8000 (container)
   - API connects to `chromadb:8000` (internal Docker network)

### Port Conflicts

**Error**: Port already in use

**Solutions**:

1. **Check what's using the port**:
   ```powershell
   netstat -ano | findstr :8000
   netstat -ano | findstr :5173
   ```

2. **Kill the process**:
   ```powershell
   taskkill /PID <PID> /F
   ```

3. **Or change ports in docker-compose.yml**:
   ```yaml
   ports:
     - "8001:8000"  # Change host port
   ```

### Container Keeps Restarting

**Error**: Container status shows "Restarting"

**Solutions**:

1. **Check logs for errors**:
   ```powershell
   docker-compose logs --tail=100 api
   ```

2. **Check if it's a dependency issue**:
   ```powershell
   # Start dependencies first
   docker-compose up -d neo4j chromadb sqlite
   # Wait 30 seconds
   docker-compose up -d api
   ```

3. **Remove and recreate**:
   ```powershell
   docker-compose rm -f api
   docker-compose up -d --build api
   ```

### Build Timeout Issues

**Error**: Build takes too long (>30 minutes)

**Solutions**:

1. **Build in stages** (already done in Dockerfile):
   - Core packages first
   - ML packages last (sentence-transformers is slow)

2. **Use build cache**:
   ```powershell
   docker-compose build --no-cache api  # Only if needed
   ```

3. **Check internet connection** - ML packages download large models

### Frontend Not Loading

**Error**: Frontend shows blank page or connection error

**Solutions**:

1. **Check frontend container**:
   ```powershell
   docker-compose ps frontend
   docker-compose logs frontend
   ```

2. **Check API is accessible**:
   ```powershell
   curl http://localhost:8000/health
   ```

3. **Rebuild frontend**:
   ```powershell
   docker-compose up -d --build frontend
   ```

## Quick Diagnostic Commands

```powershell
# Check all containers
docker-compose ps

# Check all logs
docker-compose logs

# Check specific service logs
docker-compose logs api
docker-compose logs neo4j
docker-compose logs chromadb

# Restart everything
docker-compose restart

# Complete reset (removes volumes)
docker-compose down -v
docker-compose up -d --build

# Test API health
curl http://localhost:8000/health

# Test database connections
docker-compose exec api python scripts/test_connections.py
```

## Still Having Issues?

1. **Check Docker Desktop is running**
2. **Check disk space** - Docker needs free space
3. **Check Docker logs**: `docker system df`
4. **Restart Docker Desktop**
5. **Check Windows WSL2** (if using WSL2 backend)


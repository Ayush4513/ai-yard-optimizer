# 🚀 Run Your Project - Simple Commands

## Step 1: Start Docker Desktop

**Make sure Docker Desktop is running!**

- Open **Docker Desktop** from Start Menu
- Wait until the whale icon stops animating (fully started)

## Step 2: Navigate to Project

```powershell
cd ai-hackathon-2026-Team2
```

## Step 3: Start All Services

### First Time (Build + Start):
```powershell
docker-compose up -d --build
```

### Every Other Time (Just Start):
```powershell
docker-compose up -d
```

## Step 4: Check Status

```powershell
docker-compose ps
```

**All services should show "Up" status.**

## Step 5: Access Your Application

- **Frontend UI**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/health
- **Neo4j Browser**: http://localhost:7474 (login: neo4j / container_yard_password)

---

## 📋 Quick Command Reference

### Start Everything
```powershell
docker-compose up -d
```

### Stop Everything
```powershell
docker-compose down
```

### View Logs
```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f neo4j
```

### Restart a Service
```powershell
docker-compose restart api
docker-compose restart frontend
```

### Rebuild After Code Changes
```powershell
docker-compose up -d --build
```

### Check Container Status
```powershell
docker ps
docker-compose ps
```

---

## 🔧 Troubleshooting

### If Services Don't Start:

1. **Check Docker Desktop is running:**
   ```powershell
   docker ps
   ```

2. **Check logs for errors:**
   ```powershell
   docker-compose logs
   ```

3. **Restart everything:**
   ```powershell
   docker-compose down
   docker-compose up -d --build
   ```

### If Port is Already in Use:

```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace <PID> with actual number)
taskkill /PID <PID> /F
```

### If API Won't Start:

```powershell
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api
```

---

## ✅ Verification Checklist

After starting, verify everything works:

```powershell
# 1. Check all containers are running
docker-compose ps

# 2. Test API
curl http://localhost:8000/health

# 3. Open frontend in browser
Start-Process "http://localhost:5173"
```

---

## 🎯 Complete Startup Sequence

```powershell
# 1. Start Docker Desktop (from Start Menu)

# 2. Navigate to project
cd ai-hackathon-2026-Team2

# 3. Start all services
docker-compose up -d

# 4. Wait 30-60 seconds for services to start

# 5. Check status
docker-compose ps

# 6. Open your application
Start-Process "http://localhost:5173"
```

---

## 📝 Service Details

| Service | Container Name | Port | Status Check |
|---------|---------------|------|--------------|
| Frontend | container_yard_frontend | 5173 | http://localhost:5173 |
| API | container_yard_api | 8000 | http://localhost:8000/health |
| Neo4j | container_yard_neo4j | 7474, 7687 | http://localhost:7474 |
| ChromaDB | container_yard_chromadb | 8001 | http://localhost:8001 |
| SQLite | container_yard_sqlite | - | `docker ps` |

---

## 💡 Pro Tips

1. **First time setup takes longer** (building images)
2. **Subsequent starts are faster** (images already built)
3. **Use `-d` flag** to run in background (detached mode)
4. **Check logs** if something doesn't work: `docker-compose logs -f`
5. **Stop everything** when done: `docker-compose down`


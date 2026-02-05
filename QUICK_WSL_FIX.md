# Quick WSL Fix for Docker Desktop

## Your Current Status
- WSL distribution is **Stopped**
- This is causing Docker Desktop to fail

## Quick Fix Steps

### Step 1: Shutdown WSL (Already Done)
```powershell
wsl --shutdown
```

### Step 2: Restart Docker Desktop
1. **Quit Docker Desktop** completely (right-click tray icon → Quit)
2. Wait 10 seconds
3. **Start Docker Desktop** again
4. Wait for it to fully start (whale icon stops animating)

### Step 3: Verify WSL is Running
```powershell
wsl --list --verbose
```

Should show:
```
docker-desktop      Running    2
docker-desktop-data Running    2
```

### Step 4: Test Docker
```powershell
docker ps
```

Should show containers or empty list (not an error).

## If Still Not Working

### Option A: Restart WSL Distribution
```powershell
# Shutdown
wsl --shutdown

# Wait 10 seconds, then start Docker Desktop
# Docker will automatically start WSL distributions
```

### Option B: Reset WSL Integration in Docker Desktop
1. Open Docker Desktop
2. Settings → Resources → WSL Integration
3. Uncheck all distributions → Apply & Restart
4. Wait for restart
5. Check your distribution again → Apply & Restart

### Option C: Update WSL
```powershell
# Run as Administrator
wsl --update
wsl --shutdown
# Then restart Docker Desktop
```

## After Fixing

Once Docker Desktop is working:

```powershell
cd ai-hackathon-2026-Team2
docker-compose up -d
docker-compose ps
```


# Fix Docker Desktop WSL Error

## Error: "There was a problem with WSL"

This is a Docker Desktop WSL backend issue, not your application code.

## Quick Fixes (Try in Order)

### Solution 1: Restart Docker Desktop
1. Click **"Quit"** in the error dialog
2. Close Docker Desktop completely
3. Wait 10 seconds
4. Restart Docker Desktop
5. Wait for it to fully start (whale icon stops animating)

### Solution 2: Restart WSL
```powershell
# Open PowerShell as Administrator and run:
wsl --shutdown
# Wait 10 seconds
# Then restart Docker Desktop
```

### Solution 3: Restart WSL Distribution
```powershell
# List WSL distributions
wsl --list --verbose

# Shutdown all WSL
wsl --shutdown

# Restart Docker Desktop
```

### Solution 4: Reset Docker Desktop WSL Integration
1. Open Docker Desktop
2. Go to **Settings** (gear icon)
3. Go to **Resources** → **WSL Integration**
4. **Uncheck** all distributions
5. Click **Apply & Restart**
6. Wait for restart
7. Go back to **WSL Integration**
8. **Check** your WSL distribution (usually "Ubuntu" or "docker-desktop")
9. Click **Apply & Restart**

### Solution 5: Update WSL
```powershell
# Open PowerShell as Administrator
wsl --update
wsl --shutdown
# Restart Docker Desktop
```

### Solution 6: Repair Docker Desktop
1. Open **Windows Settings**
2. Go to **Apps** → **Apps & features**
3. Find **Docker Desktop**
4. Click **Advanced options**
5. Click **Repair**
6. Restart your computer
7. Start Docker Desktop

### Solution 7: Reinstall WSL (Last Resort)
```powershell
# Open PowerShell as Administrator
# Uninstall WSL
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data

# Reinstall
wsl --install

# Restart computer
# Docker Desktop will recreate WSL distributions on next start
```

## Verify Fix

After trying a solution:

```powershell
# Check WSL is running
wsl --list --verbose

# Should show:
# docker-desktop      Running
# docker-desktop-data Running

# Check Docker is running
docker ps

# Should show running containers or empty list (not an error)
```

## Alternative: Use Docker Without WSL

If WSL continues to have issues, you can switch Docker Desktop to use Hyper-V instead:

1. Open Docker Desktop **Settings**
2. Go to **General**
3. **Uncheck** "Use the WSL 2 based engine"
4. Click **Apply & Restart**
5. Note: This requires Windows Pro/Enterprise and Hyper-V enabled

## Still Having Issues?

1. **Check Windows Updates** - WSL updates come through Windows Update
2. **Check Docker Desktop Updates** - Update to latest version
3. **Check Disk Space** - WSL needs free disk space
4. **Check Antivirus** - Some antivirus blocks WSL

## After Fixing WSL

Once Docker Desktop is working:

```powershell
# Navigate to project
cd ai-hackathon-2026-Team2

# Start containers
docker-compose up -d

# Check status
docker-compose ps
```


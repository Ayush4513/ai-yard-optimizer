# Move Docker Desktop to D: Drive

## ✅ Prerequisites Check

- **D: Drive Available:** ✅ 259.71 GB free (plenty of space!)
- **Docker Desktop:** Currently running (needs to be stopped)

## Step-by-Step Instructions

### Step 1: Stop Docker Desktop

1. **Right-click** the Docker Desktop icon in the system tray (bottom right)
2. Click **"Quit Docker Desktop"**
3. Wait for it to fully close (whale icon disappears)
4. Verify it's stopped:
   ```powershell
   wsl --list --verbose
   ```
   Should show `Stopped` instead of `Running`

### Step 2: Run the Migration Script

Open PowerShell (as Administrator recommended) and run:

```powershell
cd ai-hackathon-2026-Team2
.\move-docker-to-d.ps1
```

**OR** run manually:

```powershell
# Export distributions
wsl --export docker-desktop-data D:\docker-desktop-data.tar
wsl --export docker-desktop D:\docker-desktop.tar

# Unregister old distributions
wsl --unregister docker-desktop-data
wsl --unregister docker-desktop

# Import to D: drive
wsl --import docker-desktop-data D:\docker-desktop-data D:\docker-desktop-data.tar --version 2
wsl --import docker-desktop D:\docker-desktop D:\docker-desktop.tar --version 2

# Clean up .tar files (they're large - 20GB+)
Remove-Item D:\docker-desktop-data.tar
Remove-Item D:\docker-desktop.tar
```

**Time:** This will take 15-30 minutes depending on your Docker data size (~20GB)

### Step 3: Start Docker Desktop

1. **Start Docker Desktop** from Start Menu
2. Wait for it to fully start (whale icon stops animating)
3. This may take 2-3 minutes on first start after migration

### Step 4: Verify Everything Works

```powershell
# Check WSL distributions are on D: drive
wsl --list --verbose

# Should show:
# docker-desktop      Running    2
# docker-desktop-data Running    2

# Test Docker
docker ps

# Check your containers are still there
docker-compose -f ai-hackathon-2026-Team2/docker-compose.yml ps
```

## What Gets Moved

- ✅ All Docker images (~17GB)
- ✅ All containers and their data
- ✅ All volumes (~2GB)
- ✅ All Docker settings and configuration

## After Migration

Your Docker data will be located at:
- `D:\docker-desktop-data\` - Main Docker data (images, containers, volumes)
- `D:\docker-desktop\` - Docker Desktop WSL distribution

**C: drive space freed:** ~20-25GB

## Troubleshooting

### If Migration Fails

1. **Check D: drive has enough space** (need 30GB+ free)
2. **Ensure Docker Desktop is fully stopped**
3. **Run PowerShell as Administrator**
4. **Check WSL is working:**
   ```powershell
   wsl --status
   ```

### If Docker Desktop Won't Start After Migration

1. **Check WSL distributions:**
   ```powershell
   wsl --list --verbose
   ```

2. **Try restarting WSL:**
   ```powershell
   wsl --shutdown
   # Wait 10 seconds
   # Start Docker Desktop again
   ```

3. **Check Docker Desktop logs:**
   - Settings → Troubleshoot → View logs

### If Containers/Images Are Missing

- They should still be there, but if not:
  - Check `D:\docker-desktop-data\` exists
  - Verify WSL distributions are running
  - Try restarting Docker Desktop

## Rollback (If Needed)

If something goes wrong, you can restore from the .tar files (if you didn't delete them):

```powershell
# Unregister new distributions
wsl --unregister docker-desktop-data
wsl --unregister docker-desktop

# Import back to default location (if .tar files still exist)
wsl --import docker-desktop-data %LOCALAPPDATA%\Docker\wsl\data D:\docker-desktop-data.tar --version 2
wsl --import docker-desktop %LOCALAPPDATA%\Docker\wsl\distro D:\docker-desktop.tar --version 2
```

## Quick Reference

**Before Migration:**
- Docker data on C: drive (~20GB)
- Location: `%LOCALAPPDATA%\Docker\wsl\`

**After Migration:**
- Docker data on D: drive (~20GB)
- Location: `D:\docker-desktop-data\` and `D:\docker-desktop\`
- C: drive freed: ~20GB


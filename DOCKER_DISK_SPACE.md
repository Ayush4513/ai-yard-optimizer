# Docker Disk Space Management

## Quick Cleanup (Free Space Immediately)

### 1. Remove Unused Docker Resources
```powershell
# Remove all stopped containers, unused networks, dangling images, and build cache
docker system prune -a --volumes

# This will free up significant space. Use with caution - removes everything not in use.
```

### 2. Remove Only Build Cache (Safest)
```powershell
# Remove only build cache (keeps containers and images)
docker builder prune -a

# This is safe and often frees 5-10GB+
```

### 3. Remove Unused Images
```powershell
# Remove dangling images (untagged)
docker image prune

# Remove all unused images (not just dangling)
docker image prune -a
```

### 4. Remove Unused Volumes
```powershell
# Remove unused volumes (be careful - this removes data!)
docker volume prune
```

### 5. Check What's Using Space
```powershell
# See detailed breakdown
docker system df -v
```

## Configure Docker to Limit Disk Usage

### Option 1: Move Docker Data to Another Drive

1. **Stop Docker Desktop**
2. **Export WSL Distribution**:
   ```powershell
   wsl --export docker-desktop-data D:\docker-desktop-data.tar
   wsl --export docker-desktop D:\docker-desktop.tar
   ```
3. **Unregister Current Distributions**:
   ```powershell
   wsl --unregister docker-desktop-data
   wsl --unregister docker-desktop
   ```
4. **Import to New Location**:
   ```powershell
   wsl --import docker-desktop-data D:\docker-desktop-data D:\docker-desktop-data.tar --version 2
   wsl --import docker-desktop D:\docker-desktop D:\docker-desktop.tar --version 2
   ```
5. **Delete the .tar files** (they're large)
6. **Start Docker Desktop**

### Option 2: Limit WSL Disk Size

Edit `%UserProfile%\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
localhostForwarding=true
# Limit disk size (adjust as needed)
disk=50GB
```

Then restart WSL:
```powershell
wsl --shutdown
# Restart Docker Desktop
```

### Option 3: Configure Docker Desktop Disk Usage

1. Open Docker Desktop
2. Settings → Resources → Advanced
3. Set **Disk image size** (e.g., 50GB instead of default 64GB)
4. Click **Apply & Restart**

## Regular Maintenance Script

Create `cleanup-docker.ps1`:
```powershell
# Cleanup Docker disk space
Write-Host "Cleaning Docker..."

# Remove build cache
docker builder prune -a -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (be careful!)
# docker volume prune -f

# Show freed space
docker system df

Write-Host "Done!"
```

Run periodically:
```powershell
.\cleanup-docker.ps1
```

## Linux VM vs Windows Docker: Comparison

### Linux VM (Ubuntu/Debian)
**Pros:**
- ✅ Native Docker (no WSL overhead)
- ✅ Better performance
- ✅ Less disk space usage (no WSL virtual disks)
- ✅ More control over resources
- ✅ Better for production-like environments

**Cons:**
- ❌ Need to set up VM (VirtualBox, VMware, Hyper-V)
- ❌ Need to install Docker in VM
- ❌ Need to share files between Windows and VM
- ❌ More complex development workflow
- ❌ Need to manage VM separately

### Windows Docker (Current Setup)
**Pros:**
- ✅ Integrated with Windows
- ✅ Easy file sharing
- ✅ No VM setup needed
- ✅ Docker Desktop GUI

**Cons:**
- ❌ WSL2 uses significant disk space
- ❌ Slower performance than native Linux
- ❌ More overhead

## Recommendation

### Try These First (Before Switching to VM):

1. **Clean up Docker** (often frees 10-20GB):
   ```powershell
   docker system prune -a --volumes
   ```

2. **Move Docker to another drive** if you have one (D:\, E:\, etc.)

3. **Limit WSL disk size** using `.wslconfig`

4. **Set up regular cleanup** (run weekly)

### Switch to Linux VM If:
- ✅ You have < 20GB free disk space after cleanup
- ✅ You need better performance
- ✅ You're comfortable with Linux
- ✅ You have time to set up VM and reconfigure

## Quick Decision Guide

**Keep Windows Docker if:**
- Cleanup frees enough space (> 20GB free)
- You prefer integrated workflow
- You don't need maximum performance

**Switch to Linux VM if:**
- Still low on space after cleanup
- You need better performance
- You're comfortable with Linux/VM management

## Next Steps

1. **Run cleanup first**:
   ```powershell
   docker system prune -a --volumes
   ```

2. **Check freed space**:
   ```powershell
   docker system df
   ```

3. **If still low on space**, consider moving Docker to another drive or switching to Linux VM.


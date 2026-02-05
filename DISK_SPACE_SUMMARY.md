# Disk Space Summary & Recommendations

## ✅ Cleanup Results

**Freed:** ~16.5GB (build cache removed)
**Current Docker Usage:**
- Images: 17.11GB (all active - in use by containers)
- Containers: 277MB
- Volumes: 1.9GB
- Build Cache: 0GB ✅

## Current Situation

Your Docker images (17GB) are **actively being used** by running containers, so they can't be removed without stopping your containers first.

## Should You Switch to Linux VM?

### ❌ **NO - Not Yet** (Try These First)

#### Option 1: Move Docker to Another Drive (Best Solution)
If you have another drive (D:\, E:\, etc.) with more space:

1. **Stop Docker Desktop**
2. **Export WSL distributions**:
   ```powershell
   wsl --export docker-desktop-data D:\docker-desktop-data.tar
   wsl --export docker-desktop D:\docker-desktop.tar
   ```
3. **Unregister**:
   ```powershell
   wsl --unregister docker-desktop-data
   wsl --unregister docker-desktop
   ```
4. **Import to new drive**:
   ```powershell
   wsl --import docker-desktop-data D:\docker-desktop-data D:\docker-desktop-data.tar --version 2
   wsl --import docker-desktop D:\docker-desktop D:\docker-desktop.tar --version 2
   ```
5. **Delete .tar files** (they're large)
6. **Start Docker Desktop**

This moves all Docker data (~20GB) to another drive.

#### Option 2: Limit WSL Disk Size
Create/edit `%UserProfile%\.wslconfig`:
```ini
[wsl2]
memory=4GB
processors=2
swap=2GB
disk=40GB
```

Then:
```powershell
wsl --shutdown
# Restart Docker Desktop
```

#### Option 3: Regular Cleanup
Run the cleanup script weekly:
```powershell
.\cleanup-docker.ps1
```

### ✅ **YES - Switch to Linux VM If:**
- You have < 15GB free after moving Docker
- You need better performance
- You're comfortable with Linux
- You have time to set up

## Linux VM Setup (If Needed)

### Quick Setup Guide

1. **Install VirtualBox** (free) or **VMware Workstation Player** (free for personal use)

2. **Create Ubuntu VM**:
   - Download Ubuntu 22.04 LTS ISO
   - Allocate 30-40GB disk space
   - 4GB RAM minimum, 8GB recommended
   - Enable virtualization in BIOS

3. **Install Docker in VM**:
   ```bash
   # In Ubuntu VM
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

4. **Share Project Folder**:
   - VirtualBox: Devices → Shared Folders → Add your project folder
   - Or use SCP/SFTP to copy files

5. **Run Project**:
   ```bash
   cd /path/to/shared/folder/ai-hackathon-2026-Team2
   docker-compose up -d
   ```

### VM Pros/Cons

**Pros:**
- ✅ Native Docker (faster, less overhead)
- ✅ Uses less disk space (no WSL virtual disks)
- ✅ Better performance
- ✅ More control

**Cons:**
- ❌ Need to set up VM
- ❌ File sharing more complex
- ❌ Need to manage VM separately
- ❌ More initial setup time

## My Recommendation

### **Try Option 1 First** (Move Docker to Another Drive)
- Easiest solution
- No workflow changes
- Frees up C: drive immediately
- Takes 10-15 minutes

### **If No Other Drive Available:**
1. Limit WSL disk size (Option 2)
2. Set up regular cleanup (Option 3)
3. If still low on space → Consider Linux VM

## Quick Commands

```powershell
# Check current disk space
Get-PSDrive C

# Check Docker usage
docker system df

# Cleanup (safe - keeps running containers)
docker builder prune -a -f

# Full cleanup (stops containers - use carefully!)
docker system prune -a --volumes
```

## Next Steps

1. **Check if you have another drive** (D:\, E:\, etc.)
   - If YES → Move Docker there (Option 1)
   - If NO → Try Option 2 (limit WSL size)

2. **Set up regular cleanup**:
   ```powershell
   # Add to Windows Task Scheduler to run weekly
   .\cleanup-docker.ps1
   ```

3. **Only switch to VM if** you still have space issues after trying the above.


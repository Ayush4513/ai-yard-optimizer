# Create Symlink for Docker Data VHDX (Requires Admin)
# Run this script as Administrator

$sourceVhdx = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"
$targetVhdx = "D:\docker-desktop-data\docker_data.vhdx"

# Check if target exists
if (-not (Test-Path $targetVhdx)) {
    Write-Host "ERROR: Target file not found: $targetVhdx" -ForegroundColor Red
    exit 1
}

# Ensure source directory exists
$sourceDir = Split-Path $sourceVhdx -Parent
if (-not (Test-Path $sourceDir)) {
    New-Item -ItemType Directory -Force -Path $sourceDir | Out-Null
    Write-Host "Created directory: $sourceDir" -ForegroundColor Green
}

# Remove any existing file/link
if (Test-Path $sourceVhdx) {
    Remove-Item $sourceVhdx -Force
    Write-Host "Removed existing file/link at source location" -ForegroundColor Yellow
}

# Create symlink
try {
    New-Item -ItemType SymbolicLink -Path $sourceVhdx -Target $targetVhdx -Force | Out-Null
    Write-Host "Symbolic link created successfully!" -ForegroundColor Green
    Write-Host "Link: $sourceVhdx" -ForegroundColor Cyan
    Write-Host "Target: $targetVhdx" -ForegroundColor Cyan
} catch {
    Write-Host "ERROR: Failed to create symlink: $_" -ForegroundColor Red
    exit 1
}

# Verify
$link = Get-Item $sourceVhdx
if ($link.LinkType -eq "SymbolicLink") {
    Write-Host ""
    Write-Host "Verification: Symlink is working correctly!" -ForegroundColor Green
} else {
    Write-Host "WARNING: File exists but is not a symlink" -ForegroundColor Yellow
}


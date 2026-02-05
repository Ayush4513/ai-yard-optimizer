# Move Docker Desktop to D: Drive
# This script exports WSL distributions and imports them to D: drive

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Moving Docker Desktop to D: Drive" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if D: drive exists
if (-not (Test-Path "D:\")) {
    Write-Host "ERROR: D: drive not found!" -ForegroundColor Red
    Write-Host "Please ensure D: drive exists and is accessible." -ForegroundColor Yellow
    exit 1
}

# Check available space on D:
$dDrive = Get-PSDrive D -ErrorAction SilentlyContinue
if ($dDrive) {
    $freeSpaceGB = [math]::Round($dDrive.Free / 1GB, 2)
    Write-Host "D: Drive Free Space: $freeSpaceGB GB" -ForegroundColor Green
    
    if ($freeSpaceGB -lt 30) {
        Write-Host "WARNING: D: drive has less than 30GB free space." -ForegroundColor Yellow
        Write-Host "Docker needs at least 20-30GB. Continue anyway? (y/n)" -ForegroundColor Yellow
        $confirm = Read-Host
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            exit 1
        }
    }
} else {
    Write-Host "WARNING: Could not check D: drive space. Continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "IMPORTANT: Docker Desktop must be STOPPED before proceeding!" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "Have you stopped Docker Desktop? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Please stop Docker Desktop first, then run this script again." -ForegroundColor Yellow
    exit 1
}

# Define paths
$dockerDataPath = "D:\docker-desktop-data"
$dockerPath = "D:\docker-desktop"
$dockerDataTar = "D:\docker-desktop-data.tar"
$dockerTar = "D:\docker-desktop.tar"

# Create directories
Write-Host ""
Write-Host "Creating directories on D: drive..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $dockerDataPath | Out-Null
New-Item -ItemType Directory -Force -Path $dockerPath | Out-Null

# Check which distributions exist
Write-Host ""
Write-Host "Checking WSL distributions..." -ForegroundColor Yellow
$wslList = wsl --list --quiet
$hasDockerData = $wslList -match "docker-desktop-data"
$hasDocker = $wslList -match "docker-desktop"

# Calculate total steps: exports + unregister + imports + cleanup
$stepCount = 0
if ($hasDockerData) { $stepCount++ }  # Export docker-desktop-data
if ($hasDocker) { $stepCount++ }      # Export docker-desktop
$stepCount++                           # Unregister
if ($hasDockerData) { $stepCount++ }  # Import docker-desktop-data
if ($hasDocker) { $stepCount++ }      # Import docker-desktop
$stepCount++                           # Cleanup
$currentStep = 0

# Step 1: Export docker-desktop-data (if exists)
if ($hasDockerData) {
    $currentStep++
    Write-Host ""
    Write-Host "Step $($currentStep)/$($stepCount): Exporting docker-desktop-data..." -ForegroundColor Yellow
    Write-Host "This may take 10-20 minutes depending on size..." -ForegroundColor Yellow
    wsl --export docker-desktop-data $dockerDataTar
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to export docker-desktop-data" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Exported docker-desktop-data" -ForegroundColor Green
}

# Step 2: Export docker-desktop (if exists)
if ($hasDocker) {
    $currentStep++
    Write-Host ""
    Write-Host "Step $($currentStep)/$($stepCount): Exporting docker-desktop..." -ForegroundColor Yellow
    wsl --export docker-desktop $dockerTar
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to export docker-desktop" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Exported docker-desktop" -ForegroundColor Green
}

# Step 3: Unregister old distributions
$currentStep++
Write-Host ""
Write-Host "Step $($currentStep)/$($stepCount): Unregistering old WSL distributions..." -ForegroundColor Yellow
if ($hasDockerData) {
    wsl --unregister docker-desktop-data 2>$null
}
if ($hasDocker) {
    wsl --unregister docker-desktop 2>$null
}
Write-Host "✓ Unregistered old distributions" -ForegroundColor Green

# Step 4: Import to D: drive
$currentStep++
Write-Host ""
Write-Host "Step $($currentStep)/$($stepCount): Importing to D: drive..." -ForegroundColor Yellow
Write-Host "This may take 10-20 minutes..." -ForegroundColor Yellow

if ($hasDockerData) {
    wsl --import docker-desktop-data $dockerDataPath $dockerDataTar --version 2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to import docker-desktop-data" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Imported docker-desktop-data to D: drive" -ForegroundColor Green
}

if ($hasDocker) {
    wsl --import docker-desktop $dockerPath $dockerTar --version 2
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to import docker-desktop" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Imported docker-desktop to D: drive" -ForegroundColor Green
}

# Step 5: Clean up .tar files
$currentStep++
Write-Host ""
Write-Host "Step $($currentStep)/$($stepCount): Cleaning up temporary files..." -ForegroundColor Yellow
if (Test-Path $dockerDataTar) {
    Remove-Item $dockerDataTar -Force -ErrorAction SilentlyContinue
}
if (Test-Path $dockerTar) {
    Remove-Item $dockerTar -Force -ErrorAction SilentlyContinue
}
Write-Host "✓ Cleaned up temporary files" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker Desktop data is now on D: drive:" -ForegroundColor Green
Write-Host "  - D:\docker-desktop-data" -ForegroundColor Cyan
Write-Host "  - D:\docker-desktop" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start Docker Desktop" -ForegroundColor White
Write-Host "2. Wait for it to fully start" -ForegroundColor White
Write-Host "3. Verify with: docker ps" -ForegroundColor White
Write-Host ""
Write-Host "Your containers and images should still be available!" -ForegroundColor Green


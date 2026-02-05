# Docker Cleanup Script
# Frees disk space by removing unused Docker resources

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Docker Disk Space Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show current usage
Write-Host "Current Docker disk usage:" -ForegroundColor Yellow
docker system df
Write-Host ""

# Ask for confirmation
$confirm = Read-Host "This will remove unused images, containers, and build cache. Continue? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cleanup cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Cleaning build cache..." -ForegroundColor Green
docker builder prune -a -f

Write-Host "Cleaning unused images..." -ForegroundColor Green
docker image prune -a -f

Write-Host "Cleaning unused containers..." -ForegroundColor Green
docker container prune -f

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "New Docker disk usage:" -ForegroundColor Yellow
docker system df

Write-Host ""
Write-Host "Note: Volumes were NOT removed (they contain your data)." -ForegroundColor Yellow
Write-Host "If you need more space, you can manually remove unused volumes with:" -ForegroundColor Yellow
Write-Host "  docker volume prune" -ForegroundColor Cyan


# PowerShell script to test cron job locally
# Run this while the dev server is running (bun run dev)

Write-Host "Testing Cron Job Locally" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Option 1: Use the test endpoint (recommended)
Write-Host "Option 1: Using test endpoint..." -ForegroundColor Yellow
Write-Host "GET http://127.0.0.1:8787/api/test/cron" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8787/api/test/cron" -Method Get
    Write-Host "Result:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the dev server is running: bun run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Show scheduled posts
Write-Host "Currently Scheduled Posts:" -ForegroundColor Yellow
Write-Host "GET http://127.0.0.1:8787/api/test/scheduled-posts" -ForegroundColor Gray
Write-Host ""

try {
    $scheduled = Invoke-RestMethod -Uri "http://127.0.0.1:8787/api/test/scheduled-posts" -Method Get
    Write-Host "Scheduled Posts:" -ForegroundColor Green
    $scheduled | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

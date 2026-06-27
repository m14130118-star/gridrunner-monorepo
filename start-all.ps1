$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== GridRunner Monorepo ===" -ForegroundColor Cyan
Write-Host ""

# Auth server (port 3001)
Write-Host "[1/3] Starting Auth Server (port 3001)..." -ForegroundColor Yellow
$authJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$root\auth-server'; node src/index.js" -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 2

# Web game (port 3000)
Write-Host "[2/3] Starting Web Game (port 3000)..." -ForegroundColor Yellow
$gameJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force; Set-Location -LiteralPath '$root\web\web-game'; npm run dev" -WindowStyle Hidden -PassThru

# Web landing (port 3002)
Write-Host "[3/3] Starting Web Landing (port 3002)..." -ForegroundColor Yellow
$landingJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force; Set-Location -LiteralPath '$root\web\web-landing'; npm run dev" -WindowStyle Hidden -PassThru

Write-Host ""
Write-Host "=== ALL SERVICES STARTED ===" -ForegroundColor Green
Write-Host "Auth Server : http://localhost:3001" -ForegroundColor Cyan
Write-Host "Web Game    : http://localhost:3000" -ForegroundColor Cyan
Write-Host "Web Landing : http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Magenta
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Stop-Process -Id $authJob.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $gameJob.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $landingJob.Id -Force -ErrorAction SilentlyContinue
Write-Host "All services stopped." -ForegroundColor Red

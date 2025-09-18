# Track-Futura Deployment Script for Upsun (PowerShell)
Write-Host "🚀 Starting Track-Futura deployment to Upsun..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if upsun CLI is available
try {
    $upsunVersion = upsun --version 2>$null
    Write-Host "✅ Upsun CLI found: $upsunVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Upsun CLI is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install it first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://github.com/platformsh/cli/releases" -ForegroundColor Yellow
    Write-Host "2. Or use: curl -fsS https://cli.upsun.com/installer | php" -ForegroundColor Yellow
    Write-Host "3. Add upsun.phar to your PATH or place it in this directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Build frontend
Write-Host "📦 Building frontend..." -ForegroundColor Blue
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host "✅ Frontend built successfully" -ForegroundColor Green

# Check backend
Write-Host "🐍 Checking backend..." -ForegroundColor Blue
Set-Location backend
python manage.py check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend check failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

Write-Host "✅ Backend check passed" -ForegroundColor Green

# Deploy to Upsun
Write-Host "🚀 Deploying to Upsun..." -ForegroundColor Blue
upsun push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host "🌐 Your application should be available at: https://trackfutura.futureobjects.io" -ForegroundColor Cyan
Read-Host "Press Enter to exit"

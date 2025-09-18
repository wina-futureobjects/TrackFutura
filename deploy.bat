@echo off
echo 🚀 Starting Track-Futura deployment to Upsun...
echo ================================================

REM Check if upsun CLI is available
upsun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Upsun CLI is not installed or not in PATH
    echo Please install it first:
    echo 1. Download from: https://github.com/platformsh/cli/releases
    echo 2. Or use: curl -fsS https://cli.upsun.com/installer | php
    echo 3. Add upsun.phar to your PATH or place it in this directory
    pause
    exit /b 1
)

echo ✅ Upsun CLI found

REM Build frontend
echo 📦 Building frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)
cd ..

echo ✅ Frontend built successfully

REM Check backend
echo 🐍 Checking backend...
cd backend
python manage.py check
if %errorlevel% neq 0 (
    echo ❌ Backend check failed
    pause
    exit /b 1
)
cd ..

echo ✅ Backend check passed

REM Deploy to Upsun
echo 🚀 Deploying to Upsun...
upsun push

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo ✅ Deployment completed!
echo 🌐 Your application should be available at: https://trackfutura.futureobjects.io
pause

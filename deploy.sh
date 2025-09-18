#!/bin/bash

# Track-Futura Deployment Script for Upsun
echo "🚀 Starting Track-Futura deployment to Upsun..."

# Check if upsun CLI is installed
if ! command -v upsun &> /dev/null; then
    echo "❌ Upsun CLI is not installed. Please install it first:"
    echo "   curl -fsS https://cli.upsun.com/installer | php"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f ".upsun/config.yaml" ]; then
    echo "❌ .upsun/config.yaml not found. Please run this script from the project root."
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Check if backend dependencies are installed
echo "📦 Checking backend dependencies..."
cd backend
if [ ! -d "venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    python -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate 2>/dev/null || venv\Scripts\activate 2>/dev/null
pip install -r requirements.txt

# Run Django checks
echo "🔍 Running Django checks..."
python manage.py check --deploy

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

cd ..

# Deploy to Upsun
echo "🚀 Deploying to Upsun..."
upsun push

echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: https://trackfutura.futureobjects.io"

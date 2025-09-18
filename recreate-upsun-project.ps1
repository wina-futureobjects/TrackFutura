# 🚀 Recreate Upsun Project Script
# Run this if you need to completely recreate your Upsun project

Write-Host "🔧 TrackFutura Upsun Project Recreation Guide" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`n📋 What this script will guide you through:" -ForegroundColor Yellow
Write-Host "1. Check your current repository status"
Write-Host "2. Provide steps to recreate Upsun project"
Write-Host "3. Set up environment variables"
Write-Host "4. Deploy your application"

Write-Host "`n🔍 Checking current repository..." -ForegroundColor Blue
git status

Write-Host "`n📂 Repository Information:" -ForegroundColor Green
Write-Host "Current remotes:"
git remote -v

Write-Host "`n🌐 Manual Steps for Upsun:" -ForegroundColor Magenta
Write-Host "1. Go to: https://console.upsun.com/"
Write-Host "2. Click 'Create Project'"
Write-Host "3. Connect GitHub repository: wina-futureobjects/Track-Futura"
Write-Host "4. Select 'main' branch"
Write-Host "5. Framework: Multi-app (Django + React)"

Write-Host "`n🔐 Environment Variables to Set:" -ForegroundColor Red
Write-Host "OPENAI_API_KEY=your-actual-openai-key"
Write-Host "APIFY_TOKEN=your-actual-apify-token"
Write-Host "APIFY_USER_ID=your-actual-apify-user-id"
Write-Host "BRIGHTDATA_BASE_URL=https://trackfutura.futureobjects.io"
Write-Host "BRIGHTDATA_WEBHOOK_TOKEN=your-webhook-token"

Write-Host "`n📁 Sample Data Information:" -ForegroundColor Cyan
if (Test-Path "backend/fixtures/sample_data_export.json") {
    Write-Host "✅ Sample data found: backend/fixtures/sample_data_export.json"
    $dataSize = (Get-Item "backend/fixtures/sample_data_export.json").Length
    Write-Host "📊 Data size: $([math]::Round($dataSize/1KB, 2)) KB"
} else {
    Write-Host "❌ Sample data not found!"
}

Write-Host "`n🎯 Expected Deployment Results:" -ForegroundColor Green
Write-Host "- Django backend with PostgreSQL"
Write-Host "- React frontend with Vite"
Write-Host "- Auto-seeded database with your sample data"
Write-Host "- Same dashboard and AI features as localhost"

Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Follow the manual steps above to create the project"
Write-Host "2. Set the environment variables"
Write-Host "3. Deploy and monitor the logs"
Write-Host "4. Your app should show the same content as localhost!"

Write-Host "`n✨ All your data is ready for deployment!" -ForegroundColor Green
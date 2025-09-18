# 🚀 Manual Upsun Deployment Recovery Guide

## Issue: GitHub Integration Deleted Master Environment

### Quick Fix Steps:

#### 1. **Access Upsun Console**
- Go to: https://console.upsun.com/
- Login with your credentials
- Look for project: `inhoolfrqniuu`

#### 2. **If Project Exists but No Environments:**
- Click on your project
- Go to "Environments" tab
- Click "Create Environment" or "Deploy"
- Select `main` branch
- Wait for deployment

#### 3. **If Project Doesn't Exist:**
- Click "Create Project"
- Connect to GitHub repository: `wina-futureobjects/Track-Futura`
- Use these settings:
  - **Framework**: Django/Python + React/Node.js
  - **Build Command**: (will use .upsun/config.yaml automatically)
  - **Deploy Branch**: main

#### 4. **Environment Variables to Set:**
Go to Settings → Variables and add:
```
OPENAI_API_KEY=your-actual-openai-key
APIFY_TOKEN=your-actual-apify-token
APIFY_USER_ID=your-actual-apify-user-id
BRIGHTDATA_BASE_URL=https://trackfutura.futureobjects.io
BRIGHTDATA_WEBHOOK_TOKEN=your-webhook-token
```

#### 5. **Force Deployment:**
- Go to Environments
- Click "Redeploy" or "Deploy"
- Monitor deployment logs

### Expected Result:
- Backend will run on PostgreSQL
- Database will auto-seed with your sample data
- Frontend will be built and served
- Same content as localhost should appear

### If You Need to Recreate Project Completely:
1. Create new Upsun project
2. Connect to GitHub: `wina-futureobjects/Track-Futura`
3. Set environment variables above
4. Deploy from `main` branch

Your sample data and configurations are all in the repository now, so it should work automatically once the project is connected properly.
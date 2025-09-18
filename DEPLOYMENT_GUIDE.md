# Track-Futura Upsun Deployment Guide

This guide will help you deploy your Track-Futura project to Upsun without changing any flow, UI, or internal structure.

## Prerequisites

1. **Upsun CLI installed**: Download from [Upsun CLI](https://cli.upsun.com/)
2. **SSH Key added to Upsun**: Your SSH key should be added to your Upsun account
3. **Project ID**: `inhoolfrqniuu`
4. **Domain**: `trackfutura.futureobjects.io`

## Project Structure

```
TrackFutura-main/
├── .upsun/
│   └── config.yaml          # Upsun configuration
├── backend/                 # Django backend
│   ├── config/
│   │   ├── settings.py      # Main settings
│   │   └── settings_production.py  # Production settings
│   ├── requirements.txt     # Python dependencies
│   └── manage.py
├── frontend/               # React frontend
│   ├── package.json
│   ├── dist/              # Built frontend (generated)
│   └── src/
└── deploy.sh              # Deployment script
```

## Configuration Files Created

### 1. `.upsun/config.yaml`
- Configures both backend (Python/Django) and frontend (Node.js/React) applications
- Sets up PostgreSQL database service
- Configures environment variables
- Defines build and deployment hooks

### 2. `backend/config/settings_production.py`
- Production-specific Django settings
- Security configurations for production
- Database configuration for Upsun
- Static files handling
- CORS and CSRF settings

### 3. `deploy.sh`
- Automated deployment script
- Builds frontend
- Checks backend dependencies
- Runs Django checks
- Deploys to Upsun

## Deployment Steps

### Step 1: Install Upsun CLI
```bash
curl -fsS https://cli.upsun.com/installer | php
```

### Step 2: Login to Upsun
```bash
upsun auth:login
```

### Step 3: Initialize Project (if not already done)
```bash
upsun project:init
```

### Step 4: Deploy
You can either use the automated script or deploy manually:

#### Option A: Automated Deployment
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual Deployment
```bash
# Build frontend
cd frontend
npm install
npm run build
cd ..

# Deploy to Upsun
upsun push
```

## Environment Variables

The following environment variables are configured in `.upsun/config.yaml`:

- `BRIGHTDATA_BASE_URL`: https://trackfutura.futureobjects.io
- `BRIGHTDATA_WEBHOOK_TOKEN`: your-webhook-secret-token
- `OPENAI_API_KEY`: [Your OpenAI API key]

## Database Configuration

- **Service**: PostgreSQL 15
- **Disk**: 1024 MB
- **Extensions**: uuid-ossp, pg_trgm, unaccent
- **Connection**: Automatically configured via `DATABASE_URL`

## Static Files

- **Backend**: Served via WhiteNoise from `/app/backend/staticfiles`
- **Frontend**: Served via `serve` package from `/app/frontend/dist`

## Health Checks

- **Backend**: `https://your-app.upsun.app/api/health/`
- **Frontend**: Served on the same domain

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   upsun logs --type=build
   ```

2. **Runtime Errors**
   ```bash
   upsun logs --type=app
   ```

3. **Database Issues**
   ```bash
   upsun ssh
   python manage.py migrate
   ```

4. **Static Files Not Loading**
   ```bash
   upsun ssh
   python manage.py collectstatic --noinput
   ```

### Useful Commands

```bash
# View all logs
upsun logs

# SSH into application
upsun ssh

# Check application status
upsun status

# View environment variables
upsun variable:list

# Restart application
upsun redeploy
```

## Security Features

The production configuration includes:

- HTTPS enforcement
- Secure session cookies
- CSRF protection
- CORS configuration
- Security headers (HSTS, X-Content-Type-Options, etc.)
- Database connection security

## Monitoring

- Health check endpoint: `/api/health/`
- Application logs available via `upsun logs`
- Database monitoring through Upsun dashboard

## Custom Domain Setup

1. Add `trackfutura.futureobjects.io` in Upsun console
2. Update DNS records to point to Upsun
3. SSL certificate will be automatically provisioned

## Post-Deployment

After successful deployment:

1. Verify the application is accessible at your domain
2. Test all API endpoints
3. Check database connectivity
4. Verify static files are loading
5. Test webhook functionality (if applicable)

## Support

If you encounter issues:

1. Check the logs: `upsun logs`
2. Verify configuration: `upsun config:dump`
3. Test locally with production settings
4. Contact Upsun support if needed

## Notes

- The deployment preserves all existing functionality
- No changes to UI or business logic
- All existing data and configurations are maintained
- The application will be accessible at `https://trackfutura.futureobjects.io`

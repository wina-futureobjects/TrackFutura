# Track-Futura Webhook System Deployment Guide

This guide covers deploying the enhanced webhook system for BrightData integration across different platforms with professional-grade security and monitoring.

## System Overview

The webhook system includes:
- **Enterprise Security**: HMAC signature verification, timestamp validation, rate limiting, IP whitelisting
- **Comprehensive Monitoring**: Real-time metrics, health monitoring, alerting, analytics
- **Professional Dashboard**: React-based monitoring UI with Material-UI and Framer Motion
- **Auto-deployment**: Platform detection (Upsun, Platform.sh, Railway, Heroku)
- **Development Tools**: Ngrok integration for local testing

## Environment Variables

### Required Configuration
```bash
# Webhook Security
BRIGHTDATA_WEBHOOK_TOKEN=your-secure-webhook-token
BRIGHTDATA_BASE_URL=https://your-domain.com  # Auto-detected on most platforms

# Optional Security Settings
WEBHOOK_RATE_LIMIT=100                    # Requests per minute
WEBHOOK_MAX_TIMESTAMP_AGE=300             # 5 minutes in seconds
WEBHOOK_ALLOWED_IPS=1.2.3.4,10.0.0.0/8  # Comma-separated IPs/CIDRs
WEBHOOK_ENABLE_CERT_PINNING=false        # Enable certificate pinning

# Monitoring Configuration
WEBHOOK_MAX_EVENTS=1000                   # Maximum events to store
WEBHOOK_METRICS_RETENTION=3600            # Metrics retention in seconds
WEBHOOK_ERROR_THRESHOLD=0.1               # 10% error rate threshold
WEBHOOK_RESPONSE_TIME_THRESHOLD=5.0       # 5 second response time threshold
```

### Development Configuration
```bash
# Ngrok Integration (Development Only)
NGROK_ENABLED=true
NGROK_AUTH_TOKEN=your-ngrok-auth-token    # For custom subdomains
NGROK_SUBDOMAIN=your-subdomain           # Custom subdomain
NGROK_REGION=us                          # us, eu, ap, au, sa, jp, in
```

## Platform-Specific Deployment

### 1. Upsun Deployment

The system automatically detects Upsun environments and configures webhook URLs.

#### Upsun Configuration (`.upsun/config.yaml`)
```yaml
applications:
  app:
    type: python:3.11
    dependencies:
      python3:
        django: "^4.2"
        djangorestframework: "^3.14"
        cryptography: "^41.0"
        # ... other dependencies

    web:
      commands:
        start: "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT"

    variables:
      env:
        BRIGHTDATA_WEBHOOK_TOKEN: "your-token"
        WEBHOOK_RATE_LIMIT: "500"
        WEBHOOK_ALLOWED_IPS: "brightdata-ip-range"

routes:
  "https://main-{default}":
    type: upstream
    upstream: "app:http"
    primary: true
```

#### Deploy to Upsun
```bash
# Initial setup
upsun project:create track-futura
upsun environment:push

# Set environment variables
upsun variable:create --level environment --name BRIGHTDATA_WEBHOOK_TOKEN --value "your-token"

# Deploy
git push upsun main
```

### 2. Platform.sh Deployment

Similar to Upsun but uses Platform.sh specific environment variables.

#### Platform.sh Configuration (`.platform.app.yaml`)
```yaml
name: app
type: python:3.11

dependencies:
  python3:
    django: "^4.2"
    djangorestframework: "^3.14"
    cryptography: "^41.0"

web:
  commands:
    start: "gunicorn config.wsgi:application --bind 0.0.0.0:$PORT"

variables:
  env:
    BRIGHTDATA_WEBHOOK_TOKEN: "your-secure-webhook-token"
    WEBHOOK_RATE_LIMIT: "500"
```

### 3. Railway Deployment

#### Railway Configuration (`railway.toml`)
```toml
[build]
builder = "NIXPACKS"

[deploy]
healthcheckPath = "/api/health/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"

[env]
BRIGHTDATA_WEBHOOK_TOKEN = "your-secure-webhook-token"
WEBHOOK_RATE_LIMIT = "500"
```

### 4. Heroku Deployment

#### Heroku Configuration
```bash
# Create app
heroku create track-futura-webhook

# Set environment variables
heroku config:set BRIGHTDATA_WEBHOOK_TOKEN=your-secure-webhook-token
heroku config:set WEBHOOK_RATE_LIMIT=500

# Deploy
git push heroku main
```

### 5. Docker Deployment

#### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - BRIGHTDATA_WEBHOOK_TOKEN=your-secure-webhook-token
      - WEBHOOK_RATE_LIMIT=500
    volumes:
      - ./data:/app/data
```

## Local Development with Ngrok

### 1. Install Ngrok
```bash
# macOS
brew install ngrok

# Windows
choco install ngrok

# Linux
snap install ngrok

# Or download from https://ngrok.com/download
```

### 2. Start Development Environment
```bash
# Terminal 1: Start Django
cd backend
python manage.py runserver

# Terminal 2: Start ngrok
python manage.py start_ngrok --port 8000

# Or with custom subdomain (requires auth token)
python manage.py start_ngrok --port 8000 --subdomain myapp-webhook
```

### 3. Test Webhook
```bash
# Test basic connectivity
python manage.py test_brightdata_setup --test-webhook

# Check ngrok status
python manage.py start_ngrok --status

# Kill ngrok processes
python manage.py start_ngrok --kill
```

## BrightData API Configuration

### API Request Parameters
```javascript
const apiParams = {
  "dataset_id": "your_dataset_id",
  "endpoint": "https://your-domain.com/api/brightdata/webhook/",
  "auth_header": "Bearer your-secure-webhook-token",
  "notify": "https://your-domain.com/api/brightdata/notify/",
  "format": "json",
  "uncompressed_webhook": "true",
  "include_errors": "true"
};

// Example API call
const response = await fetch("https://api.brightdata.com/datasets/v3/trigger", {
  method: "POST",
  headers: {
    "Authorization": "Bearer your-brightdata-api-token",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(apiParams)
});
```

## Monitoring and Alerting

### 1. Access Monitoring Dashboard
Visit `https://your-domain.com/webhook-monitor` to access the professional monitoring dashboard.

### 2. API Endpoints
- `GET /api/brightdata/webhook/metrics/` - Current performance metrics
- `GET /api/brightdata/webhook/health/` - Health status and diagnostics
- `GET /api/brightdata/webhook/events/` - Recent webhook events
- `GET /api/brightdata/webhook/alerts/` - Active alerts
- `GET /api/brightdata/webhook/analytics/` - Detailed analytics
- `POST /api/brightdata/webhook/test/` - Security testing

### 3. Health Monitoring
```bash
# Check webhook health
curl -H "Authorization: Bearer your-token" \
     https://your-domain.com/api/brightdata/webhook/health/

# Get performance metrics
curl -H "Authorization: Bearer your-token" \
     https://your-domain.com/api/brightdata/webhook/metrics/
```

## Security Best Practices

### 1. Token Management
- Use strong, randomly generated webhook tokens
- Rotate tokens regularly
- Store tokens securely (environment variables, not code)
- Use different tokens for different environments

### 2. Network Security
- Enable IP whitelisting for production
- Use HTTPS only
- Consider certificate pinning for high-security environments
- Monitor for unusual traffic patterns

### 3. Rate Limiting
- Configure appropriate rate limits based on expected traffic
- Monitor rate limit violations
- Implement backoff strategies for failed requests

### 4. Monitoring
- Set up alerts for error rate thresholds
- Monitor response time trends
- Track security events
- Regular security testing

## Troubleshooting

### Common Issues

#### 1. Webhook URL Not Accessible
```bash
# Check if service is running
curl -I https://your-domain.com/api/brightdata/webhook/

# Test from external service
curl -X POST https://your-domain.com/api/brightdata/webhook/ \
     -H "Authorization: Bearer your-token" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
```

#### 2. Authentication Failures
```bash
# Verify token
python manage.py shell -c "from django.conf import settings; print(settings.BRIGHTDATA_WEBHOOK_TOKEN)"

# Test authentication
python manage.py test_brightdata_setup --test-webhook
```

#### 3. High Error Rates
- Check logs for specific error messages
- Verify payload format matches expected schema
- Check rate limiting settings
- Verify IP whitelist configuration

#### 4. Performance Issues
- Monitor response times in dashboard
- Check server resources (CPU, memory)
- Optimize database queries if needed
- Consider scaling infrastructure

### Logs and Debugging

#### Application Logs
```bash
# View webhook-specific logs
tail -f logs/webhook_security.log
tail -f logs/webhook_monitor.log

# Django debug mode (development only)
export DEBUG=True
```

#### Monitoring Data
```bash
# Export events for analysis
curl -H "Authorization: Bearer your-token" \
     "https://your-domain.com/api/brightdata/webhook/export-events/?format=csv" \
     > webhook_events.csv
```

## Performance Optimization

### 1. Database Optimization
- Use appropriate database indexes
- Implement connection pooling
- Consider read replicas for high-traffic scenarios

### 2. Caching
- Redis for production caching
- In-memory caching for development
- Cache webhook metrics and analytics

### 3. Load Balancing
- Use multiple application instances
- Implement health checks
- Configure proper load balancer timeouts

### 4. Monitoring
- Set up application performance monitoring (APM)
- Monitor database performance
- Track webhook processing times

## Maintenance

### Regular Tasks
- Monitor error rates and response times
- Review security logs
- Update webhook tokens periodically
- Test backup and recovery procedures
- Update dependencies regularly

### Security Audits
- Review access logs
- Test security controls
- Verify encryption in transit
- Check for security vulnerabilities

This deployment guide ensures a robust, secure, and professionally monitored webhook system suitable for enterprise-grade BrightData integration.

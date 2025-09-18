# BrightData Webhook Integration Setup

This document explains how to configure BrightData webhooks for automated data collection.

## Overview

The system now supports two webhook endpoints for BrightData integration:

1. **Webhook Endpoint** (`/api/brightdata/webhook/`) - Receives scraped data
2. **Notify Endpoint** (`/api/brightdata/notify/`) - Receives status updates

## Configuration

### 1. Environment Variables

Set these environment variables (or update `settings.py`):

```bash
# Your server's base URL (change for production)
export BRIGHTDATA_BASE_URL="http://localhost:8000"

# Secret token for webhook authentication (change this!)
export BRIGHTDATA_WEBHOOK_TOKEN="your-secure-webhook-token-here"
```

### 2. BrightData API Configuration

When making requests to BrightData API, include these parameters:

```python
params = {
    "dataset_id": "your_dataset_id",
    "endpoint": "http://localhost:8000/api/brightdata/webhook/",
    "auth_header": "Bearer your-secure-webhook-token-here",
    "notify": "http://localhost:8000/api/brightdata/notify/",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}
```

## Webhook Endpoints

### Webhook Endpoint
- **URL**: `/api/brightdata/webhook/`
- **Method**: POST
- **Purpose**: Receives scraped data from BrightData
- **Authentication**: Bearer token in Authorization header

### Notify Endpoint
- **URL**: `/api/brightdata/notify/`
- **Method**: POST  
- **Purpose**: Receives status updates and notifications
- **Authentication**: Bearer token in Authorization header

## Testing

Test your webhook configuration:

```bash
# Show current configuration
python manage.py test_brightdata_setup

# Test webhook endpoint
python manage.py test_brightdata_setup --test-webhook
```

## Complete API Example

```python
import requests

url = "https://api.brightdata.com/datasets/v3/trigger"
headers = {
    "Authorization": "Bearer YOUR_BRIGHTDATA_API_TOKEN",
    "Content-Type": "application/json",
}
params = {
    "dataset_id": "gd_lyclm3ey2q6rww027t",  # Your dataset ID
    "endpoint": "http://localhost:8000/api/brightdata/webhook/",
    "auth_header": "Bearer your-secure-webhook-token-here",
    "notify": "http://localhost:8000/api/brightdata/notify/",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}
data = [
    {
        "url": "https://www.facebook.com/100064031470013/reels/",
        "num_of_posts": 1,
        "start_date": "",
        "end_date": ""
    },
]

response = requests.post(url, headers=headers, params=params, json=data)
print(response.json())
```

## Security Notes

1. **Change the default webhook token** in production
2. **Use HTTPS** for production webhook URLs
3. **Validate webhook signatures** if BrightData provides them
4. **Rate limit** webhook endpoints if needed

## Data Processing

The webhook automatically:

1. **Authenticates** incoming requests
2. **Processes** data based on platform (Facebook, Instagram, LinkedIn, TikTok)
3. **Stores** data in appropriate models
4. **Updates** scraper request status
5. **Creates** folder associations if configured

## Troubleshooting

- Check Django logs for webhook processing errors
- Verify webhook token matches between BrightData and Django
- Ensure your server is accessible from BrightData's servers
- Test endpoints manually using the management command 
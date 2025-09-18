# Webhook Fix Guide for Track Futura

## 🚨 Current Issue
Completed scrape jobs on BrightData are not being passed back to Track Futura because:
- BrightData cannot reach `localhost:8000` from the internet
- Webhook endpoints are not accessible from external sources
- Job status updates are not being received

## 🔧 Solution Overview

### Step 1: Set Up a Public URL

You have several options to make your local server accessible to BrightData:

#### Option A: Use ngrok (Recommended for Development)

1. **Install ngrok** (if not already installed):
   ```bash
   # Windows
   winget install Ngrok.Ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Sign up for a free ngrok account** at https://ngrok.com to get an auth token

3. **Start ngrok**:
   ```bash
   ngrok http 8000
   ```

4. **Copy the HTTPS URL** provided by ngrok (e.g., `https://abc123.ngrok.io`)

#### Option B: Use Local Network IP (if on same network)

1. **Find your local IP address**:
   ```bash
   # Windows
   ipconfig
   
   # Look for IPv4 Address (e.g., 192.168.1.100)
   ```

2. **Use your local IP** instead of localhost

#### Option C: Deploy to Cloud (Production)

Deploy your application to a cloud service like:
- Railway
- Heroku
- Vercel
- Platform.sh

### Step 2: Configure the Webhook URL

Once you have a public URL, set it as an environment variable:

#### Windows:
```cmd
set BRIGHTDATA_BASE_URL=https://your-url.ngrok.io
```

#### Linux/Mac:
```bash
export BRIGHTDATA_BASE_URL=https://your-url.ngrok.io
```

#### Permanent Setup (Windows):
```cmd
setx BRIGHTDATA_BASE_URL "https://your-url.ngrok.io"
```

### Step 3: Verify Configuration

Run the webhook setup script:
```bash
python setup_webhook.py
```

### Step 4: Test Webhook Endpoints

Test that the webhook endpoints are accessible:
```bash
python manage.py test_webhook_setup
```

## 🔍 Verification Steps

### 1. Check Current Webhook Configuration
```bash
python manage.py shell -c "from django.conf import settings; print(f'Webhook URL: {settings.BRIGHTDATA_BASE_URL}/api/brightdata/webhook/')"
```

### 2. Test Webhook Accessibility
```bash
# Test from another machine or using curl
curl -X POST https://your-url.ngrok.io/api/brightdata/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 3. Check BrightData Configurations
```bash
python manage.py validate_platform_configs
```

## 🛠️ Manual Webhook Testing

If you want to test the webhook manually:

### 1. Create a Test Webhook Payload
```json
{
  "snapshot_id": "test_snapshot_123",
  "status": "completed",
  "message": "Test webhook",
  "data": {
    "posts": [
      {
        "id": "test_post_1",
        "content": "Test content",
        "url": "https://example.com/test"
      }
    ]
  }
}
```

### 2. Send Test Webhook
```bash
curl -X POST https://your-url.ngrok.io/api/brightdata/webhook/ \
  -H "Content-Type: application/json" \
  -H "X-Snapshot-Id: test_snapshot_123" \
  -d @test_payload.json
```

## 🔄 Workflow Status Update Process

Once webhooks are working, here's how the status updates flow:

1. **Job Created**: Scraping job is created in Track Futura
2. **Sent to BrightData**: Job is sent to BrightData with webhook URL
3. **BrightData Processing**: BrightData processes the scraping job
4. **Webhook Sent**: BrightData sends webhook to Track Futura when complete
5. **Status Updated**: Track Futura updates job status based on webhook
6. **UI Updated**: Frontend shows updated status in History tab

## 🚨 Troubleshooting

### Issue: Webhook not reaching Track Futura
**Symptoms**: Jobs stuck in "processing" status, no webhook logs
**Solutions**:
1. Verify public URL is accessible from internet
2. Check firewall settings
3. Ensure ngrok is running (if using ngrok)
4. Verify webhook URL in BrightData configuration

### Issue: Webhook received but status not updated
**Symptoms**: Webhook logs show successful reception but job status unchanged
**Solutions**:
1. Check webhook handler logs
2. Verify snapshot_id matching
3. Check database connection
4. Review webhook payload format

### Issue: Empty data folders
**Symptoms**: Jobs marked as completed but no data in folders
**Solutions**:
1. Check BrightData dataset configuration
2. Verify API tokens are valid
3. Review scraping parameters
4. Check BrightData dashboard for actual data

## 📋 Checklist

- [ ] Public URL is accessible from internet
- [ ] `BRIGHTDATA_BASE_URL` environment variable is set
- [ ] Webhook endpoints return 405 (Method Not Allowed) for GET requests
- [ ] BrightData configurations are valid
- [ ] API tokens are set for all platforms
- [ ] Test webhook can be sent and received
- [ ] Job status updates work correctly
- [ ] Data folders are populated after completion

## 🎯 Expected Results

After implementing this fix:

1. **Webhook Reception**: BrightData webhooks will reach Track Futura
2. **Status Updates**: Job status will update from "processing" to "completed"
3. **History Tab**: Workflow management history will show correct status
4. **Data Storage**: Folders will contain scraped data
5. **Real-time Updates**: Status changes will be reflected immediately

## 🔗 Additional Resources

- [ngrok Documentation](https://ngrok.com/docs)
- [BrightData Webhook Documentation](https://brightdata.com/docs)
- [Django Webhook Best Practices](https://docs.djangoproject.com/en/stable/topics/http/views/)

## 📞 Support

If you continue to experience issues after following this guide:

1. Check the Django logs for webhook errors
2. Verify BrightData dashboard shows completed jobs
3. Test webhook endpoints manually
4. Review network connectivity and firewall settings 
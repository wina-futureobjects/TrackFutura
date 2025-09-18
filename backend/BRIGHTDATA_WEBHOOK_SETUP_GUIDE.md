# 🔧 BrightData Webhook Setup Guide

## 🎯 **CRITICAL ISSUE IDENTIFIED**

**Problem**: BrightData datasets are not configured to use webhooks for data delivery.  
**Solution**: Configure each dataset in BrightData to send data back via webhooks.

---

## 📋 **Step-by-Step BrightData Configuration**

### **Step 1: Access BrightData Dashboard**

1. **Log into BrightData Dashboard**: https://brightdata.com/dashboard
2. **Navigate to Datasets**: Go to your datasets section
3. **Identify Your Datasets**: Find the datasets you're using for scraping

### **Step 2: Configure Each Dataset**

For each dataset (Instagram, Facebook, LinkedIn, TikTok), you need to configure webhook settings:

#### **Dataset Configuration Parameters**

```json
{
  "endpoint": "http://192.168.0.17:8000/api/brightdata/webhook/",
  "auth_header": "Bearer your-default-webhook-secret-token-change-this",
  "notify": "http://192.168.0.17:8000/api/brightdata/notify/",
  "format": "json",
  "uncompressed_webhook": true,
  "include_errors": true
}
```

#### **Configuration Steps**

1. **Open Dataset Settings**
   - Click on your dataset (e.g., "Instagram Posts")
   - Go to "Settings" or "Configuration"

2. **Enable Webhooks**
   - Find "Webhook Configuration" or "Data Delivery"
   - Enable "Webhook Delivery"
   - Set "Delivery Method" to "Webhook"

3. **Configure Webhook URL**
   - **Webhook URL**: `http://192.168.0.17:8000/api/brightdata/webhook/`
   - **Notify URL**: `http://192.168.0.17:8000/api/brightdata/notify/`
   - **Auth Token**: `your-default-webhook-secret-token-change-this`

4. **Set Data Format**
   - **Format**: JSON
   - **Compression**: Disabled (uncompressed_webhook: true)
   - **Include Errors**: Enabled

### **Step 3: Verify Configuration**

After configuring each dataset:

1. **Test Webhook**: Use BrightData's webhook testing feature
2. **Check Status**: Ensure webhook is "Active" or "Enabled"
3. **Verify URL**: Confirm the webhook URL is correct

---

## 🔧 **Track Futura Configuration**

### **Environment Variables**

Make sure these are set in your environment:

```bash
# Windows
set BRIGHTDATA_BASE_URL=http://192.168.0.17:8000
set BRIGHTDATA_WEBHOOK_TOKEN=your-default-webhook-secret-token-change-this

# Linux/Mac
export BRIGHTDATA_BASE_URL=http://192.168.0.17:8000
export BRIGHTDATA_WEBHOOK_TOKEN=your-default-webhook-secret-token-change-this
```

### **Django Server**

Ensure Django server is running on all interfaces:

```bash
python manage.py runserver 0.0.0.0:8000
```

---

## 📊 **Dataset-Specific Configuration**

### **Instagram Dataset**
- **Dataset ID**: Your Instagram dataset ID
- **Content Type**: Posts, Reels, Comments
- **Webhook URL**: `http://192.168.0.17:8000/api/brightdata/webhook/`

### **Facebook Dataset**
- **Dataset ID**: Your Facebook dataset ID
- **Content Type**: Posts, Comments
- **Webhook URL**: `http://192.168.0.17:8000/api/brightdata/webhook/`

### **LinkedIn Dataset**
- **Dataset ID**: Your LinkedIn dataset ID
- **Content Type**: Posts, Comments
- **Webhook URL**: `http://192.168.0.17:8000/api/brightdata/webhook/`

### **TikTok Dataset**
- **Dataset ID**: Your TikTok dataset ID
- **Content Type**: Posts, Comments
- **Webhook URL**: `http://192.168.0.17:8000/api/brightdata/webhook/`

---

## 🔍 **Verification Steps**

### **1. Check BrightData Dashboard**

1. **Go to Dataset Settings**
2. **Verify Webhook Configuration**:
   - ✅ Webhook is enabled
   - ✅ URL is correct: `http://192.168.0.17:8000/api/brightdata/webhook/`
   - ✅ Auth token is set
   - ✅ Format is JSON

### **2. Test Webhook Reception**

```bash
# Check if webhook endpoint is accessible
curl -X POST http://192.168.0.17:8000/api/brightdata/webhook/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-default-webhook-secret-token-change-this" \
  -d '{"test": "data"}'
```

### **3. Monitor Django Logs**

Watch for webhook reception messages:

```bash
# Look for messages like:
# "Received webhook data for snapshot_id: ..."
# "Processing webhook data for platform: ..."
```

### **4. Check Job Status**

```bash
# Monitor job status changes
python manage.py shell -c "from brightdata_integration.models import ScraperRequest; print([f'{r.id}: {r.status}' for r in ScraperRequest.objects.all()[:5]])"
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Webhook Not Enabled**
**Problem**: Dataset is not configured to use webhooks
**Solution**: Enable webhook delivery in dataset settings

### **Issue 2: Wrong Webhook URL**
**Problem**: Webhook URL is incorrect
**Solution**: Update to `http://192.168.0.17:8000/api/brightdata/webhook/`

### **Issue 3: Auth Token Mismatch**
**Problem**: Auth token doesn't match
**Solution**: Ensure token matches in both BrightData and Track Futura

### **Issue 4: Network Accessibility**
**Problem**: BrightData can't reach your server
**Solution**: Ensure Django server is running on `0.0.0.0:8000`

---

## 📞 **Success Indicators**

You'll know the configuration is working when:

1. **BrightData Dashboard**: Shows webhook as "Active"
2. **Django Logs**: Show webhook reception messages
3. **Job Status**: Progress from "pending" → "processing" → "completed"
4. **Data Population**: Posts appear in folders
5. **History Tab**: Shows real-time status updates

---

## 🎯 **Expected Timeline**

- **Immediate**: Webhooks should start reaching Track Futura
- **Within minutes**: Job status should update from "pending" to "processing"
- **Within 5-10 minutes**: Jobs should complete and data should populate folders

---

## 🔧 **Quick Fix Commands**

### **Set Environment Variables**
```bash
# Windows
setx BRIGHTDATA_BASE_URL "http://192.168.0.17:8000"
setx BRIGHTDATA_WEBHOOK_TOKEN "your-default-webhook-secret-token-change-this"

# Linux/Mac
export BRIGHTDATA_BASE_URL="http://192.168.0.17:8000"
export BRIGHTDATA_WEBHOOK_TOKEN="your-default-webhook-secret-token-change-this"
```

### **Restart Django Server**
```bash
python manage.py runserver 0.0.0.0:8000
```

### **Test Webhook Setup**
```bash
python manage.py test_webhook_setup
```

---

## 🎉 **Conclusion**

The key issue is that **BrightData datasets need to be configured to use webhooks for data delivery**. Once you configure each dataset in the BrightData dashboard to use webhooks, the data will start flowing back to Track Futura automatically.

**Next Steps**:
1. Configure each dataset in BrightData dashboard
2. Enable webhook delivery
3. Set the correct webhook URL
4. Test and verify webhook reception
5. Monitor data population in folders 
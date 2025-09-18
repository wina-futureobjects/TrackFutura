# BrightData Notify URL Integration Fix

## Summary

Fixed the TrackFutura backend to properly include the `notify` parameter in all BrightData API calls, matching the structure shown in the user's curl command.

## Problem Identified

The user's curl command correctly included **both** webhook URLs:
- `endpoint=https%3A%2F%2Fefa3f729c247.ngrok-free.app%2Fapi%2Fbrightdata%2Fwebhook%2F` (data delivery)
- `notify=https%3A%2F%2Fefa3f729c247.ngrok-free.app%2Fapi%2Fbrightdata%2Fnotify%2F` (job status)

However, the TrackFutura backend scripts were **missing the `notify` parameter** in most API calls.

## Files Fixed

### 1. `backend/brightdata_integration/views.py`

**Fixed 4 methods in ScraperRequestViewSet:**
- `trigger_facebook_scrape()` - Added `notify` parameter
- `trigger_instagram_scrape()` - Added `notify` parameter  
- `trigger_linkedin_scrape()` - Added `notify` parameter
- `trigger_tiktok_scrape()` - Added `notify` parameter

**Changes made:**
```python
params = {
    "dataset_id": config.dataset_id,
    "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
    "notify": f"{webhook_base_url}/api/brightdata/notify/",  # ← ADDED
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}
```

### 2. `backend/brightdata_integration/services.py`

**Fixed 2 methods in AutomatedBatchScraper:**
- `_make_brightdata_request()` - Added `notify` parameter
- `_make_brightdata_batch_request()` - Added `notify` parameter

**Changes made:**
```python
params = {
    "dataset_id": config.dataset_id,
    "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
    "notify": f"{webhook_base_url}/api/brightdata/notify/",  # ← ADDED
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}
```

## Files Already Correct

The following files already had the `notify` parameter correctly implemented:
- `backend/facebook_data/services.py` - `FacebookCommentScraper._make_brightdata_request()`
- `backend/instagram_data/services.py` - `InstagramCommentScraper._make_brightdata_request()`

## Result

Now **ALL** BrightData API calls from TrackFutura will include both:
1. **Data delivery webhook** (`endpoint`) - Receives scraped posts/data
2. **Job status webhook** (`notify`) - Receives job execution updates

This matches the structure shown in the user's curl command and ensures proper webhook flow for both data delivery and job status notifications.

## Testing

- ✅ Django syntax check passed (`python manage.py check`)
- ✅ Both webhook endpoints are working (`/api/brightdata/webhook/` and `/api/brightdata/notify/`)
- ✅ All API calls now include the `notify` parameter

## Next Steps

The TrackFutura backend is now properly configured to receive both types of webhooks from BrightData:
1. **Data webhooks** → Process scraped content
2. **Status webhooks** → Update job statuses in the workflow system

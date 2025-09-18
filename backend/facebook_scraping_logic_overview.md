# Facebook Scraping Logic Overview

## 1. API Endpoint Entry Point

### Location: `brightdata_integration/views.py` - `ScraperRequestViewSet.trigger_facebook_scrape()`

```python
@action(detail=False, methods=['POST'])
def trigger_facebook_scrape(self, request):
    """Endpoint to trigger a Facebook scrape using Brightdata API"""
```

### Request Flow:
1. **Extract Parameters**:
   - `target_url` (required)
   - `content_type` (default: 'post')
   - `num_of_posts` (default: 10)
   - `posts_to_not_include` (default: [])
   - `start_date` (YYYY-MM-DD format)
   - `end_date` (YYYY-MM-DD format)
   - `folder_id` (optional)

2. **Platform Configuration**:
   - Determines platform key: `facebook_{content_type}s` (e.g., `facebook_posts`)
   - Finds active BrightData configuration for the platform

3. **Date Conversion**:
   - Converts database dates (YYYY-MM-DD) to API format (MM-DD-YYYY)
   - Validates date formats

4. **Create ScraperRequest Record**:
   ```python
   scraper_request = ScraperRequest.objects.create(
       config=config,
       platform=platform_config_key,
       content_type=content_type,
       target_url=target_url,
       num_of_posts=num_of_posts,
       posts_to_not_include=str(posts_to_not_include) if posts_to_not_include else None,
       start_date=db_start_date if db_start_date else None,
       end_date=db_end_date if db_end_date else None,
       folder_id=folder_id,
       request_payload=[{
           "url": target_url,
           "num_of_posts": num_of_posts,
           "posts_to_not_include": posts_to_not_include,
           "start_date": api_start_date,
           "end_date": api_end_date,
       }],
       status='pending'
   )
   ```

5. **Call Service Method**:
   ```python
   scraper_service = AutomatedBatchScraper()
   success = scraper_service._trigger_facebook_scrape(scraper_request)
   ```

## 2. Individual Facebook Scrape Logic

### Location: `brightdata_integration/services.py` - `_trigger_facebook_scrape()`

```python
def _trigger_facebook_scrape(self, scraper_request: ScraperRequest) -> bool:
    """Trigger Facebook scrape"""
    payload = [{
        "url": scraper_request.target_url,
        "num_of_posts": scraper_request.num_of_posts,
        "posts_to_not_include": [],
        "start_date": scraper_request.start_date.strftime('%m-%d-%Y') if scraper_request.start_date else "",
        "end_date": scraper_request.end_date.strftime('%m-%d-%Y') if scraper_request.end_date else "",
    }]
    return self._make_brightdata_request(scraper_request, payload)
```

### Key Features:
- ✅ **URL Mode**: Uses `"url": target_url` (Collect by URL mode)
- ✅ **Date Format**: Converts to MM-DD-YYYY format for BrightData API
- ✅ **Posts Count**: Includes `num_of_posts` parameter
- ✅ **Empty Arrays**: Uses `posts_to_not_include: []`

## 3. Batch Facebook Scrape Logic

### Location: `brightdata_integration/services.py` - `_trigger_facebook_batch()`

```python
def _trigger_facebook_batch(self, requests: List[ScraperRequest]) -> bool:
    """Trigger Facebook batch scrape with multiple sources"""
```

### Batch Processing:
1. **Extract Platform Parameters**:
   - Safely handles different payload types (dict, list, other)
   - Extracts platform-specific parameters if available

2. **Create Batch Payload**:
   ```python
   for request in requests:
       if request.platform == 'facebook_posts':
           item = {
               "url": request.target_url,
               "num_of_posts": request.num_of_posts,
               "posts_to_not_include": [],
               "start_date": request.start_date.strftime('%m-%d-%Y') if request.start_date else "",
               "end_date": request.end_date.strftime('%m-%d-%Y') if request.end_date else "",
           }
           
           if 'include_profile_data' in platform_params:
               item['include_profile_data'] = platform_params['include_profile_data']
   ```

3. **Call Batch API Method**:
   ```python
   success = self._make_brightdata_batch_request(requests, payload)
   ```

## 4. BrightData API Request Logic

### Location: `brightdata_integration/services.py` - `_make_brightdata_request()`

### API Request Structure:
```python
url = "https://api.brightdata.com/datasets/v3/trigger"
headers = {
    "Authorization": f"Bearer {config.api_token}",
    "Content-Type": "application/json",
}

params = {
    "dataset_id": config.dataset_id,
    "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
    "notify": f"{webhook_base_url}/api/brightdata/notify/",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}

# Facebook-specific parameters (URL mode)
if scraper_request.platform.startswith('facebook'):
    params.update({
        "type": "discover_new",
        "discover_by": "url",
    })
```

### Request Flow:
1. **Validate Configuration**:
   - Check webhook base URL is configured
   - Verify config and API token exist

2. **Prepare Request**:
   - Set headers with Bearer token
   - Build parameters with webhook endpoints
   - Add platform-specific parameters

3. **Make API Call**:
   ```python
   response = requests.post(url, headers=headers, params=params, json=payload)
   ```

4. **Handle Response**:
   - **Success (200)**: Parse JSON, extract request_id/snapshot_id, save metadata
   - **Failure**: Log error, mark request as failed
   - **Exception**: Handle network/parsing errors

## 5. Batch API Request Logic

### Location: `brightdata_integration/services.py` - `_make_brightdata_batch_request()`

### Batch-Specific Features:
1. **Platform-Specific Parameters**:
   ```python
   elif primary_request.platform.startswith('facebook'):
       # Facebook-specific parameters - using URL discovery (Collect by URL mode)
       params.update({
           "type": "discover_new",
           "discover_by": "url",
       })
   ```

2. **Update All Requests**:
   - Updates ALL scraper requests with the same snapshot_id
   - Ensures batch consistency

3. **Enhanced Logging**:
   - Detailed debug logging for batch operations
   - Platform-specific parameter tracking

## 6. Configuration Management

### Location: `brightdata_integration/configs/platform_config.json`

```json
{
  "facebook_posts": {
    "dataset_id": "gd_lkaxegm826bjpoo9m5",
    "platform_name": "facebook",
    "service_type": "posts",
    "content_type": "post",
    "payload_structure": {
      "url": "direct_url"
    },
    "url_extraction": {
      "field": "facebook_link",
      "method": "direct_url"
    },
    "discovery_params": {
      "discover_by": "url"
    },
    "required_fields": ["url"],
    "optional_fields": ["num_of_posts", "start_date", "end_date", "posts_to_not_include"]
  }
}
```

## 7. Error Handling

### Individual Request Errors:
- **Configuration Errors**: Missing webhook URL, invalid config
- **API Errors**: HTTP status codes, invalid responses
- **Network Errors**: Timeout, connection issues
- **Data Errors**: Invalid dates, missing required fields

### Batch Request Errors:
- **Group Key**: `"Batch API call failed for {group_key}"`
- **Execution Errors**: `"Batch execution error: {str(e)}"`
- **Platform Errors**: Missing trigger methods

## 8. Current Issues Identified

### 1. Batch Processing Failure:
- Error: `"Batch API call failed for facebook_posts_post"`
- Cause: `_make_brightdata_batch_request()` returning `False`
- Impact: All Facebook batch jobs failing

### 2. Response Metadata Missing:
- Recent failures show `response_metadata: None`
- Indicates API call failing before response processing

### 3. Potential Root Causes:
- **Webhook URL Issues**: ngrok tunnel may be down
- **API Authentication**: Token may be invalid/expired
- **Dataset Configuration**: Dataset ID may be incorrect
- **Network Issues**: Connectivity problems to BrightData API

## 9. Debug Information

### Current Configuration:
- **Webhook Base URL**: `https://d5177adb0315.ngrok-free.app`
- **Facebook Dataset ID**: `gd_lkaxegm826bjpoo9m5`
- **API Token**: `c20a28d5-5c6c-43c3-9567-a6d7c193e727` (first 10 chars)

### Recent Failures:
- Request ID 135: `"Batch API call failed for facebook_posts_post"`
- Request ID 132: `"Batch API call failed for facebook_posts_post"`
- Request ID 129: `"Batch API call failed for facebook_posts_post"`

## 10. Verification Points

### ✅ Correctly Implemented:
- URL mode (`"url": target_url`)
- Date conversion (MM-DD-YYYY format)
- Platform-specific parameters
- Error handling and logging
- Batch processing logic

### ❌ Potential Issues:
- Webhook endpoint accessibility
- API authentication
- Network connectivity
- BrightData service status

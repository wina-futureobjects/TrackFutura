# Facebook BrightData API Calling Code

## Overview
This document shows the complete code for calling the BrightData API for Facebook posts scraping in Track Futura. The implementation includes both individual scraping and batch processing capabilities.

## 1. Main API Endpoint (`views.py`)

### `trigger_facebook_scrape` Method
**Location**: `TrackFutura/backend/brightdata_integration/views.py:84-280`

```python
@action(detail=False, methods=['POST'])
def trigger_facebook_scrape(self, request):
    """Endpoint to trigger a Facebook scrape using Brightdata API"""
    logger = logging.getLogger(__name__)

    try:
        # Get request parameters
        target_url = request.data.get('target_url')
        if not target_url:
            return Response({'error': 'Target URL is required'},
                           status=status.HTTP_400_BAD_REQUEST)

        # Get content type and determine platform configuration key
        content_type = request.data.get('content_type', 'post')
        platform_config_key = f'facebook_{content_type}s'  # facebook_posts, facebook_reels, facebook_comments

        # Get the active Facebook configuration for specific content type
        config = BrightdataConfig.objects.filter(platform=platform_config_key, is_active=True).first()
        if not config:
            return Response({'error': f'No active {platform_config_key} Brightdata configuration found'},
                           status=status.HTTP_400_BAD_REQUEST)

        # Optional parameters with defaults
        num_of_posts = request.data.get('num_of_posts', 10)
        posts_to_not_include = request.data.get('posts_to_not_include', [])

        # Date handling - save original YYYY-MM-DD dates for database
        db_start_date = request.data.get('start_date', '')
        db_end_date = request.data.get('end_date', '')

        # Create API date versions in MM-DD-YYYY format
        api_start_date = ''
        api_end_date = ''

        # Validate and convert dates if provided
        if db_start_date:
            try:
                date_obj = datetime.strptime(db_start_date, '%Y-%m-%d')
                api_start_date = date_obj.strftime('%m-%d-%Y')
            except ValueError:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD format.'},
                               status=status.HTTP_400_BAD_REQUEST)

        if db_end_date:
            try:
                date_obj = datetime.strptime(db_end_date, '%Y-%m-%d')
                api_end_date = date_obj.strftime('%m-%d-%Y')
            except ValueError:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD format.'},
                               status=status.HTTP_400_BAD_REQUEST)

        folder_id = request.data.get('folder_id')

        # Prepare Brightdata API request
        url = "https://api.brightdata.com/datasets/v3/trigger"
        headers = {
            "Authorization": f"Bearer {config.api_token}",
            "Content-Type": "application/json",
        }
        
        # Get webhook base URL from settings
        from django.conf import settings
        webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL', 'https://178ab6e6114a.ngrok-free.app')
        
        params = {
            "dataset_id": config.dataset_id,
            "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
            "notify": f"{webhook_base_url}/api/brightdata/notify/",
            "format": "json",
            "uncompressed_webhook": "true",
            "include_errors": "true",
        }

        # Create request payload as a direct array (not nested)
        # Use MM-DD-YYYY format for API
        data = [{
            "url": target_url,
            "num_of_posts": num_of_posts,
            "posts_to_not_include": posts_to_not_include,
            "start_date": api_start_date,
            "end_date": api_end_date,
        }]

        # Create a scraper request record
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
            request_payload=data,
            status='pending'
        )

        # Make the API request to Brightdata
        response = requests.post(url, headers=headers, params=params, json=data)

        # Parse response
        try:
            if response.text.strip():
                response_data = response.json()
            else:
                response_data = {"error": "Empty response from Brightdata API"}
        except json.JSONDecodeError as json_err:
            response_data = {
                "error": f"Invalid JSON response from Brightdata API: {str(json_err)}",
                "raw_response": response.text
            }

        # Update the scraper request record
        scraper_request.response_metadata = response_data

        if response.status_code == 200 and "error" not in response_data:
            scraper_request.status = 'processing'
            scraper_request.request_id = response_data.get('request_id', '') if isinstance(response_data, dict) else ''
            return Response({
                'status': 'Scraper request sent successfully',
                'request_id': scraper_request.request_id,
                'brightdata_response': response_data
            })
        else:
            scraper_request.status = 'failed'
            error_message = response_data.get('error', 'Unknown error') if isinstance(response_data, dict) else str(response_data)
            scraper_request.error_message = error_message
            return Response({
                'error': 'Failed to trigger Brightdata scraper',
                'brightdata_response': response_data,
                'status_code': response.status_code,
                'raw_response': response.text
            }, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error making Brightdata API request: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
```

## 2. Service Layer Methods (`services.py`)

### Individual Facebook Scrape Trigger
**Location**: `TrackFutura/backend/brightdata_integration/services.py:832-840`

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

### Batch Facebook Scrape Trigger
**Location**: `TrackFutura/backend/brightdata_integration/services.py:890-950`

```python
def _trigger_facebook_batch(self, requests: List[ScraperRequest]) -> bool:
    """Trigger Facebook batch scrape with multiple sources"""
    if not requests:
        return True

    # Get platform-specific parameters from the first request
    platform_params = {}
    if requests[0].request_payload and 'platform_params' in requests[0].request_payload:
        platform_params = requests[0].request_payload['platform_params']

    # Create batch payload with all sources
    payload = []
    for request in requests:
        # Base payload for Facebook batch API - use URL directly
        item = {
            "url": request.target_url,
        }

        # Add platform-specific parameters for Facebook Posts
        if request.platform == 'facebook_posts':
            # For Facebook with URL discovery, use the full target_url directly
            item = {
                "url": request.target_url,
                "num_of_posts": request.num_of_posts,
                "posts_to_not_include": [],
                "start_date": request.start_date.strftime('%m-%d-%Y') if request.start_date else "",
                "end_date": request.end_date.strftime('%m-%d-%Y') if request.end_date else "",
            }
            
            if 'include_profile_data' in platform_params:
                item['include_profile_data'] = platform_params['include_profile_data']

        # Add platform-specific parameters for Facebook Comments
        elif request.platform == 'facebook_comments':
            if 'limit_records' in platform_params:
                item['limit_records'] = platform_params['limit_records']
            if 'get_all_replies' in platform_params:
                item['get_all_replies'] = platform_params['get_all_replies']

        payload.append(item)

    # Use the first request for API call configuration
    success = self._make_brightdata_batch_request(requests, payload)
    return success
```

### Core API Request Method
**Location**: `TrackFutura/backend/brightdata_integration/services.py:692-780`

```python
def _make_brightdata_request(self, scraper_request: ScraperRequest, payload: List[Dict]) -> bool:
    """Make the actual API request to BrightData"""
    try:
        config = scraper_request.config

        # Import Django settings to get webhook base URL
        webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL', 'https://d5177adb0315.ngrok-free.app')

        url = "https://api.brightdata.com/datasets/v3/trigger"
        headers = {
            "Authorization": f"Bearer {config.api_token}",
            "Content-Type": "application/json",
        }

        # Base parameters
        params = {
            "dataset_id": config.dataset_id,
            "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
            "notify": f"{webhook_base_url}/api/brightdata/notify/",
            "format": "json",
            "uncompressed_webhook": "true",
            "include_errors": "true",
        }

        # Add Facebook-specific parameters
        if scraper_request.platform.startswith('facebook'):
            params.update({
                "type": "discover_new",
                "discover_by": "url",  # Using URL mode (Collect by URL)
            })

        # Make the API request
        response = requests.post(url, headers=headers, params=params, json=payload)

        if response.status_code == 200:
            response_data = response.json()
            scraper_request.response_metadata = response_data
            scraper_request.status = 'processing'
            scraper_request.request_id = response_data.get('request_id', '')
            scraper_request.save()
            return True
        else:
            scraper_request.status = 'failed'
            scraper_request.error_message = f"API Error: {response.status_code} - {response.text}"
            scraper_request.save()
            return False

    except Exception as e:
        scraper_request.status = 'failed'
        scraper_request.error_message = str(e)
        scraper_request.save()
        return False
```

## 3. Batch API Request Method
**Location**: `TrackFutura/backend/brightdata_integration/services.py:1050-1150`

```python
def _make_brightdata_batch_request(self, scraper_requests: List[ScraperRequest], payload: List[Dict]) -> bool:
    """Make batch API request to BrightData"""
    try:
        import requests

        config = primary_request.config

        # Import Django settings to get webhook base URL
        webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL', 'https://178ab6e6114a.ngrok-free.app')

        url = "https://api.brightdata.com/datasets/v3/trigger"
        headers = {
            "Authorization": f"Bearer {config.api_token}",
            "Content-Type": "application/json",
        }

        # Base parameters
        params = {
            "dataset_id": config.dataset_id,
            "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
            "notify": f"{webhook_base_url}/api/brightdata/notify/",
            "format": "json",
            "uncompressed_webhook": "true",
            "include_errors": "true",
        }

        # Add Facebook-specific parameters
        if primary_request.platform.startswith('facebook'):
            params.update({
                "type": "discover_new",
                "discover_by": "url",  # Using URL mode (Collect by URL)
            })

        # Update ALL requests to processing status
        for request in scraper_requests:
            request.request_payload = payload
            request.status = 'processing'
            request.save()

        # Make the API request
        response = requests.post(url, headers=headers, params=params, json=payload)

        if response.status_code == 200:
            response_data = response.json()
            # Update all requests with the response
            for request in scraper_requests:
                request.response_metadata = response_data
                request.request_id = response_data.get('request_id', '')
                request.save()
            return True
        else:
            # Mark all requests as failed
            for request in scraper_requests:
                request.status = 'failed'
                request.error_message = f"Batch API Error: {response.status_code} - {response.text}"
                request.save()
            return False

    except Exception as e:
        # Mark all requests as failed
        for request in scraper_requests:
            request.status = 'failed'
            request.error_message = str(e)
            request.save()
        return False
```

## 4. API Request Structure

### Request URL
```
POST https://api.brightdata.com/datasets/v3/trigger
```

### Headers
```json
{
    "Authorization": "Bearer {api_token}",
    "Content-Type": "application/json"
}
```

### Query Parameters
```json
{
    "dataset_id": "gd_lkaxegm826bjpoo9m5",
    "endpoint": "https://178ab6e6114a.ngrok-free.app/api/brightdata/webhook/",
    "notify": "https://178ab6e6114a.ngrok-free.app/api/brightdata/notify/",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
    "type": "discover_new",
    "discover_by": "url"
}
```

### Request Body (Individual)
```json
[
    {
        "url": "https://www.facebook.com/LeBron/",
        "num_of_posts": 10,
        "posts_to_not_include": [],
        "start_date": "01-01-2025",
        "end_date": "01-31-2025"
    }
]
```

### Request Body (Batch)
```json
[
    {
        "url": "https://www.facebook.com/LeBron/",
        "num_of_posts": 10,
        "posts_to_not_include": [],
        "start_date": "01-01-2025",
        "end_date": "01-31-2025"
    },
    {
        "url": "https://www.facebook.com/SamsungIsrael/",
        "num_of_posts": 50,
        "posts_to_not_include": [],
        "start_date": "01-01-2025",
        "end_date": "02-28-2025"
    }
]
```

## 5. Key Features

### ✅ **URL Mode (Collect by URL)**
- Uses `"discover_by": "url"` parameter
- Sends full Facebook URL in payload
- No username extraction

### ✅ **Date Format Conversion**
- Database: YYYY-MM-DD format
- API: MM-DD-YYYY format
- Automatic conversion between formats

### ✅ **Batch Processing**
- Supports multiple Facebook URLs in single request
- Efficient for bulk scraping operations

### ✅ **Error Handling**
- Comprehensive error logging
- Request status tracking
- Response metadata storage

### ✅ **Webhook Integration**
- Configurable webhook endpoints
- Notification support
- Error inclusion in responses

## 6. Configuration

### Environment Variables
```bash
BRIGHTDATA_WEBHOOK_BASE_URL=https://178ab6e6114a.ngrok-free.app
BRIGHTDATA_BASE_URL=https://178ab6e6114a.ngrok-free.app
```

### Database Configuration
- `BrightdataConfig` model stores API tokens and dataset IDs
- `ScraperRequest` model tracks individual requests
- Status tracking: pending → processing → completed/failed

## 7. Usage Examples

### Individual Scrape
```python
# POST to /api/requests/trigger_facebook_scrape/
{
    "target_url": "https://www.facebook.com/LeBron/",
    "num_of_posts": 10,
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "content_type": "post"
}
```

### Batch Scrape
```python
# Multiple URLs processed together
[
    "https://www.facebook.com/LeBron/",
    "https://www.facebook.com/SamsungIsrael/",
    "https://www.facebook.com/gagadaily/"
]
```

This implementation provides a complete, production-ready solution for Facebook scraping via the BrightData API with proper error handling, batch processing, and webhook integration.

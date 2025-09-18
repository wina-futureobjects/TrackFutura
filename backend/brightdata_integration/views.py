from django.shortcuts import render
import json
import requests
import logging
from datetime import datetime, timedelta
from django.shortcuts import get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import BrightdataConfig, ScraperRequest, BatchScraperJob, BrightdataNotification, WebhookEvent
from .serializers import (
    BrightdataConfigSerializer, ScraperRequestSerializer, ScraperRequestCreateSerializer,
    BatchScraperJobSerializer, BatchScraperJobCreateSerializer, BrightdataNotificationSerializer
)
from .services import AutomatedBatchScraper, create_and_execute_batch_job
import traceback
from urllib.parse import urlencode, urlparse, urlunparse

# Set up logger
logger = logging.getLogger(__name__)

class BrightdataConfigViewSet(viewsets.ModelViewSet):
    """API endpoint for Brightdata configuration"""
    queryset = BrightdataConfig.objects.all()
    serializer_class = BrightdataConfigSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production

    def get_queryset(self):
        """Filter by platform if specified"""
        queryset = BrightdataConfig.objects.all()
        platform = self.request.query_params.get('platform')
        if platform:
            queryset = queryset.filter(platform=platform)
        return queryset.order_by('platform', 'name')

    @action(detail=True, methods=['POST'])
    def set_active(self, request, pk=None):
        """Set the current configuration as active and deactivate others for the same platform"""
        config = self.get_object()

        # Deactivate all other configurations for this platform
        BrightdataConfig.objects.filter(platform=config.platform, is_active=True).exclude(pk=config.pk).update(is_active=False)

        # Activate the current configuration
        config.is_active = True
        config.save()

        return Response({'status': f'{config.platform.title()} configuration activated'})

    @action(detail=False, methods=['GET'])
    def active(self, request):
        """Get all active configurations by platform"""
        platform = request.query_params.get('platform')
        if platform:
            config = BrightdataConfig.objects.filter(platform=platform, is_active=True).first()
            if not config:
                return Response({'error': f'No active configuration found for {platform}'}, status=status.HTTP_404_NOT_FOUND)
            serializer = self.get_serializer(config)
            return Response(serializer.data)
        else:
            # Return all active configurations grouped by platform
            configs = BrightdataConfig.objects.filter(is_active=True).order_by('platform')
            serializer = self.get_serializer(configs, many=True)
            return Response(serializer.data)

class ScraperRequestViewSet(viewsets.ModelViewSet):
    """API endpoint for Brightdata scraper requests"""
    queryset = ScraperRequest.objects.all()
    serializer_class = ScraperRequestSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production

    def get_serializer_class(self):
        if self.action == 'create':
            return ScraperRequestCreateSerializer
        return self.serializer_class

    @action(detail=False, methods=['POST'])
    def trigger_facebook_scrape(self, request):
        """Endpoint to trigger a Facebook scrape using Brightdata API"""
        logger = logging.getLogger(__name__)

        try:
            # Log the incoming request data for debugging
            logger.info(f"Facebook scraper request data: {request.data}")
            print("\n\n==== DEBUG: FACEBOOK SCRAPER REQUEST DATA ====")
            print(f"Request data: {request.data}")
            print("=======================================\n")

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
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_start_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
                    api_start_date = date_obj.strftime('%m-%d-%Y')
                except ValueError:
                    return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD format.'},
                                   status=status.HTTP_400_BAD_REQUEST)

            if db_end_date:
                try:
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_end_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
                    api_end_date = date_obj.strftime('%m-%d-%Y')
                except ValueError:
                    return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD format.'},
                                   status=status.HTTP_400_BAD_REQUEST)

            folder_id = request.data.get('folder_id')

            # Create a scraper request record - use original YYYY-MM-DD for database
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

            try:
                # Use the service method to make the API request
                from .services import AutomatedBatchScraper
                scraper_service = AutomatedBatchScraper()
                
                # Trigger the Facebook scrape using the service method
                success = scraper_service._trigger_facebook_scrape(scraper_request)
                
                if success:
                    return Response({
                        'status': 'Scraper request sent successfully',
                        'request_id': scraper_request.request_id,
                        'brightdata_response': scraper_request.response_metadata
                    })
                else:
                    return Response({
                        'error': 'Failed to trigger Brightdata scraper',
                        'brightdata_response': scraper_request.response_metadata,
                        'error_message': scraper_request.error_message
                    }, status=status.HTTP_400_BAD_REQUEST)

            except Exception as e:
                # Handle any exceptions in the API request
                logger.error(f"Error making Brightdata API request: {str(e)}")
                logger.error(traceback.format_exc())

                print("\n\n==== DEBUG: API REQUEST ERROR ====")
                print(f"Error type: {type(e).__name__}")
                print(f"Error message: {str(e)}")
                print(f"Traceback:\n{traceback.format_exc()}")
                print("=======================================\n\n")

                scraper_request.status = 'failed'
                scraper_request.error_message = str(e)
                scraper_request.save()
                return Response({
                    'error': 'Error triggering Brightdata scraper',
                    'details': str(e),
                    'error_type': type(e).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as outer_exception:
            # Catch-all for any unexpected errors
            logger.error(f"Unexpected error in trigger_facebook_scrape: {str(outer_exception)}")
            logger.error(traceback.format_exc())

            print("\n\n==== DEBUG: OUTER EXCEPTION ERROR ====")
            print(f"Error type: {type(outer_exception).__name__}")
            print(f"Error message: {str(outer_exception)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            print("=======================================\n\n")

            return Response({
                'error': 'Unexpected server error',
                'details': str(outer_exception),
                'error_type': type(outer_exception).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def trigger_instagram_scrape(self, request):
        """Endpoint to trigger an Instagram scrape using Brightdata API"""
        logger = logging.getLogger(__name__)

        try:
            # Log the incoming request data for debugging
            logger.info(f"Instagram scraper request data: {request.data}")
            print("\n\n==== DEBUG: INSTAGRAM SCRAPER REQUEST DATA ====")
            print(f"Request data: {request.data}")
            print("=======================================\n")

            # Get request parameters
            target_url = request.data.get('target_url')
            if not target_url:
                return Response({'error': 'Target URL is required'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Clean Instagram URLs by removing query parameters
            # BrightData API expects clean URLs like: https://www.instagram.com/username/
            # but rejects URLs with query params like: https://www.instagram.com/username/?hl=en
            try:
                parsed = urlparse(target_url)
                # Remove query parameters and fragments for Instagram URLs
                cleaned_parsed = parsed._replace(query='', fragment='')
                cleaned_url = urlunparse(cleaned_parsed)
                logger.info(f"Cleaned Instagram URL: {target_url} -> {cleaned_url}")
                target_url = cleaned_url
            except Exception as e:
                logger.warning(f"Could not clean Instagram URL {target_url}: {str(e)}")
                # Continue with original URL if parsing fails

            # Get content type and determine platform configuration key
            content_type = request.data.get('content_type', 'post')
            platform_config_key = f'instagram_{content_type}s'  # instagram_posts, instagram_reels, instagram_comments

            # Get the active Instagram configuration for specific content type
            config = BrightdataConfig.objects.filter(platform=platform_config_key, is_active=True).first()
            if not config:
                return Response({'error': f'No active {platform_config_key} Brightdata configuration found'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Get optional parameters
            folder_id = request.data.get('folder_id')

            # Date handling - only include if provided
            start_date = request.data.get('start_date', '')
            end_date = request.data.get('end_date', '')

            # Prepare Brightdata API request
            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }
            # Get webhook base URL from settings
            from django.conf import settings
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                return Response({'error': 'BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured'},
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            params = {
                "dataset_id": config.dataset_id,
                "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
                "notify": f"{webhook_base_url}/api/brightdata/notify/",
                "format": "json",
                "uncompressed_webhook": "true",
                "include_errors": "true",
                "type": "discover_new",
                "discover_by": "url",
            }

            # Create request payload based on content type
            if content_type == 'reel':
                # Instagram Reels API format
                data = [{
                    "url": target_url,
                    "start_date": start_date,
                    "end_date": end_date,
                    "all_reels": False,  # Default to specific date range
                }]
            else:
                # Instagram Posts API format (includes posts and other content types)
                data = [{
                    "url": target_url,
                    "num_of_posts": request.data.get('num_of_posts', 10),
                    "start_date": start_date,
                    "end_date": end_date,
                    "post_type": "Post" if content_type == 'post' else content_type.title(),
                    "posts_to_not_include": request.data.get('posts_to_not_include', []),
                }]

            # Log the request payload for debugging
            print(f"\n\n==== DEBUG: BRIGHTDATA API REQUEST ({platform_config_key.upper()}) ====")
            print(f"URL: {url}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            print(f"Data: {data}")
            print(f"Configuration: {config.name} - {config.get_platform_display()}")

            # Show the actual request that would be made
            print(f"Final request URL: {url}?{urlencode(params)}")
            print(f"Final request body: {json.dumps(data)}")

            print("=======================================\n")

            # Create a scraper request record
            scraper_request = ScraperRequest.objects.create(
                config=config,
                platform=platform_config_key,
                content_type=content_type,
                target_url=target_url,
                num_of_posts=request.data.get('num_of_posts', 10),  # Use actual value from request
                folder_id=folder_id,
                request_payload=data,
                status='pending'
            )

            try:
                # Make the API request to Brightdata
                print("\n\n==== DEBUG: BRIGHTDATA API REQUEST (INSTAGRAM) ====")
                print(f"URL: {url}")
                print(f"Headers: {headers}")
                print(f"Params: {params}")
                print(f"Data: {data}")

                # Show the actual request that would be made
                print(f"Final request URL: {url}?{urlencode(params)}")
                print(f"Final request body: {json.dumps(data)}")

                print("=======================================\n")

                # ===== DETAILED DEBUG LOGGING FOR INDIVIDUAL REQUESTS =====
                print("\n" + "="*80)
                print("🐛 BRIGHTDATA API REQUEST DEBUG - INDIVIDUAL SCRAPER")
                print("="*80)
                print(f"Platform: {platform_config_key}")
                print(f"Config Name: {config.name}")
                print(f"Config ID: {config.id}")
                print()
                print("📡 REQUEST DETAILS:")
                print(f"URL: {url}")
                print(f"Headers: {headers}")
                print(f"Params: {params}")
                print(f"Data: {data}")
                print()
                print("🔍 COMPARISON WITH WORKING manualrun.py:")
                print("Working script uses:")
                print('  Authorization: Bearer c20a28d5-5c6c-43c3-9567-a6d7c193e727')
                print('  dataset_id: gd_lk5ns7kz21pck8jpis')
                print(f'  endpoint: {webhook_base_url}/api/brightdata/webhook/')
                print()
                print("This request uses:")
                print(f'  Authorization: {headers["Authorization"]}')
                print(f'  dataset_id: {params["dataset_id"]}')
                print(f'  endpoint: {params["endpoint"]}')
                print()

                # Check for differences
                working_token = "c20a28d5-5c6c-43c3-9567-a6d7c193e727"
                working_dataset = "gd_lk5ns7kz21pck8jpis"
                working_endpoint = f"{webhook_base_url}/api/brightdata/webhook/"

                if headers["Authorization"] != f"Bearer {working_token}":
                    print("❌ API TOKEN MISMATCH!")
                    print(f"   Expected: Bearer {working_token}")
                    print(f"   Got:      {headers['Authorization']}")
                else:
                    print("✅ API Token matches")

                if params["dataset_id"] != working_dataset:
                    print("❌ DATASET ID MISMATCH!")
                    print(f"   Expected: {working_dataset}")
                    print(f"   Got:      {params['dataset_id']}")
                else:
                    print("✅ Dataset ID matches")

                if params["endpoint"] != working_endpoint:
                    print("❌ ENDPOINT MISMATCH!")
                    print(f"   Expected: {working_endpoint}")
                    print(f"   Got:      {params['endpoint']}")
                else:
                    print("✅ Endpoint matches")

                print()
                print("🚀 MAKING API REQUEST...")
                print("="*80)

                response = requests.post(url, headers=headers, params=params, json=data)

                print("\n📥 BRIGHTDATA API RESPONSE:")
                print(f"Status Code: {response.status_code}")
                print(f"Response Headers: {dict(response.headers)}")
                print(f"Response Text: {response.text}")
                print("="*80 + "\n")

                # Try to parse the response as JSON
                try:
                    if response.text.strip():  # Check if response is not empty
                        response_data = response.json()
                    else:
                        # Handle empty response
                        response_data = {"error": "Empty response from Brightdata API"}
                        print("WARNING: Empty response from Brightdata API")
                except json.JSONDecodeError as json_err:
                    # Handle invalid JSON
                    print(f"ERROR: Could not parse Brightdata API response as JSON: {str(json_err)}")
                    response_data = {
                        "error": f"Invalid JSON response from Brightdata API: {str(json_err)}",
                        "raw_response": response.text
                    }

                # Log the API response for debugging
                logger.info(f"Brightdata API response: {response_data}")

                # Update the scraper request record
                scraper_request.response_metadata = response_data

                if response.status_code == 200 and "error" not in response_data:
                    scraper_request.status = 'processing'
                    # Try to get request_id safely
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
                # Handle any exceptions in the API request
                logger.error(f"Error making Brightdata API request: {str(e)}")
                logger.error(traceback.format_exc())

                print("\n\n==== DEBUG: API REQUEST ERROR ====")
                print(f"Error type: {type(e).__name__}")
                print(f"Error message: {str(e)}")
                print(f"Traceback:\n{traceback.format_exc()}")
                print("=======================================\n\n")

                scraper_request.status = 'failed'
                scraper_request.error_message = str(e)
                return Response({
                    'error': 'Error triggering Brightdata scraper',
                    'details': str(e),
                    'error_type': type(e).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                # Save the scraper request record
                scraper_request.save()

        except Exception as outer_exception:
            # Catch-all for any unexpected errors
            logger.error(f"Unexpected error in trigger_instagram_scrape: {str(outer_exception)}")
            logger.error(traceback.format_exc())

            print("\n\n==== DEBUG: OUTER EXCEPTION ERROR ====")
            print(f"Error type: {type(outer_exception).__name__}")
            print(f"Error message: {str(outer_exception)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            print("=======================================\n\n")

            return Response({
                'error': 'Unexpected server error',
                'details': str(outer_exception),
                'error_type': type(outer_exception).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def trigger_linkedin_scrape(self, request):
        """Endpoint to trigger a LinkedIn scrape using Brightdata API"""
        logger = logging.getLogger(__name__)

        try:
            # Log the incoming request data for debugging
            logger.info(f"LinkedIn scraper request data: {request.data}")
            print("\n\n==== DEBUG: LINKEDIN SCRAPER REQUEST DATA ====")
            print(f"Request data: {request.data}")
            print("=======================================\n")

            # Get the active configuration
            config = BrightdataConfig.objects.filter(is_active=True).first()
            if not config:
                return Response({'error': 'No active Brightdata configuration found'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Get request parameters
            target_url = request.data.get('target_url')
            if not target_url:
                return Response({'error': 'Target URL is required'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Optional parameters with defaults
            content_type = request.data.get('content_type', 'post')
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
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_start_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
                    api_start_date = date_obj.strftime('%m-%d-%Y')
                except ValueError:
                    return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD format.'},
                                   status=status.HTTP_400_BAD_REQUEST)

            if db_end_date:
                try:
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_end_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
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
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                return Response({'error': 'BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured'},
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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

            # Log the request payload for debugging
            print("\n\n==== DEBUG: BRIGHTDATA API REQUEST (LINKEDIN) ====")
            print(f"URL: {url}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            print(f"Data: {data}")
            print(f"DB dates: start={db_start_date}, end={db_end_date}")
            print(f"API dates: start={api_start_date}, end={api_end_date}")

            # Show the actual request that would be made
            print(f"Final request URL: {url}?{urlencode(params)}")
            print(f"Final request body: {json.dumps(data)}")

            print("=======================================\n")

            # Create a scraper request record - use original YYYY-MM-DD for database
            scraper_request = ScraperRequest.objects.create(
                config=config,
                platform='linkedin',
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

            try:
                # Make the API request to Brightdata
                print("\n\n==== DEBUG: BRIGHTDATA API REQUEST (LINKEDIN) ====")
                print(f"URL: {url}")
                print(f"Headers: {headers}")
                print(f"Params: {params}")
                print(f"Data: {data}")
                print(f"DB dates: start={db_start_date}, end={db_end_date}")
                print(f"API dates: start={api_start_date}, end={api_end_date}")

                # Show the actual request that would be made
                print(f"Final request URL: {url}?{urlencode(params)}")
                print(f"Final request body: {json.dumps(data)}")

                print("=======================================\n")

                response = requests.post(url, headers=headers, params=params, json=data)

                print("\n==== DEBUG: BRIGHTDATA API RESPONSE (LINKEDIN) ====")
                print(f"Status code: {response.status_code}")
                print(f"Response text: {response.text}")
                print("=======================================\n\n")

                # Try to parse the response as JSON
                try:
                    if response.text.strip():  # Check if response is not empty
                        response_data = response.json()
                    else:
                        # Handle empty response
                        response_data = {"error": "Empty response from Brightdata API"}
                        print("WARNING: Empty response from Brightdata API")
                except json.JSONDecodeError as json_err:
                    # Handle invalid JSON
                    print(f"ERROR: Could not parse Brightdata API response as JSON: {str(json_err)}")
                    response_data = {
                        "error": f"Invalid JSON response from Brightdata API: {str(json_err)}",
                        "raw_response": response.text
                    }

                # Log the API response for debugging
                logger.info(f"Brightdata API response: {response_data}")

                # Update the scraper request record
                scraper_request.response_metadata = response_data

                if response.status_code == 200 and "error" not in response_data:
                    scraper_request.status = 'processing'
                    # Try to get request_id safely
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
                # Handle any exceptions in the API request
                logger.error(f"Error making Brightdata API request: {str(e)}")
                logger.error(traceback.format_exc())

                print("\n\n==== DEBUG: API REQUEST ERROR ====")
                print(f"Error type: {type(e).__name__}")
                print(f"Error message: {str(e)}")
                print(f"Traceback:\n{traceback.format_exc()}")
                print("=======================================\n\n")

                scraper_request.status = 'failed'
                scraper_request.error_message = str(e)
                return Response({
                    'error': 'Error triggering Brightdata scraper',
                    'details': str(e),
                    'error_type': type(e).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                # Save the scraper request record
                scraper_request.save()

        except Exception as outer_exception:
            # Catch-all for any unexpected errors
            logger.error(f"Unexpected error in trigger_linkedin_scrape: {str(outer_exception)}")
            logger.error(traceback.format_exc())

            print("\n\n==== DEBUG: OUTER EXCEPTION ERROR ====")
            print(f"Error type: {type(outer_exception).__name__}")
            print(f"Error message: {str(outer_exception)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            print("=======================================\n\n")

            return Response({
                'error': 'Unexpected server error',
                'details': str(outer_exception),
                'error_type': type(outer_exception).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def trigger_tiktok_scrape(self, request):
        """Endpoint to trigger a TikTok scrape using Brightdata API"""
        logger = logging.getLogger(__name__)

        try:
            # Log the incoming request data for debugging
            logger.info(f"TikTok scraper request data: {request.data}")
            print("\n\n==== DEBUG: TIKTOK SCRAPER REQUEST DATA ====")
            print(f"Request data: {request.data}")
            print("=======================================\n")

            # Get the active configuration
            config = BrightdataConfig.objects.filter(is_active=True).first()
            if not config:
                return Response({'error': 'No active Brightdata configuration found'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Get request parameters
            target_url = request.data.get('target_url')
            if not target_url:
                return Response({'error': 'Target URL is required'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Optional parameters with defaults
            content_type = request.data.get('content_type', 'post')
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
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_start_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
                    api_start_date = date_obj.strftime('%m-%d-%Y')
                except ValueError:
                    return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD format.'},
                                   status=status.HTTP_400_BAD_REQUEST)

            if db_end_date:
                try:
                    # Verify it's in YYYY-MM-DD format
                    date_obj = datetime.strptime(db_end_date, '%Y-%m-%d')
                    # Convert to MM-DD-YYYY for API
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
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                return Response({'error': 'BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured'},
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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

            # Log the request payload for debugging
            print("\n\n==== DEBUG: BRIGHTDATA API REQUEST (TIKTOK) ====")
            print(f"URL: {url}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            print(f"Data: {data}")
            print(f"DB dates: start={db_start_date}, end={db_end_date}")
            print(f"API dates: start={api_start_date}, end={api_end_date}")

            # Show the actual request that would be made
            print(f"Final request URL: {url}?{urlencode(params)}")
            print(f"Final request body: {json.dumps(data)}")

            print("=======================================\n")

            # Create a scraper request record - use original YYYY-MM-DD for database
            scraper_request = ScraperRequest.objects.create(
                config=config,
                platform='tiktok',
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

            try:
                # Make the API request to Brightdata
                print("\n\n==== DEBUG: BRIGHTDATA API REQUEST (TIKTOK) ====")
                print(f"URL: {url}")
                print(f"Headers: {headers}")
                print(f"Params: {params}")
                print(f"Data: {data}")
                print(f"DB dates: start={db_start_date}, end={db_end_date}")
                print(f"API dates: start={api_start_date}, end={api_end_date}")

                # Show the actual request that would be made
                print(f"Final request URL: {url}?{urlencode(params)}")
                print(f"Final request body: {json.dumps(data)}")

                print("=======================================\n")

                response = requests.post(url, headers=headers, params=params, json=data)

                print("\n==== DEBUG: BRIGHTDATA API RESPONSE (TIKTOK) ====")
                print(f"Status code: {response.status_code}")
                print(f"Response text: {response.text}")
                print("=======================================\n\n")

                # Try to parse the response as JSON
                try:
                    if response.text.strip():  # Check if response is not empty
                        response_data = response.json()
                    else:
                        # Handle empty response
                        response_data = {"error": "Empty response from Brightdata API"}
                        print("WARNING: Empty response from Brightdata API")
                except json.JSONDecodeError as json_err:
                    # Handle invalid JSON
                    print(f"ERROR: Could not parse Brightdata API response as JSON: {str(json_err)}")
                    response_data = {
                        "error": f"Invalid JSON response from Brightdata API: {str(json_err)}",
                        "raw_response": response.text
                    }

                # Log the API response for debugging
                logger.info(f"Brightdata API response: {response_data}")

                # Update the scraper request record
                scraper_request.response_metadata = response_data

                if response.status_code == 200 and "error" not in response_data:
                    scraper_request.status = 'processing'
                    # Try to get request_id safely
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
                # Handle any exceptions in the API request
                logger.error(f"Error making Brightdata API request: {str(e)}")
                logger.error(traceback.format_exc())

                print("\n\n==== DEBUG: API REQUEST ERROR ====")
                print(f"Error type: {type(e).__name__}")
                print(f"Error message: {str(e)}")
                print(f"Traceback:\n{traceback.format_exc()}")
                print("=======================================\n\n")

                scraper_request.status = 'failed'
                scraper_request.error_message = str(e)
                return Response({
                    'error': 'Error triggering Brightdata scraper',
                    'details': str(e),
                    'error_type': type(e).__name__
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                # Save the scraper request record
                scraper_request.save()

        except Exception as outer_exception:
            # Catch-all for any unexpected errors
            logger.error(f"Unexpected error in trigger_tiktok_scrape: {str(outer_exception)}")
            logger.error(traceback.format_exc())

            print("\n\n==== DEBUG: OUTER EXCEPTION ERROR ====")
            print(f"Error type: {type(outer_exception).__name__}")
            print(f"Error message: {str(outer_exception)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            print("=======================================\n\n")

            return Response({
                'error': 'Unexpected server error',
                'details': str(outer_exception),
                'error_type': type(outer_exception).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['POST'])
    def test_connection(self, request):
        """Test the connection to Brightdata API with active configuration"""
        import traceback
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Get the active configuration
            config = BrightdataConfig.objects.filter(is_active=True).first()
            if not config:
                return Response({'error': 'No active Brightdata configuration found'},
                               status=status.HTTP_400_BAD_REQUEST)

            # Test URL for Brightdata API
            url = "https://api.brightdata.com/datasets/v3/status"  # Use status endpoint for testing
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }
            params = {
                "dataset_id": config.dataset_id,
            }

            # Log the test request
            print("\n\n==== DEBUG: BRIGHTDATA TEST CONNECTION ====")
            print(f"URL: {url}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            print("=======================================\n")

            # Make the API request to Brightdata
            response = requests.get(url, headers=headers, params=params)

            # Log the test response
            print("\n==== DEBUG: BRIGHTDATA TEST RESPONSE ====")
            print(f"Status code: {response.status_code}")
            print(f"Response text: {response.text}")
            print("=======================================\n\n")

            # Process response
            if response.status_code == 200:
                try:
                    if response.text.strip():  # Check if response is not empty
                        response_data = response.json()
                        return Response({
                            'status': 'Connection successful',
                            'brightdata_response': response_data
                        })
                    else:
                        return Response({
                            'status': 'Connection successful but response is empty',
                            'response_text': response.text
                        })
                except json.JSONDecodeError as json_err:
                    # Handle invalid JSON
                    print(f"ERROR: Could not parse Brightdata API response as JSON: {str(json_err)}")
                    return Response({
                        'status': 'Connection successful but response is not valid JSON',
                        'error': f"Invalid JSON response: {str(json_err)}",
                        'response_text': response.text
                    })
            else:
                try:
                    if response.text.strip():  # Check if response is not empty
                        try:
                            error_data = response.json()
                            return Response({
                                'error': 'Connection failed',
                                'brightdata_error': error_data,
                                'status_code': response.status_code,
                            }, status=status.HTTP_400_BAD_REQUEST)
                        except json.JSONDecodeError:
                            return Response({
                                'error': 'Connection failed',
                                'response_text': response.text,
                                'status_code': response.status_code,
                            }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({
                            'error': 'Connection failed',
                            'response_text': 'Empty response',
                            'status_code': response.status_code,
                        }, status=status.HTTP_400_BAD_REQUEST)
                except Exception as parse_err:
                    return Response({
                        'error': 'Connection failed',
                        'response_text': response.text,
                        'parse_error': str(parse_err),
                        'status_code': response.status_code,
                    }, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            # Handle any exceptions
            logger.error(f"Error testing Brightdata connection: {str(e)}")
            logger.error(traceback.format_exc())

            print("\n\n==== DEBUG: TEST CONNECTION ERROR ====")
            print(f"Error type: {type(e).__name__}")
            print(f"Error message: {str(e)}")
            print(f"Traceback:\n{traceback.format_exc()}")
            print("=======================================\n\n")

            return Response({
                'error': 'Error testing Brightdata connection',
                'details': str(e),
                'error_type': type(e).__name__
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@require_http_methods(["POST"])
def brightdata_webhook(request):
    """
    Safe webhook handler that always captures raw payload first, then validates
    """
    import time
    import traceback
    import requests
    import logging
    from datetime import datetime
    
    logger = logging.getLogger(__name__)
    
    # 1. CONFIRM DJANGO RECEIVES THE REQUEST
    logger.info("="*80)
    logger.info(f"🎯 WEBHOOK RECEIVED AT {datetime.now()}")
    logger.info("="*80)
    logger.info(f"📡 Method: {request.method}")
    logger.info(f"🌐 Client IP: {request.META.get('REMOTE_ADDR', 'unknown')}")
    logger.info(f"🔗 URL: {request.build_absolute_uri()}")
    logger.info(f"📋 Content-Type: {request.content_type}")
    logger.info(f"📏 Content-Length: {request.META.get('CONTENT_LENGTH', 'unknown')}")
    logger.info(f"📨 Headers: {dict(request.headers)}")
    logger.info(f"🔍 Query Params: {dict(request.GET)}")
    
    # 2. CHECK HTTP METHOD
    if request.method != 'POST':
        logger.error(f"❌ Invalid method: {request.method}. Expected POST")
        return JsonResponse({'error': 'Method not allowed'}, status=405)

    start_time = time.time()
    client_ip = request.META.get('REMOTE_ADDR', 'unknown')
    webhook_event = None

    try:
        # 3. ALWAYS SAVE RAW PAYLOAD FIRST (for debugging)
        logger.info("📦 CAPTURING RAW PAYLOAD:")
        try:
            raw_body = request.body.decode("utf-8")
            logger.info(f"Raw body: {raw_body[:1000]}...")  # First 1000 chars
        except UnicodeDecodeError as e:
            logger.error(f"❌ Unicode decode error: {e}")
            raw_body = str(request.body)
            logger.info(f"Raw body (bytes): {raw_body[:1000]}...")

        # 4. PARSE JSON (but don't fail yet)
        logger.info("🔍 PARSING JSON PAYLOAD:")
        data = None
        json_error = None
        
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                logger.info(f"✅ JSON parsed successfully")
                logger.info(f"📊 Data type: {type(data)}")
                
                # 🔧 FIX 4: Add robust type checks
                if not isinstance(data, (list, dict)):
                    logger.warning(f"⚠️  JSON is not list/dict, wrapping as list: {type(data)}")
                    data = [data]  # Wrap single items in list
                
                if isinstance(data, dict):
                    logger.info(f"📋 Data keys: {list(data.keys())}")
                elif isinstance(data, list):
                    logger.info(f"📋 List length: {len(data)}")
                logger.info(f"📄 Parsed JSON: {str(data)[:500]}...")  # First 500 chars
            except json.JSONDecodeError as e:
                json_error = str(e)
                logger.error(f"❌ JSON decode error: {e}")
                logger.error(f"❌ Raw body that failed: {raw_body}")
                # Don't return error yet - save the raw payload first
        else:
            logger.error(f"❌ Unsupported content type: {request.content_type}")
            logger.error(f"❌ Expected: application/json")
            # Still save the raw payload for debugging

        # 5. EXTRACT METADATA
        logger.info("🏷️ EXTRACTING METADATA:")
        # More robust snapshot id extraction: headers, query params, JSON body (including nested metadata)
        def _extract_snapshot_id_from_request_and_data(req, payload):
            try:
                import logging as _logging
                _logger = _logging.getLogger(__name__)

                headers = req.headers or {}
                # Candidate sources ordered by precedence
                candidates = [
                    # New BrightData delivery headers (per S3 delivery)
                    headers.get('Snapshot-Id'),
                    headers.get('snapshot-id'),
                    headers.get('Dca-Collection-Id'),
                    headers.get('dca-collection-id'),
                    headers.get('X-Snapshot-Id'),
                    headers.get('X-Brightdata-Snapshot-Id'),
                    headers.get('X-BrightData-Snapshot-Id'),
                    headers.get('X-Request-Id'),
                    headers.get('X-Brightdata-Request-Id'),
                    headers.get('X-BrightData-Request-Id'),
                    headers.get('x-snapshot-id'),
                    headers.get('x-request-id'),
                    # Query params fallbacks
                    req.GET.get('snapshot_id'),
                    req.GET.get('id'),
                    req.GET.get('request_id'),
                    req.GET.get('snapshotId'),
                    req.GET.get('requestId'),
                ]

                # From JSON body (top-level)
                if isinstance(payload, dict):
                    candidates.extend([
                        payload.get('snapshot_id'),
                        payload.get('request_id'),
                        payload.get('id'),
                        payload.get('snapshotId'),
                        payload.get('requestId'),
                        payload.get('Snapshot-Id'),
                        payload.get('Request-Id'),
                        payload.get('Dca-Collection-Id'),
                        payload.get('job_id'),
                        payload.get('jobId'),
                    ])

                    meta = payload.get('metadata') or payload.get('meta') or {}
                    if isinstance(meta, dict):
                        candidates.extend([
                            meta.get('snapshot_id'),
                            meta.get('request_id'),
                            meta.get('id'),
                            meta.get('snapshotId'),
                            meta.get('requestId'),
                        ])
                elif isinstance(payload, list) and payload:
                    first = payload[0]
                    if isinstance(first, dict):
                        candidates.extend([
                            first.get('snapshot_id'),
                            first.get('request_id'),
                            first.get('id'),
                            first.get('snapshotId'),
                            first.get('requestId'),
                            first.get('Snapshot-Id'),
                            first.get('Request-Id'),
                            first.get('Dca-Collection-Id'),
                            first.get('job_id'),
                            first.get('jobId'),
                        ])
                        meta = first.get('metadata') or first.get('meta') or {}
                        if isinstance(meta, dict):
                            candidates.extend([
                                meta.get('snapshot_id'),
                                meta.get('request_id'),
                                meta.get('id'),
                                meta.get('snapshotId'),
                                meta.get('requestId'),
                            ])

                for candidate in candidates:
                    if candidate is not None and str(candidate).strip():
                        return str(candidate)
            except Exception as _e:
                _logger.warning(f"⚠️  Snapshot ID extraction failed: {_e}")
            return None

        snapshot_id = _extract_snapshot_id_from_request_and_data(request, data)
        
        # 🔧 FIX 1: Improved platform detection
        platform = (request.headers.get('X-Platform') or
                   request.headers.get('x-platform') or
                   request.GET.get('platform'))
        
        # If no platform specified, try to detect from data content with better logic
        if not platform and data:
            platform = _detect_platform_from_data(data)
        
        logger.info(f"📱 Platform detected: {platform}")
        logger.info(f"📸 Snapshot ID: {snapshot_id}")

        # 6. ALWAYS SAVE TO DATABASE FIRST (even if validation fails)
        logger.info("💾 SAVING RAW PAYLOAD TO DATABASE:")
        try:
            # 🔧 FIX 3: Better test webhook detection
            is_test_webhook = (request.headers.get('X-Brightdata-Test') or 
                             request.headers.get('x-brightdata-test') or
                             not snapshot_id)
            
            # Determine status based on what we have
            if json_error:
                status = 'json_error'
            elif is_test_webhook:
                status = 'test_webhook'
            else:
                status = 'pending'
            
            webhook_event = WebhookEvent.objects.create(
                platform=platform,
                snapshot_id=snapshot_id,
                raw_payload=data if data else {'raw_body': raw_body, 'json_error': json_error},
                status=status,
                error_message=json_error if json_error else None
            )
            logger.info(f"✅ WebhookEvent created: ID {webhook_event.id}")
            logger.info(f"✅ Platform: {webhook_event.platform}")
            logger.info(f"✅ Snapshot ID: {webhook_event.snapshot_id}")
            logger.info(f"✅ Status: {webhook_event.status}")
            logger.info(f"✅ Created at: {webhook_event.received_at}")
            if json_error:
                logger.info(f"✅ Error message: {webhook_event.error_message}")
        except Exception as e:
            logger.error(f"❌ Failed to save webhook event to database: {str(e)}")
            logger.error(f"❌ Exception type: {type(e).__name__}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            # Even if we can't save to DB, we should still try to process

        # 7. NOW VALIDATE AND PROCESS
        if json_error:
            logger.error(f"❌ JSON validation failed: {json_error}")
            processing_time = round(time.time() - start_time, 3)
            logger.info("="*80)
            return JsonResponse({
                'status': 'json_error',
                'message': 'Invalid JSON payload',
                'details': json_error,
                'webhook_event_id': webhook_event.id if webhook_event else None,
                'processing_time': processing_time
            }, status=400)

        # Check if this is a test payload
        if is_test_webhook:
            logger.warning(f"🧪 TEST WEBHOOK DETECTED")
            logger.warning(f"📋 Test payload data: {data}")
            logger.warning(f"📨 Headers: {dict(request.headers)}")
            logger.warning(f"🔍 Query params: {dict(request.GET)}")
            
            # Update status to indicate it was processed
            if webhook_event:
                webhook_event.status = 'test_processed'
                webhook_event.save()

            processing_time = round(time.time() - start_time, 3)
            logger.info(f"✅ Test webhook received successfully in {processing_time}s")
            logger.info("="*80)

            return JsonResponse({
                'status': 'test_received',
                'message': 'Test webhook received successfully',
                'webhook_event_id': webhook_event.id if webhook_event else None,
                'processing_time': processing_time,
                'note': 'This was a test webhook from BrightData. Real scraping webhooks will contain snapshot_id.'
            })

        logger.info(f"✅ Metadata extracted successfully")

        # 8. PROCESS REAL WEBHOOK DATA
        # Handle BrightData file_url payload format
        if isinstance(data, dict) and 'file_url' in data:
            logger.info(f"BrightData sent file_url: {data['file_url']}")
            try:
                response = requests.get(data['file_url'], timeout=30)
                response.raise_for_status()
                posts_data = response.json()
                logger.info(f"Successfully fetched {len(posts_data) if isinstance(posts_data, list) else 1} posts from file_url")
                # Update the data with the fetched content
                data['fetched_data'] = posts_data
            except Exception as e:
                logger.error(f"Failed to fetch data from file_url: {str(e)}")
                if webhook_event:
                    webhook_event.status = 'file_url_error'
                    webhook_event.error_message = f'Failed to fetch data from file_url: {str(e)}'
                    webhook_event.save()
                return JsonResponse({
                    'status': 'error',
                    'message': f'Failed to fetch data from file_url: {str(e)}',
                    'webhook_event_id': webhook_event.id if webhook_event else None,
                    'snapshot_id': snapshot_id
                }, status=500)
        else:
            # Direct data format
            posts_data = data if isinstance(data, list) else data.get('data', [])
            logger.info(f"Processing direct data format with {len(posts_data) if isinstance(posts_data, list) else 1} items")

        # 9. PROCESS THE ACTUAL DATA
        logger.info("🔄 PROCESSING WEBHOOK DATA:")
        
        # NEW: Find ScrapingJob directly by snapshot_id
        scrape_job = None
        try:
            from workflow.models import ScrapingJob
            scrape_job = ScrapingJob.objects.filter(snapshot_id=snapshot_id).first()
            if scrape_job:
                logger.info(f"✅ Found ScrapingJob directly by snapshot_id: {scrape_job.id}")
                # Update job webhook status
                scrape_job.webhook_received_at = timezone.now()
                scrape_job.webhook_status = 'received'
                scrape_job.save()
            else:
                logger.warning(f"⚠️  No ScrapingJob found with snapshot_id: {snapshot_id}")
        except Exception as e:
            logger.warning(f"⚠️  Error finding ScrapingJob: {str(e)}")
        
        # Find associated scraper requests for this snapshot_id (for backward compatibility)
        scraper_requests = []
        try:
            scraper_requests = ScraperRequest.objects.filter(
                request_id=snapshot_id
            ).order_by('created_at')
            logger.info(f"📋 Found {len(scraper_requests)} scraper requests for snapshot_id: {snapshot_id}")
            
            # Update ScraperRequest webhook status
            for req in scraper_requests:
                req.webhook_received_at = timezone.now()
                req.webhook_status = 'received'
                req.data_webhook_id = snapshot_id
                req.save()
                
        except Exception as e:
            logger.warning(f"⚠️  Error finding scraper requests: {str(e)}")
        
        # Process the data
        try:
            # 🔧 FIX 2: Ensure processing function exists and works
            if not callable(_process_webhook_data_with_batch_support):
                raise Exception("_process_webhook_data_with_batch_support function is not callable")
            
            logger.info(f"🔄 Calling _process_webhook_data_with_batch_support with platform: {platform}")
            success = _process_webhook_data_with_batch_support(posts_data, platform, scraper_requests, scrape_job)
            
            if success:
                logger.info(f"✅ Data processing completed successfully")
                # Update job status to completed
                if scrape_job:
                    scrape_job.status = 'completed'
                    scrape_job.webhook_status = 'processed'
                    scrape_job.save()
            else:
                logger.warning(f"⚠️  Data processing completed with warnings")
                
        except NameError as e:
            logger.error(f"❌ _process_webhook_data_with_batch_support function not found: {str(e)}")
            if webhook_event:
                webhook_event.status = 'processing_error'
                webhook_event.error_message = f'Processing function not found: {str(e)}'
                webhook_event.save()
            return JsonResponse({
                'status': 'processing_error',
                'message': f'Processing function not found: {str(e)}',
                'webhook_event_id': webhook_event.id if webhook_event else None,
                'snapshot_id': snapshot_id
            }, status=500)
        except Exception as e:
            logger.error(f"❌ Error processing data: {str(e)}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            if webhook_event:
                webhook_event.status = 'processing_error'
                webhook_event.error_message = f'Data processing error: {str(e)}'
                webhook_event.save()
            return JsonResponse({
                'status': 'processing_error',
                'message': f'Error processing data: {str(e)}',
                'webhook_event_id': webhook_event.id if webhook_event else None,
                'snapshot_id': snapshot_id,
                'processing_time': round(time.time() - start_time, 3)
            }, status=500)

        # 10. UPDATE STATUS TO PROCESSED
        if webhook_event:
            webhook_event.status = 'processed'
            webhook_event.save()
            logger.info(f"✅ WebhookEvent status updated to 'processed'")

        processing_time = round(time.time() - start_time, 3)
        logger.info(f"✅ Webhook processed successfully: {snapshot_id} in {processing_time}s")
        logger.info("="*80)

        return JsonResponse({
            'status': 'processed',
            'message': 'Webhook data processed successfully',
            'webhook_event_id': webhook_event.id if webhook_event else None,
            'snapshot_id': snapshot_id,
            'processing_time': processing_time
        })

    except Exception as e:
        logger.error(f"❌ Error processing webhook: {str(e)}")
        logger.error(f"❌ Exception type: {type(e).__name__}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        # 🔧 FIX 5: Wrap webhook_event references safely
        if webhook_event:
            webhook_event.status = 'error'
            webhook_event.error_message = str(e)
            webhook_event.save()
            logger.info(f"✅ WebhookEvent status updated to 'error'")
        
        logger.error("="*80)
        return JsonResponse({
            'error': 'Internal server error',
            'details': str(e),
            'webhook_event_id': webhook_event.id if webhook_event else None,
            'processing_time': round(time.time() - start_time, 3)
        }, status=500)

def _detect_platform_from_data(data):
    """
    🔧 FIX 1: Improved platform detection from data content
    """
    logger = logging.getLogger(__name__)
    
    if not data:
        return 'instagram'  # Default fallback
    
    # If data is a list, check the first item
    if isinstance(data, list) and len(data) > 0:
        first_item = data[0]
    elif isinstance(data, dict):
        # If data is a dict, check if it has 'data' key
        if 'data' in data and isinstance(data['data'], list) and len(data['data']) > 0:
            first_item = data['data'][0]
        else:
            first_item = data
    else:
        return 'instagram'  # Default fallback
    
    if not isinstance(first_item, dict):
        return 'instagram'  # Default fallback
    
    # LinkedIn-specific field detection (more specific)
    linkedin_fields = [
        'user_id', 'use_url', 'user_title', 'post_text', 'post_text_html',
        'num_likes', 'num_shares', 'user_followers', 'user_posts', 'user_articles',
        'num_connections', 'post_type', 'account_type', 'external_link_data',
        'embedded_links', 'document_cover_image', 'document_page_count',
        'tagged_companies', 'tagged_people', 'repost_data', 'author_profile_pic'
    ]
    
    # Facebook-specific field detection
    facebook_fields = [
        'facebook_id', 'facebook_url', 'facebook_user', 'page_name', 'profile_id',
        'page_intro', 'page_category', 'page_logo', 'page_external_website',
        'page_likes', 'page_followers', 'page_is_verified', 'page_phone',
        'page_email', 'page_creation_time', 'page_reviews_score',
        'page_reviewers_amount', 'page_price_range', 'attachments_data',
        'post_external_image', 'page_url', 'header_image', 'avatar_image_url',
        'profile_handle', 'is_sponsored', 'shortcode', 'is_page', 'about',
        'active_ads_urls', 'delegate_page_id', 'post_type', 'timestamp',
        'input', 'num_likes_type', 'count_reactions_type'
    ]
    
    # Instagram-specific field detection
    instagram_fields = [
        'instagram_id', 'instagram_url', 'instagram_user', 'instagram_pk',
        'content_id', 'content_type', 'platform_type', 'product_type',
        'user_posted_id', 'followers', 'posts_count', 'following',
        'profile_image_link', 'user_profile_url', 'profile_url',
        'is_verified', 'is_paid_partnership', 'partnership_details',
        'coauthor_producers', 'location', 'latest_comments', 'top_comments',
        'engagement_score', 'engagement_score_view', 'tagged_users',
        'audio', 'post_content', 'videos_duration', 'images',
        'photos_number', 'alt_text', 'discovery_input', 'has_handshake'
    ]
    
    # TikTok-specific field detection
    tiktok_fields = [
        'tiktok_id', 'tiktok_url', 'tiktok_user', 'video_play_count',
        'video_view_count', 'length', 'video_url', 'audio_url'
    ]
    
    # Count matches for each platform
    linkedin_matches = sum(1 for field in linkedin_fields if field in first_item)
    facebook_matches = sum(1 for field in facebook_fields if field in first_item)
    instagram_matches = sum(1 for field in instagram_fields if field in first_item)
    tiktok_matches = sum(1 for field in tiktok_fields if field in first_item)
    
    logger.info(f"Platform detection scores - LinkedIn: {linkedin_matches}, Facebook: {facebook_matches}, Instagram: {instagram_matches}, TikTok: {tiktok_matches}")
    
    # Return platform with highest match count, with minimum threshold
    max_matches = max(linkedin_matches, facebook_matches, instagram_matches, tiktok_matches)
    
    if max_matches >= 3:  # Minimum threshold to avoid false positives
        if linkedin_matches == max_matches:
            return 'linkedin'
        elif facebook_matches == max_matches:
            return 'facebook'
        elif instagram_matches == max_matches:
            return 'instagram'
        elif tiktok_matches == max_matches:
            return 'tiktok'
    
    # Fallback: try to detect from URL patterns
    url = first_item.get('url', '')
    if 'linkedin.com' in url:
        return 'linkedin'
    elif 'facebook.com' in url:
        return 'facebook'
    elif 'instagram.com' in url:
        return 'instagram'
    elif 'tiktok.com' in url:
        return 'tiktok'
    
    logger.warning(f"⚠️  Could not detect platform from data, using default: instagram")
    return 'instagram'  # Default fallback

@csrf_exempt
def webhook_test(request):
    """
    Simple test endpoint to verify webhook accessibility
    """
    import logging
    from datetime import datetime
    
    logger = logging.getLogger(__name__)
    
    logger.info("="*80)
    logger.info(f"🧪 WEBHOOK TEST ENDPOINT HIT AT {datetime.now()}")
    logger.info("="*80)
    logger.info(f"📡 Method: {request.method}")
    logger.info(f"🌐 Client IP: {request.META.get('REMOTE_ADDR', 'unknown')}")
    logger.info(f"🔗 URL: {request.build_absolute_uri()}")
    logger.info(f"📨 Headers: {dict(request.headers)}")
    
    return JsonResponse({
        'status': 'success',
        'message': 'Webhook test endpoint is accessible',
        'timestamp': datetime.now().isoformat(),
        'method': request.method,
        'client_ip': request.META.get('REMOTE_ADDR', 'unknown')
    })

@csrf_exempt
@require_http_methods(["POST"])
def brightdata_notify(request):
    """
    Job status notification endpoint to receive status updates from BrightData
    This handles the notify_url webhook flow for job execution updates
    """
    import time
    import traceback
    from datetime import datetime
    
    logger = logging.getLogger(__name__)
    
    # 1. CONFIRM DJANGO RECEIVES THE REQUEST
    logger.info("="*80)
    logger.info(f"📩 JOB STATUS WEBHOOK RECEIVED AT {datetime.now()}")
    logger.info("="*80)
    logger.info(f"📡 Method: {request.method}")
    logger.info(f"🌐 Client IP: {request.META.get('REMOTE_ADDR', 'unknown')}")
    logger.info(f"🔗 URL: {request.build_absolute_uri()}")
    logger.info(f"📋 Content-Type: {request.content_type}")
    logger.info(f"📏 Content-Length: {request.META.get('CONTENT_LENGTH', 'unknown')}")
    logger.info(f"📨 Headers: {dict(request.headers)}")
    
    start_time = time.time()
    
    try:
        # 2. PARSE NOTIFICATION DATA
        logger.info("🔍 PARSING JOB STATUS PAYLOAD:")
        
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body.decode("utf-8"))
                logger.info(f"✅ JSON parsed successfully")
                logger.info(f"📄 Raw payload: {str(data)[:500]}...")
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON decode error: {e}")
                return JsonResponse({'error': 'Invalid JSON'}, status=400)
        else:
            # Handle form-encoded data
            data = dict(request.POST.items())
            logger.info(f"✅ Form data parsed: {str(data)[:500]}...")

        # 3. EXTRACT JOB STATUS INFORMATION
        # Handle both snapshot_id/id and status/state field variations
        snapshot_id = data.get('snapshot_id') or data.get('id') or data.get('request_id')
        status = data.get('status') or data.get('state', 'unknown')
        dataset_id = data.get('dataset_id')
        error_message = data.get('error') or data.get('message', '')
        created_at = data.get('created_at')
        finished_at = data.get('finished_at')
        
        logger.info(f"📋 Extracted job info:")
        logger.info(f"   Snapshot ID: {snapshot_id}")
        logger.info(f"   Status: {status}")
        logger.info(f"   Dataset ID: {dataset_id}")
        logger.info(f"   Error: {error_message}")
        logger.info(f"   Created: {created_at}")
        logger.info(f"   Finished: {finished_at}")

        # 4. SAVE RAW NOTIFICATION
        from .models import BrightdataNotification
        
        notification = BrightdataNotification.objects.create(
            snapshot_id=snapshot_id or 'unknown',
            status=status.lower() if status else 'unknown',
            message=error_message,
            raw_data=data,
            request_ip=request.META.get('REMOTE_ADDR'),
            request_headers=dict(request.headers),
            processed_at=timezone.now()
        )
        logger.info(f"✅ Saved notification record: ID {notification.id}")

        # 5. UPDATE SCRAPER REQUEST STATUS
        scraper_request = None
        if snapshot_id:
            try:
                scraper_request = ScraperRequest.objects.get(request_id=snapshot_id)
                logger.info(f"✅ Found ScraperRequest {scraper_request.id} for snapshot_id: {snapshot_id}")

                # Update status based on notification
                old_status = scraper_request.status

                if status.lower() in ['completed', 'finished', 'done']:
                    scraper_request.status = 'completed'
                    scraper_request.completed_at = timezone.now()
                    logger.info(f"✅ Updated ScraperRequest {scraper_request.id} status: {old_status} → completed")

                elif status.lower() in ['failed', 'error', 'cancelled']:
                    scraper_request.status = 'failed'
                    scraper_request.error_message = error_message
                    scraper_request.completed_at = timezone.now()
                    logger.info(f"✅ Updated ScraperRequest {scraper_request.id} status: {old_status} → failed")

                elif status.lower() in ['running', 'processing', 'started']:
                    scraper_request.status = 'processing'
                    if not scraper_request.started_at:
                        scraper_request.started_at = timezone.now()
                    logger.info(f"✅ Updated ScraperRequest {scraper_request.id} status: {old_status} → processing")

                elif status.lower() in ['pending', 'queued']:
                    scraper_request.status = 'pending'
                    logger.info(f"✅ Updated ScraperRequest {scraper_request.id} status: {old_status} → pending")

                scraper_request.save()

            except ScraperRequest.DoesNotExist:
                logger.warning(f"⚠️  No ScraperRequest found for snapshot_id: {snapshot_id}")
        else:
            logger.warning(f"⚠️  No snapshot_id provided in notification")

        # 6. UPDATE BATCH JOB STATUS
        if scraper_request and scraper_request.batch_job:
            batch_job = scraper_request.batch_job
            old_batch_status = batch_job.status
            
            # Update batch job status based on scraper request status
            if scraper_request.status == 'completed':
                batch_job.status = 'completed'
                batch_job.completed_at = timezone.now()
            elif scraper_request.status == 'failed':
                batch_job.status = 'failed'
                batch_job.error_log = error_message
                batch_job.completed_at = timezone.now()
            elif scraper_request.status == 'processing':
                batch_job.status = 'processing'
                if not batch_job.started_at:
                    batch_job.started_at = timezone.now()
            elif scraper_request.status == 'pending':
                batch_job.status = 'pending'
            
            batch_job.save()
            logger.info(f"✅ Updated BatchScraperJob {batch_job.id} status: {old_batch_status} → {batch_job.status}")

        # 7. UPDATE WORKFLOW ENTITIES
        if scraper_request and scraper_request.batch_job:
            try:
                # Update WorkflowTask statuses
                from workflow.models import WorkflowTask
                workflow_tasks = WorkflowTask.objects.filter(batch_job=scraper_request.batch_job)
                for workflow_task in workflow_tasks:
                    if workflow_task.status != scraper_request.status:
                        workflow_task.status = scraper_request.status
                        workflow_task.save()
                        logger.info(f"✅ Updated WorkflowTask {workflow_task.id} status: {workflow_task.status}")

                # Update ScrapingJob statuses
                from workflow.models import ScrapingJob
                scraping_jobs = ScrapingJob.objects.filter(batch_job=scraper_request.batch_job)
                for scraping_job in scraping_jobs:
                    if scraping_job.status != scraper_request.status:
                        scraping_job.status = scraper_request.status
                        if scraper_request.status == 'completed':
                            scraping_job.completed_at = timezone.now()
                        elif scraper_request.status == 'failed':
                            scraping_job.error_message = error_message
                            scraping_job.completed_at = timezone.now()
                        scraping_job.save()
                        logger.info(f"✅ Updated ScrapingJob {scraping_job.id} status: {scraping_job.status}")

            except Exception as e:
                logger.error(f"❌ Error updating workflow entities: {str(e)}")

        processing_time = round(time.time() - start_time, 3)
        logger.info(f"✅ Job status webhook processed successfully in {processing_time}s")
        logger.info("="*80)

        return JsonResponse({
            'status': 'success',
            'message': 'Job status notification processed successfully',
            'notification_id': notification.id,
            'scraper_request_updated': scraper_request is not None,
            'processing_time': processing_time
        })

    except Exception as e:
        logger.error(f"❌ Error processing job status webhook: {str(e)}")
        logger.error(f"❌ Exception type: {type(e).__name__}")
        logger.error(f"❌ Traceback: {traceback.format_exc()}")
        
        logger.error("="*80)
        return JsonResponse({
            'error': 'Internal server error',
            'details': str(e),
            'processing_time': round(time.time() - start_time, 3)
        }, status=500)

def _verify_webhook_auth(auth_header: str) -> bool:
    """
    Verify webhook authentication
    """
    try:
        # Get webhook auth token from BrightData config
        # You can store this in your BrightdataConfig model or settings
        from django.conf import settings
        expected_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'your-webhook-secret-token')

        # Support both "Bearer token" and "token" formats
        token = auth_header.replace('Bearer ', '').strip()
        return token == expected_token

    except Exception as e:
        logger.error(f"Error verifying webhook auth: {str(e)}")
        return False

def _process_webhook_data_with_batch_support(data, platform: str, scraper_requests, scrape_job=None):
    """
    Process incoming webhook data with support for batch jobs (multiple scraper requests)
    Uses pre-created platform-specific folders instead of creating them during webhook processing
    """
    from datetime import datetime
    from django.utils import timezone
    try:
        # Import platform-specific models
        from facebook_data.models import FacebookPost
        from instagram_data.models import InstagramPost
        from linkedin_data.models import LinkedInPost
        from tiktok_data.models import TikTokPost

        # Platform to model mapping
        platform_models = {
            'facebook': FacebookPost,
            'instagram': InstagramPost,
            'linkedin': LinkedInPost,
            'tiktok': TikTokPost,
        }

        PostModel = platform_models.get(platform.lower())
        if not PostModel:
            logger.error(f"No model found for platform: {platform}")
            return False

        # Extract posts from data
        posts_data = data if isinstance(data, list) else data.get('data', [])

        # Filter out invalid entries (warnings, errors, entries without required fields)
        valid_posts = []
        skipped_count = 0

        for post_data in posts_data:
            # Skip entries with warnings or errors
            if post_data.get('warning') or post_data.get('error') or post_data.get('warning_code'):
                skipped_count += 1
                logger.info(f"Skipping warning/error entry: {post_data.get('warning', post_data.get('error', 'Unknown warning'))}")
                continue

            # Skip entries without essential fields
            if platform.lower() == 'instagram':
                # For Instagram, we need either 'url' or 'post_id'
                if not (post_data.get('url') or post_data.get('post_id') or post_data.get('pk')):
                    skipped_count += 1
                    logger.info(f"Skipping Instagram entry without URL or post_id: {post_data}")
                    continue
            elif platform.lower() == 'facebook':
                # For Facebook, we need either 'url' or 'post_id'
                if not (post_data.get('url') or post_data.get('post_id')):
                    skipped_count += 1
                    logger.info(f"Skipping Facebook entry without URL or post_id: {post_data}")
                    continue
            else:
                # For other platforms, we need at least 'url' or 'post_id'
                if not (post_data.get('url') or post_data.get('post_id') or post_data.get('id')):
                    skipped_count += 1
                    logger.info(f"Skipping {platform} entry without URL or ID: {post_data}")
                    continue

            valid_posts.append(post_data)

        logger.info(f"Processing {len(valid_posts)} valid posts, skipped {skipped_count} invalid entries")

        # NEW: Get pre-created platform-specific folder from ScrapingJob
        platform_folder = None
        if scrape_job:
            try:
                # Get the pre-created folder for this platform using unified_job_folder
                if platform.lower() == 'instagram':
                    from instagram_data.models import Folder
                    platform_folder = Folder.objects.filter(unified_job_folder=scrape_job).first()
                elif platform.lower() == 'facebook':
                    from facebook_data.models import Folder
                    platform_folder = Folder.objects.filter(unified_job_folder=scrape_job).first()
                elif platform.lower() == 'linkedin':
                    from linkedin_data.models import Folder
                    platform_folder = Folder.objects.filter(unified_job_folder=scrape_job).first()
                elif platform.lower() == 'tiktok':
                    from tiktok_data.models import Folder
                    platform_folder = Folder.objects.filter(unified_job_folder=scrape_job).first()
                
                if platform_folder:
                    logger.info(f"✅ Found pre-created {platform} folder: {platform_folder.id} for job: {scrape_job.id}")
                else:
                    logger.warning(f"⚠️  No pre-created {platform} folder found for job: {scrape_job.id}")
                    
            except Exception as e:
                logger.error(f"Error finding pre-created folder: {str(e)}")

        # Fallback: Use legacy folder creation if no pre-created folder found
        if not platform_folder and scraper_requests:
            logger.info(f"Using legacy folder creation as fallback")
            # Use the folder_id from the first request (all should be the same now)
            shared_folder_id = scraper_requests[0].folder_id
            logger.info(f"✅ Using SHARED folder_id: {shared_folder_id} for ALL posts in this batch")

            # Log all folder_ids to verify they're the same
            folder_ids = [req.folder_id for req in scraper_requests if req.folder_id]
            if len(set(folder_ids)) > 1:
                logger.warning(f"⚠️  Multiple folder_ids found in batch: {folder_ids}. Using first one: {shared_folder_id}")
            else:
                logger.info(f"✅ All {len(scraper_requests)} requests use the same folder_id: {shared_folder_id}")

            # Legacy folder creation logic (simplified)
            if shared_folder_id:
                try:
                    from track_accounts.models import UnifiedRunFolder
                    unified_folder = UnifiedRunFolder.objects.get(id=shared_folder_id)
                    
                    # Create platform-specific folder as fallback
                    if platform.lower() == 'instagram':
                        from instagram_data.models import Folder
                    elif platform.lower() == 'facebook':
                        from facebook_data.models import Folder
                    elif platform.lower() == 'linkedin':
                        from linkedin_data.models import Folder
                    elif platform.lower() == 'tiktok':
                        from tiktok_data.models import Folder
                    else:
                        Folder = None

                    if Folder is not None:
                        platform_folder, created = Folder.objects.get_or_create(
                            unified_job_folder=unified_folder,
                            defaults={
                                'name': unified_folder.name,
                                'description': f'Created from UnifiedRunFolder {unified_folder.id}',
                                'project_id': unified_folder.project_id,
                                'scraping_run': unified_folder.scraping_run
                            }
                        )
                        if created:
                            logger.info(f"✅ Created fallback {platform} folder: {platform_folder.id}")
                        else:
                            logger.info(f"✅ Using existing fallback {platform} folder: {platform_folder.id}")
                            
                except UnifiedRunFolder.DoesNotExist:
                    logger.error(f"UnifiedRunFolder with ID {shared_folder_id} not found")
                except Exception as e:
                    logger.error(f"Error in fallback folder creation: {str(e)}")

        created_count = 0

        for post_data in valid_posts:
            try:
                # Map common fields
                post_fields = _map_post_fields(post_data, platform)

                # NEW: Use pre-created platform folder
                if platform_folder:
                    post_fields['folder'] = platform_folder
                    logger.info(f"✅ Using pre-created platform folder: {platform_folder.id} for post")
                else:
                    logger.warning(f"⚠️  No platform folder found for {platform} posts")
                    
                # NEW: Add webhook tracking
                post_fields['webhook_snapshot_id'] = scraper_requests[0].request_id if scraper_requests else None
                post_fields['webhook_received_at'] = timezone.now()

                # Create or update post
                post_id = post_data.get('post_id') or post_data.get('id') or post_data.get('pk')
                if post_id:
                    # For all platforms, check uniqueness by post_id and folder (if folder exists)
                    folder = post_fields.get('folder')
                    
                    # FALLBACK: If no folder assigned, try to find or create one
                    if not folder and scraper_requests:
                        try:
                            # Try to get the folder from the first scraper request
                            shared_folder_id = scraper_requests[0].folder_id
                            if shared_folder_id:
                                from track_accounts.models import UnifiedRunFolder
                                unified_folder = UnifiedRunFolder.objects.get(id=shared_folder_id)
                                
                                # Try to get or create platform folder
                                if platform.lower() == 'facebook':
                                    from facebook_data.models import Folder
                                    folder, created = Folder.objects.get_or_create(
                                        unified_job_folder=unified_folder,
                                        defaults={
                                            'name': unified_folder.name,
                                            'description': f'Created from UnifiedRunFolder {unified_folder.id}',
                                            'project_id': unified_folder.project_id,
                                            'scraping_run': unified_folder.scraping_run
                                        }
                                    )
                                    if created:
                                        logger.info(f"✅ Created fallback Facebook folder: {folder.id}")
                                    post_fields['folder'] = folder
                        except Exception as e:
                            logger.error(f"Error in fallback folder creation: {str(e)}")
                    
                    if folder:
                        # If post has a folder, check uniqueness by post_id and folder
                        post, created = PostModel.objects.get_or_create(
                            post_id=post_id,
                            folder=folder,
                            defaults=post_fields
                        )
                    else:
                        # If no folder, check uniqueness by post_id only
                        post, created = PostModel.objects.get_or_create(
                            post_id=post_id,
                            defaults=post_fields
                        )
                    if created:
                        created_count += 1
                        user_posted = post_data.get('user_posted', 'Unknown')
                        logger.info(f"✅ Created new {platform} post: {post_id} from @{user_posted} in folder: {folder.name if folder else 'No folder'}")
                        
                        # Process LinkedIn comments if this is a LinkedIn post
                        if platform.lower() == 'linkedin':
                            try:
                                from linkedin_data.models import LinkedInComment
                                from datetime import datetime
                                
                                comments_data = post_data.get('top_visible_comments', [])
                                if comments_data:
                                    logger.info(f"Processing {len(comments_data)} LinkedIn comments for post {post_id}")
                                    
                                    for comment_data in comments_data:
                                        try:
                                            # Convert comment date
                                            comment_date = comment_data.get('comment_date')
                                            if comment_date and isinstance(comment_date, str):
                                                try:
                                                    comment_date = datetime.fromisoformat(comment_date.replace('Z', '+00:00'))
                                                except:
                                                    comment_date = None
                                            
                                            # Create comment
                                            comment, comment_created = LinkedInComment.objects.get_or_create(
                                                comment_id=comment_data.get('comment_id', ''),
                                                post=post,
                                                defaults={
                                                    'folder': folder,
                                                    'comment_text': comment_data.get('comment', ''),
                                                    'comment_date': comment_date,
                                                    'user_id': comment_data.get('user_id', ''),
                                                    'user_name': comment_data.get('user_name', ''),
                                                    'user_url': comment_data.get('use_url', ''),
                                                    'user_title': comment_data.get('user_title', ''),
                                                    'num_reactions': comment_data.get('num_reactions', 0),
                                                    'tagged_users': comment_data.get('tagged_users', []),
                                                }
                                            )
                                            if comment_created:
                                                logger.info(f"✅ Created LinkedIn comment: {comment.comment_id}")
                                        except Exception as e:
                                            logger.error(f"Error processing LinkedIn comment: {str(e)}")
                                            continue
                            except Exception as e:
                                logger.error(f"Error processing LinkedIn comments: {str(e)}")
                    else:
                        logger.info(f"Updated existing {platform} post: {post_id}")

            except Exception as e:
                logger.error(f"Error processing {platform} post: {str(e)}")
                continue

        logger.info(f"✅ Successfully processed {created_count} new {platform} posts")
        return True

    except Exception as e:
        logger.error(f"Error in _process_webhook_data_with_batch_support: {str(e)}")
        return False

def _process_webhook_data(data, platform: str, scraper_request=None):
    """
    Legacy function - redirects to batch support version
    """
    scraper_requests = [scraper_request] if scraper_request else []
    return _process_webhook_data_with_batch_support(data, platform, scraper_requests)

def _map_post_fields(post_data: dict, platform: str) -> dict:
    """
    Map BrightData post fields to our model fields based on actual BrightData JSON structure
    """

    if platform.lower() == 'instagram':
        # Map Instagram-specific fields based on actual BrightData structure
        mapped_data = {
            'url': post_data.get('url', ''),
            'post_id': post_data.get('post_id', '') or post_data.get('pk', ''),
            'user_posted': post_data.get('user_posted', '') or post_data.get('user_name', '') or post_data.get('username', ''),
            'description': post_data.get('description', '') or post_data.get('caption', '') or post_data.get('text', ''),
            'hashtags': post_data.get('hashtags', []),
            'num_comments': post_data.get('num_comments', 0) or post_data.get('comments', 0) or post_data.get('comments_count', 0),
            'date_posted': post_data.get('date_posted', '') or post_data.get('date', '') or post_data.get('timestamp', ''),
            'likes': post_data.get('likes', 0) or post_data.get('likes_count', 0),
            'photos': post_data.get('photos', []),
            'videos': post_data.get('videos', []),
            'thumbnail': post_data.get('thumbnail', ''),
            'views': post_data.get('views', 0),
            'video_play_count': post_data.get('video_play_count', 0),
            'video_view_count': post_data.get('video_view_count', 0),
            'length': post_data.get('length', ''),
            'video_url': post_data.get('video_url', ''),
            'audio_url': post_data.get('audio_url', ''),
            'shortcode': post_data.get('shortcode', ''),
            'content_id': post_data.get('content_id', ''),
            'instagram_pk': post_data.get('pk', '') or post_data.get('instagram_pk', ''),
            'content_type': post_data.get('content_type', ''),
            'platform_type': post_data.get('platform_type', ''),
            'product_type': post_data.get('product_type', ''),
            'user_posted_id': post_data.get('user_posted_id', '') or post_data.get('user_id', ''),
            'followers': post_data.get('followers', 0),
            'posts_count': post_data.get('posts_count', 0),
            'following': post_data.get('following', 0),
            'profile_image_link': post_data.get('profile_image_link', ''),
            'user_profile_url': post_data.get('user_profile_url', ''),
            'profile_url': post_data.get('profile_url', ''),
            'is_verified': post_data.get('is_verified', False),
            'is_paid_partnership': post_data.get('is_paid_partnership', False),
            'partnership_details': post_data.get('partnership_details', {}),
            'coauthor_producers': post_data.get('coauthor_producers', []),
            'location': post_data.get('location', ''),
            'latest_comments': post_data.get('latest_comments', []),
            'top_comments': post_data.get('top_comments', []),
            'engagement_score': post_data.get('engagement_score', 0.0),
            'engagement_score_view': post_data.get('engagement_score_view', 0),
            'tagged_users': post_data.get('tagged_users', []),
            'audio': post_data.get('audio', {}),
            'post_content': post_data.get('post_content', {}),
            'videos_duration': post_data.get('videos_duration', {}),
            'images': post_data.get('images', []),
            'photos_number': post_data.get('photos_number', 0),
            'alt_text': post_data.get('alt_text', ''),
            'discovery_input': post_data.get('discovery_input', ''),
            'has_handshake': post_data.get('has_handshake', False),
        }
        return mapped_data

    elif platform.lower() == 'facebook':
        # Map Facebook-specific fields based on actual BrightData structure
        mapped_data = {
            'url': post_data.get('url', ''),
            'post_id': post_data.get('post_id', ''),
            'user_url': post_data.get('user_url', ''),
            'user_username_raw': post_data.get('user_username_raw', ''),
            'content': post_data.get('content', ''),
            'date_posted': post_data.get('date_posted'),
            'num_comments': post_data.get('num_comments', 0),
            'num_shares': post_data.get('num_shares', 0),
            'likes': post_data.get('likes', 0),
            'video_view_count': post_data.get('video_view_count'),
            'page_name': post_data.get('page_name', ''),
            'profile_id': post_data.get('profile_id', ''),
            'page_intro': post_data.get('page_intro', ''),
            'page_category': post_data.get('page_category', ''),
            'page_logo': post_data.get('page_logo', ''),
            'page_external_website': post_data.get('page_external_website', ''),
            'page_likes': post_data.get('page_likes'),
            'page_followers': post_data.get('page_followers'),
            'page_is_verified': post_data.get('page_is_verified', False),
            'page_phone': post_data.get('page_phone', ''),
            'page_email': post_data.get('page_email', ''),
            'page_creation_time': post_data.get('page_creation_time'),
            'page_reviews_score': post_data.get('page_reviews_score', ''),
            'page_reviewers_amount': post_data.get('page_reviewers_amount'),
            'page_price_range': post_data.get('page_price_range', ''),
            'attachments_data': post_data.get('attachments'),
            'post_external_image': post_data.get('post_external_image'),
            'page_url': post_data.get('page_url', ''),
            'header_image': post_data.get('header_image', ''),
            'avatar_image_url': post_data.get('avatar_image_url', ''),
            'profile_handle': post_data.get('profile_handle', ''),
            'is_sponsored': post_data.get('is_sponsored', False),
            'shortcode': post_data.get('shortcode', ''),
            'is_page': post_data.get('is_page', False),
            'about': post_data.get('about'),
            'active_ads_urls': post_data.get('active_ads_urls'),
            'delegate_page_id': post_data.get('delegate_page_id', ''),
            'post_type': post_data.get('post_type', ''),
            'timestamp': post_data.get('timestamp'),
            'input': post_data.get('input'),
            'num_likes_type': post_data.get('num_likes_type'),
            'count_reactions_type': post_data.get('count_reactions_type'),
        }
        return mapped_data

    elif platform.lower() == 'linkedin':
        # Map LinkedIn-specific fields based on actual BrightData structure
        from datetime import datetime
        
        # Convert date string to datetime if needed
        date_posted = post_data.get('date_posted')
        if date_posted and isinstance(date_posted, str):
            try:
                date_posted = datetime.fromisoformat(date_posted.replace('Z', '+00:00'))
            except:
                date_posted = None
        
        mapped_data = {
            # Core post fields
            'url': post_data.get('url', ''),
            'post_id': post_data.get('id') or post_data.get('post_id', ''),
            'user_id': post_data.get('user_id', ''),
            'user_posted': post_data.get('user_posted', '') or post_data.get('user_name', '') or post_data.get('title', ''),
            'user_url': post_data.get('use_url') or post_data.get('user_url', ''),
            'user_title': post_data.get('user_title', ''),
            'user_headline': post_data.get('headline', ''),
            'description': post_data.get('description', ''),
            'hashtags': post_data.get('hashtags', []),
            'num_comments': post_data.get('num_comments', 0),
            'date_posted': date_posted,
            'likes': post_data.get('likes', 0),
            'photos': post_data.get('photos', ''),
            'videos': post_data.get('videos', ''),
            'location': post_data.get('location', ''),
            'latest_comments': post_data.get('latest_comments', []),
            'discovery_input': post_data.get('discovery_input', ''),
            'thumbnail': post_data.get('thumbnail', ''),
            'content_type': post_data.get('content_type', ''),
            'platform_type': post_data.get('platform_type', ''),
            'engagement_score': post_data.get('engagement_score', 0.0),
            'tagged_users': post_data.get('tagged_users', ''),
            'followers': post_data.get('followers', 0),
            'posts_count': post_data.get('posts_count', 0),
            'profile_image_link': post_data.get('profile_image_link', ''),
            'is_verified': post_data.get('is_verified', False),
            'is_paid_partnership': post_data.get('is_paid_partnership', False),
            
            # New LinkedIn-specific fields
            'post_title': post_data.get('title', ''),
            'post_text': post_data.get('post_text', ''),
            'post_text_html': post_data.get('post_text_html', ''),
            'num_likes': post_data.get('num_likes', 0),
            'num_shares': post_data.get('num_shares', 0),
            'user_followers': post_data.get('user_followers', 0),
            'user_posts': post_data.get('user_posts', 0),
            'user_articles': post_data.get('user_articles', 0),
            'num_connections': post_data.get('num_connections', 0),
            'post_type': post_data.get('post_type', ''),
            'account_type': post_data.get('account_type', ''),
            'images': post_data.get('images', []),
            'videos': post_data.get('videos', []),
            'video_duration': post_data.get('video_duration', 0),
            'video_thumbnail': post_data.get('video_thumbnail', ''),
            'external_link_data': post_data.get('external_link_data', []),
            'embedded_links': post_data.get('embedded_links', []),
            'document_cover_image': post_data.get('document_cover_image', ''),
            'document_page_count': post_data.get('document_page_count', 0),
            'tagged_companies': post_data.get('tagged_companies', []),
            'tagged_people': post_data.get('tagged_people', []),
            'repost_data': post_data.get('repost', {}),
            'author_profile_pic': post_data.get('author_profile_pic', ''),
        }
        return mapped_data

    # Generic mapping for other platforms
    common_mapping = {
        'url': post_data.get('url', ''),
        'post_id': post_data.get('post_id') or post_data.get('id', ''),
        'content': post_data.get('text') or post_data.get('content') or post_data.get('description', ''),
        'date_posted': post_data.get('date') or post_data.get('created_time') or post_data.get('timestamp'),
        'likes': post_data.get('likes_count') or post_data.get('likes') or 0,
        'num_comments': post_data.get('comments_count') or post_data.get('comments') or 0,
        'num_shares': post_data.get('shares_count') or post_data.get('shares') or 0,
        'user_posted': post_data.get('username') or post_data.get('author') or post_data.get('user', ''),
    }

    return common_mapping

class BatchScraperJobViewSet(viewsets.ModelViewSet):
    """API endpoint for automated batch scraper jobs"""
    queryset = BatchScraperJob.objects.all()
    serializer_class = BatchScraperJobSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production

    def get_serializer_class(self):
        if self.action == 'create':
            return BatchScraperJobCreateSerializer
        return self.serializer_class

    def get_queryset(self):
        """Filter by project if specified"""
        queryset = BatchScraperJob.objects.all()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['POST'])
    def execute(self, request, pk=None):
        """Execute a batch scraper job"""
        job = self.get_object()

        if job.status != 'pending':
            return Response({'error': 'Job can only be executed if it is in pending status'},
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            scraper = AutomatedBatchScraper()
            success = scraper.execute_batch_job(job.id)

            if success:
                return Response({'status': 'Job execution started successfully'})
            else:
                return Response({'error': 'Failed to start job execution'},
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({'error': f'Error executing job: {str(e)}'},
                           status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['POST'])
    def cancel(self, request, pk=None):
        """Cancel a batch scraper job"""
        job = self.get_object()

        if job.status in ['completed', 'failed', 'cancelled']:
            return Response({'error': 'Job cannot be cancelled in its current status'},
                           status=status.HTTP_400_BAD_REQUEST)

        job.status = 'cancelled'
        job.completed_at = timezone.now()
        job.save()

        return Response({'status': 'Job cancelled successfully'})

    def update(self, request, *args, **kwargs):
        """Update a batch scraper job"""
        try:
            # ===== DETAILED CONSOLE LOGGING FOR FRONTEND =====
            print("\n" + "="*80)
            print("🔄 BATCH JOB UPDATE - BACKEND DEBUG")
            print("="*80)
            print(f"Request Data: {request.data}")
            print(f"Request Method: {request.method}")
            print(f"Request Path: {request.path}")
            print("="*80)

            # Get the job instance
            job = self.get_object()
            
            # Update the job with the new data
            job.name = request.data.get('name', job.name)
            job.platforms_to_scrape = request.data.get('platforms_to_scrape', job.platforms_to_scrape)
            job.content_types_to_scrape = request.data.get('content_types_to_scrape', job.content_types_to_scrape)
            job.num_of_posts = request.data.get('num_of_posts', job.num_of_posts)
            job.start_date = request.data.get('start_date', job.start_date)
            job.end_date = request.data.get('end_date', job.end_date)
            job.auto_create_folders = request.data.get('auto_create_folders', job.auto_create_folders)
            job.output_folder_pattern = request.data.get('output_folder_pattern', job.output_folder_pattern)
            job.platform_params = request.data.get('platform_params', job.platform_params)
            
            job.save()

            print(f"✅ Job Updated:")
            print(f"   Job ID: {job.id}")
            print(f"   Job Name: {job.name}")
            print(f"   Platforms: {job.platforms_to_scrape}")
            print(f"   Content Types: {job.content_types_to_scrape}")
            print("="*80 + "\n")

            return Response({
                'job_id': job.id,
                'success': True,
                'message': 'Batch job updated successfully',
                'debug_info': {
                    'platforms': job.platforms_to_scrape,
                    'content_types': job.content_types_to_scrape,
                    'num_of_posts': job.num_of_posts,
                    'job_name': job.name
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"❌ Exception in update:")
            print(f"   Error: {str(e)}")
            print("="*80 + "\n")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['POST'])
    def create_and_execute(self, request):
        """Create and execute a batch scraper job"""
        try:
            # ===== DETAILED CONSOLE LOGGING FOR FRONTEND =====
            print("\n" + "="*80)
            print("🚀 BATCH JOB CREATE_AND_EXECUTE - BACKEND DEBUG")
            print("="*80)
            print(f"Request Data: {request.data}")
            print(f"Request Method: {request.method}")
            print(f"Request Path: {request.path}")
            print("="*80)

            job, success = create_and_execute_batch_job(
                name=request.data.get('name'),
                project_id=request.data.get('project'),
                source_folder_ids=request.data.get('source_folder_ids', []),
                platforms_to_scrape=request.data.get('platforms_to_scrape'),
                content_types_to_scrape=request.data.get('content_types_to_scrape', {}),
                num_of_posts=request.data.get('num_of_posts', 10),
                start_date=request.data.get('start_date'),
                end_date=request.data.get('end_date'),
                auto_create_folders=request.data.get('auto_create_folders', True),
                output_folder_pattern=request.data.get('output_folder_pattern'),
                platform_params=request.data.get('platform_params', {})
            )

            print(f"✅ Job Created and Executed:")
            print(f"   Job ID: {job.id}")
            print(f"   Job Name: {job.name}")
            print(f"   Success: {success}")
            print(f"   Platforms: {job.platforms_to_scrape}")
            print(f"   Content Types: {job.content_types_to_scrape}")
            print("="*80 + "\n")

            return Response({
                'job_id': job.id,
                'success': success,
                'message': f'Batch job {"completed successfully" if success else "failed"}',
                'debug_info': {
                    'platforms': job.platforms_to_scrape,
                    'content_types': job.content_types_to_scrape,
                    'num_of_posts': job.num_of_posts,
                    'job_name': job.name
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"❌ Exception in create_and_execute:")
            print(f"   Error: {str(e)}")
            print("="*80 + "\n")
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def scrape_comments(request):
    """
    Cross-platform comments scraping endpoint

    Expected payload:
    {
        "platform": "facebook_comments" | "instagram_comments",
        "post_urls": ["url1", "url2", ...],
        "comment_limit": 10,
        "get_all_replies": false,
        "result_folder_name": "Comments_Campaign_2024"
    }
    """
    try:
        # Get request parameters
        platform = request.data.get('platform')
        post_urls = request.data.get('post_urls', [])
        comment_limit = request.data.get('comment_limit', 10)
        get_all_replies = request.data.get('get_all_replies', False)
        result_folder_name = request.data.get('result_folder_name')

        # Validate required parameters
        if not platform:
            return Response({'error': 'Platform is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not post_urls or not isinstance(post_urls, list):
            return Response({'error': 'Post URLs list is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not result_folder_name:
            return Response({'error': 'Result folder name is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate platform is a comment platform
        if not platform.endswith('_comments'):
            return Response({'error': 'Invalid platform. Must be a comments platform (e.g., facebook_comments, instagram_comments)'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Check if configuration exists for the platform
        try:
            config = BrightdataConfig.objects.get(platform=platform, is_active=True)
        except BrightdataConfig.DoesNotExist:
            return Response({'error': f'No active configuration found for {platform}. Please configure it in BrightData Settings.'},
                          status=status.HTTP_400_BAD_REQUEST)

        # Determine the base platform (facebook, instagram)
        base_platform = platform.split('_')[0]

        # Import the appropriate service based on platform
        if base_platform == 'facebook':
            from facebook_data.services import scrape_facebook_comments_from_urls

            # Get project ID from request or default
            project_id = request.data.get('project_id', 1)

            # Use the URL-based Facebook comment scraper
            result, success = scrape_facebook_comments_from_urls(
                post_urls=post_urls,
                comment_limit=comment_limit,
                get_all_replies=get_all_replies,
                result_folder_name=result_folder_name,
                project_id=project_id
            )

            return Response({
                'success': success,
                'message': 'Facebook comment scraping job submitted successfully' if success else 'Job submission failed',
                'platform': platform,
                'urls_count': len(post_urls),
                'result': result
            }, status=status.HTTP_201_CREATED if success else status.HTTP_400_BAD_REQUEST)

        elif base_platform == 'instagram':
            # For Instagram comments, use the new Instagram service
            from instagram_data.services import scrape_instagram_comments_from_urls

            # Get project ID from request or default
            project_id = request.data.get('project_id', 1)

            # Use the Instagram comment scraper
            result, success = scrape_instagram_comments_from_urls(
                post_urls=post_urls,
                result_folder_name=result_folder_name,
                project_id=project_id
            )

            return Response({
                'success': success,
                'message': 'Instagram comment scraping job submitted successfully' if success else 'Job submission failed',
                'platform': platform,
                'urls_count': len(post_urls),
                'result': result
            }, status=status.HTTP_201_CREATED if success else status.HTTP_400_BAD_REQUEST)

        else:
            return Response({'error': f'Unsupported platform: {base_platform}'},
                          status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.error(f"Error in scrape_comments: {str(e)}")
        return Response({'error': f'Internal server error: {str(e)}'},
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BrightdataNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for viewing BrightData notifications"""
    queryset = BrightdataNotification.objects.all()
    serializer_class = BrightdataNotificationSerializer
    permission_classes = [AllowAny]  # For testing, use proper permissions in production

    def get_queryset(self):
        """Filter notifications by scraper request or status if specified"""
        queryset = BrightdataNotification.objects.all()

        # Filter by scraper request ID
        scraper_request_id = self.request.query_params.get('scraper_request')
        if scraper_request_id:
            queryset = queryset.filter(scraper_request_id=scraper_request_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by snapshot ID
        snapshot_id = self.request.query_params.get('snapshot_id')
        if snapshot_id:
            queryset = queryset.filter(snapshot_id=snapshot_id)

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['GET'])
    def recent(self, request):
        """Get recent notifications (last 50)"""
        notifications = self.get_queryset()[:50]
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def by_status(self, request):
        """Get notifications grouped by status"""
        from django.db.models import Count

        status_counts = BrightdataNotification.objects.values('status').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response({
            'status_counts': list(status_counts),
            'total_notifications': BrightdataNotification.objects.count()
        })

@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_metrics(request):
    """
    Get current webhook performance metrics
    """
    try:
        from .webhook_monitor import webhook_monitor

        metrics = webhook_monitor.get_current_metrics()

        return Response({
            'metrics': {
                'total_requests': metrics.total_requests,
                'successful_requests': metrics.successful_requests,
                'failed_requests': metrics.failed_requests,
                'success_rate': round((metrics.successful_requests / metrics.total_requests * 100) if metrics.total_requests > 0 else 0, 2),
                'error_rate': round(metrics.error_rate * 100, 2),
                'avg_response_time': round(metrics.avg_response_time, 3),
                'max_response_time': round(metrics.max_response_time, 3),
                'min_response_time': round(metrics.min_response_time, 3) if metrics.min_response_time != float('inf') else 0,
                'last_success': metrics.last_success.isoformat() if metrics.last_success else None,
                'last_failure': metrics.last_failure.isoformat() if metrics.last_failure else None,
            },
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting webhook metrics: {str(e)}")
        return Response({'error': 'Failed to get metrics'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_health(request):
    """
    Get webhook health status and diagnostics
    """
    try:
        from .webhook_monitor import webhook_monitor

        health_data = webhook_monitor.get_health_status()

        return Response({
            'health': health_data,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting webhook health: {str(e)}")
        return Response({'error': 'Failed to get health status'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_events(request):
    """
    Get recent webhook events with filtering
    """
    try:
        from .webhook_monitor import webhook_monitor

        limit = min(int(request.GET.get('limit', 50)), 500)  # Max 500 events
        event_type = request.GET.get('event_type')

        events = webhook_monitor.get_recent_events(limit=limit, event_type=event_type)

        return Response({
            'events': events,
            'count': len(events),
            'limit': limit,
            'filters': {
                'event_type': event_type
            },
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting webhook events: {str(e)}")
        return Response({'error': 'Failed to get events'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_alerts(request):
    """
    Get webhook alerts with optional severity filtering
    """
    try:
        from .webhook_monitor import webhook_monitor

        severity = request.GET.get('severity')  # 'error', 'warning', etc.

        alerts = webhook_monitor.get_alerts(severity=severity)

        return Response({
            'alerts': alerts,
            'count': len(alerts),
            'filters': {
                'severity': severity
            },
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting webhook alerts: {str(e)}")
        return Response({'error': 'Failed to get alerts'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def webhook_analytics(request):
    """
    Get detailed webhook performance analytics
    """
    try:
        from .webhook_monitor import webhook_monitor

        hours = min(int(request.GET.get('hours', 24)), 168)  # Max 7 days

        analytics = webhook_monitor.get_performance_analytics(hours=hours)

        return Response({
            'analytics': analytics,
            'time_window_hours': hours,
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting webhook analytics: {str(e)}")
        return Response({'error': 'Failed to get analytics'}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def test_webhook_security(request):
    """
    Test webhook security configuration and validation
    """
    try:
        from .webhook_security import webhook_security
        import time

        # Simulate a webhook request for testing
        test_payload = request.data.get('payload', {'test': 'data'})

        # Create a mock request for testing
        class MockRequest:
            def __init__(self, body, headers, meta):
                self.body = json.dumps(test_payload).encode()
                self.headers = headers
                self.META = meta
                self.content_type = 'application/json'

        # Test with provided headers or defaults
        test_headers = request.data.get('headers', {
            'Authorization': f"Bearer {getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'test-token')}",
            'X-BrightData-Timestamp': str(int(time.time())),
            'User-Agent': 'BrightData-Test/1.0'
        })

        test_meta = {
            'REMOTE_ADDR': request.data.get('client_ip', '127.0.0.1'),
            'HTTP_X_FORWARDED_FOR': request.data.get('client_ip', '127.0.0.1')
        }

        mock_request = MockRequest(
            body=json.dumps(test_payload),
            headers=test_headers,
            meta=test_meta
        )

        # Run comprehensive validation
        is_valid, validation_result = webhook_security.comprehensive_webhook_validation(mock_request)

        # Additional individual tests
        signature_valid = webhook_security.verify_webhook_signature(mock_request, mock_request.body)
        timestamp_valid = webhook_security.verify_timestamp(mock_request)
        rate_limit_ok = webhook_security.check_rate_limit(mock_request)
        ip_whitelisted = webhook_security.verify_ip_whitelist(mock_request)

        payload_valid, payload_errors = webhook_security.validate_webhook_payload(test_payload)

        return Response({
            'test_results': {
                'overall_valid': is_valid,
                'validation_result': validation_result,
                'individual_tests': {
                    'signature_verification': signature_valid,
                    'timestamp_verification': timestamp_valid,
                    'rate_limiting': rate_limit_ok,
                    'ip_whitelist': ip_whitelisted,
                    'payload_validation': payload_valid,
                    'payload_errors': payload_errors
                }
            },
            'test_configuration': {
                'webhook_token_configured': bool(getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', '')),
                'rate_limit': getattr(settings, 'WEBHOOK_RATE_LIMIT', 100),
                'timestamp_max_age': getattr(settings, 'WEBHOOK_MAX_TIMESTAMP_AGE', 300),
                'ip_whitelist_enabled': bool(getattr(settings, 'WEBHOOK_ALLOWED_IPS', [])),
            },
            'recommendations': _generate_security_recommendations(validation_result),
            'timestamp': timezone.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error testing webhook security: {str(e)}")
        return Response({'error': f'Security test failed: {str(e)}'}, status=500)

def _generate_security_recommendations(validation_result):
    """Generate security recommendations based on validation results"""
    recommendations = []

    if validation_result['security_score'] < 80:
        recommendations.append("Security score is below 80. Consider implementing additional security measures.")

    if 'Invalid signature' in validation_result.get('errors', []):
        recommendations.append("Configure a strong webhook token using BRIGHTDATA_WEBHOOK_TOKEN environment variable.")

    if 'Rate limit exceeded' in validation_result.get('errors', []):
        recommendations.append("Consider implementing rate limiting or increasing the limit if legitimate traffic is high.")

    if 'IP not whitelisted' in validation_result.get('errors', []):
        recommendations.append("Configure IP whitelisting using WEBHOOK_ALLOWED_IPS for additional security.")

    if validation_result.get('warnings'):
        recommendations.append("Address timestamp validation warnings to prevent replay attacks.")

    if not recommendations:
        recommendations.append("Webhook security configuration looks good!")

    return recommendations

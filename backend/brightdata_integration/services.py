"""
Automated Batch Scraper Services

This module provides services for automated batch scraping of social media data
from tracked sources using BrightData's API.
"""

import logging
import requests
import json
import datetime
from typing import List, Dict, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from urllib.parse import urlparse, urlunparse
from django.conf import settings

from .models import BatchScraperJob, ScraperRequest, BrightdataConfig
from track_accounts.models import TrackSource
from facebook_data.models import Folder as FacebookFolder
from instagram_data.models import Folder as InstagramFolder
from linkedin_data.models import Folder as LinkedInFolder
from tiktok_data.models import Folder as TikTokFolder

logger = logging.getLogger(__name__)

class AutomatedBatchScraper:
    """
    Service for automated batch scraping from tracked sources across multiple platforms
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.PLATFORM_FOLDER_MODELS = {
            'facebook': FacebookFolder,
            'instagram': InstagramFolder,
            'linkedin': LinkedInFolder,
            'tiktok': TikTokFolder,
        }

    def create_batch_job(self, name: str, project_id: int, source_folder_ids: List[int],
                        platforms_to_scrape: List[str] = None,
                        content_types_to_scrape: Dict[str, List[str]] = None,
                        num_of_posts: int = 10,
                        start_date: str = None, end_date: str = None,
                        auto_create_folders: bool = True, output_folder_pattern: str = None,
                        platform_params: Dict = None) -> BatchScraperJob:
        """
        Create a new batch scraper job

        Args:
            name: Name for the batch job
            project_id: Project ID to scrape sources from
            source_folder_ids: List of folder IDs (deprecated but kept for compatibility)
            platforms_to_scrape: List of platforms ['facebook', 'instagram', 'linkedin', 'tiktok']
            content_types_to_scrape: Dict mapping platforms to content types
            num_of_posts: Number of posts to scrape per source
            start_date: Start date for scraping (YYYY-MM-DD)
            end_date: End date for scraping (YYYY-MM-DD)
            auto_create_folders: Whether to auto-create folders for results
            output_folder_pattern: Pattern for folder naming

        Returns:
            Created BatchScraperJob instance
        """
        # Default values
        if platforms_to_scrape is None:
            platforms_to_scrape = ['instagram', 'facebook']

        if content_types_to_scrape is None:
            content_types_to_scrape = {
                'instagram': ['post'],
                'facebook': ['post']
            }

        # Automatically generate output folder pattern based on platform and service
        if output_folder_pattern is None:
            # Extract service name from platform_params if available
            service_name = "default"
            if platform_params and 'service_name' in platform_params:
                service_name = platform_params['service_name']
            
            # Create pattern: {platform}/{service}/{date}
            output_folder_pattern = "{platform}/{service}/{date}"

        # Create the job
        job = BatchScraperJob.objects.create(
            name=name,
            project_id=project_id,
            source_folder_ids=source_folder_ids or [],  # Keep for compatibility but unused
            platforms_to_scrape=platforms_to_scrape,
            content_types_to_scrape=content_types_to_scrape,
            num_of_posts=num_of_posts,
            start_date=start_date,
            end_date=end_date,
            auto_create_folders=auto_create_folders,
            output_folder_pattern=output_folder_pattern,
            platform_params=platform_params,
        )

        self.logger.info(f"Created batch job: {job.name} for project {project_id}")
        return job

    def execute_batch_job(self, job_id: int) -> bool:
        """
        Execute a batch scraper job by collecting all requests and sending batch API calls
        """
        try:
            job = BatchScraperJob.objects.get(id=job_id)

            # Set current job context for project filtering
            self._current_job = job

            with transaction.atomic():
                job.status = 'processing'
                job.started_at = timezone.now()
                job.save()

            self.logger.info(f"Starting execution of batch job: {job.name} for project {job.project_id}")

            # Get sources - either from input collection URLs or from project TrackSources
            sources = self._get_sources_for_job(job)
            job.total_sources = len(sources)
            job.total_accounts = len(sources)  # Keep legacy field in sync
            job.save()

            if not sources:
                self.logger.warning(f"No sources found in project {job.project_id} for job {job.name}")
                job.status = 'completed'
                job.completed_at = timezone.now()
                job.save()
                return True

            # Initialize job metadata
            job_metadata = {
                'sources_processed': [],
                'platforms_attempted': {},
                'folders_created': {},
                'start_time': timezone.now().isoformat(),
            }

            # First phase: Create all scraper requests (but don't trigger them individually)
            all_scraper_requests = []

            for source in sources:
                try:
                    source_requests = self._create_scraper_requests_for_source(job, source)
                    all_scraper_requests.extend(source_requests)

                    job_metadata['sources_processed'].append({
                        'source_name': source.name,
                        'requests_created': [req.id for req in source_requests],
                    })

                    # Update progress
                    job.processed_sources += 1
                    job.processed_accounts += 1  # Keep legacy field in sync
                    job.save()

                except Exception as e:
                    self.logger.error(f"Error creating requests for source {source.name}: {str(e)}")

            # Second phase: Group requests by platform+content_type and send batch API calls
            batch_results = self._execute_batch_requests(all_scraper_requests)

            # Update job metadata with batch results
            job_metadata['batch_results'] = batch_results
            successful_requests = sum(result['successful'] for result in batch_results.values())
            failed_requests = sum(result['failed'] for result in batch_results.values())

            # Complete the job
            job_metadata['end_time'] = timezone.now().isoformat()
            job_metadata['summary'] = {
                'total_sources': job.total_sources,
                'processed_sources': job.processed_sources,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'batch_calls_made': len(batch_results)
            }

            job.job_metadata = job_metadata
            job.successful_requests = successful_requests
            job.failed_requests = failed_requests
            job.status = 'completed' if failed_requests == 0 else 'completed'  # Consider partial success as completed
            job.completed_at = timezone.now()
            job.save()

            # Update ScrapingJob statuses based on ScraperRequest results
            try:
                from workflow.services import update_scraping_jobs_from_batch_job
                update_scraping_jobs_from_batch_job(job.id)
            except Exception as e:
                self.logger.error(f"Error updating ScrapingJob statuses for batch job {job.id}: {str(e)}")

            self.logger.info(f"Completed batch job: {job.name}. Success: {successful_requests}, Failed: {failed_requests}, Batch calls: {len(batch_results)}")
            return True

        except BatchScraperJob.DoesNotExist:
            self.logger.error(f"Batch job with ID {job_id} not found")
            return False
        except Exception as e:
            self.logger.error(f"Error executing batch job {job_id}: {str(e)}")
            # Update job status to failed
            try:
                job = BatchScraperJob.objects.get(id=job_id)
                job.status = 'failed'
                job.error_log = str(e)
                job.completed_at = timezone.now()
                job.save()
            except:
                pass
            return False
        finally:
            # Clean up job context
            if hasattr(self, '_current_job'):
                delattr(self, '_current_job')

    def _get_sources_for_job(self, job: BatchScraperJob) -> List[TrackSource]:
        """
        Get sources for a batch job - either from input collection URLs, specific track source, or from project TrackSources
        """
        # Check if this job is associated with a specific track source
        if job.platform_params and 'track_source_id' in job.platform_params:
            return self._get_sources_from_track_source(job)
        # Check if this job is associated with an input collection
        elif job.platform_params and 'input_collection_id' in job.platform_params:
            return self._get_sources_from_input_collection(job)
        else:
            # Fall back to getting sources from project (legacy behavior)
            return self._get_accounts_from_folders(job.source_folder_ids)

    def _get_sources_from_track_source(self, job: BatchScraperJob) -> List[TrackSource]:
        """
        Get a specific TrackSource by ID from platform_params
        """
        try:
            track_source_id = job.platform_params.get('track_source_id')
            source = TrackSource.objects.get(id=track_source_id)
            
            self.logger.info(f"Found track source {source.id}: {source.name}")
            return [source]
            
        except TrackSource.DoesNotExist:
            self.logger.error(f"TrackSource with ID {track_source_id} not found")
            return []
        except Exception as e:
            self.logger.error(f"Error getting track source: {str(e)}")
            return []

    def _get_sources_from_input_collection(self, job: BatchScraperJob) -> List[TrackSource]:
        """
        Create TrackSource objects from input collection URLs
        """
        try:
            from workflow.models import InputCollection
            
            input_collection_id = job.platform_params.get('input_collection_id')
            input_collection = InputCollection.objects.get(id=input_collection_id)
            
            sources = []
            platform_name = job.platform_params.get('platform_name', '').lower()
            
            for i, url in enumerate(input_collection.urls):
                # Create a temporary TrackSource object for each URL
                source = TrackSource(
                    id=f"temp_{input_collection_id}_{i}",  # Temporary ID
                    name=f"{input_collection.platform_service.platform.name} Source {i+1}",
                    project=job.project,
                    created_at=timezone.now(),
                    updated_at=timezone.now()
                )
                
                # Set the appropriate platform link based on the platform
                if platform_name == 'instagram':
                    source.instagram_link = url
                elif platform_name == 'facebook':
                    source.facebook_link = url
                elif platform_name == 'linkedin':
                    source.linkedin_link = url
                elif platform_name == 'tiktok':
                    source.tiktok_link = url
                
                sources.append(source)
            
            self.logger.info(f"Created {len(sources)} sources from input collection {input_collection_id}")
            return sources
            
        except Exception as e:
            self.logger.error(f"Error getting sources from input collection: {str(e)}")
            return []

    def _get_accounts_from_folders(self, folder_ids: List[int]) -> List[TrackSource]:
        """
        Get all tracked sources from the project
        Note: folder_ids parameter is kept for backward compatibility but is now unused
        since we now filter by project ID instead of folders
        """
        # Get project ID from the job
        if hasattr(self, '_current_job') and self._current_job:
            project_id = self._current_job.project_id
        else:
            # Fallback: this shouldn't happen in normal operation
            self.logger.warning("No current job context available - cannot filter by project")
            return []

        if not project_id:
            self.logger.warning("No project ID found in job - cannot filter sources")
            return []

        # Filter sources by project
        sources = TrackSource.objects.filter(project_id=project_id)
        self.logger.info(f"Found {sources.count()} sources for project {project_id}")

        # Debug: Log source names for verification
        if sources.exists():
            source_names = [s.name for s in sources[:5]]  # Log first 5
            self.logger.info(f"Sample sources: {source_names}")
            if sources.count() > 5:
                self.logger.info(f"... and {sources.count() - 5} more")

        return list(sources)

    def _create_scraper_requests_for_source(self, job: BatchScraperJob, source: TrackSource) -> List[ScraperRequest]:
        """
        Create scraper requests for a single source for all specified platforms and content types
        (but don't trigger them yet - they will be batched later)
        """
        created_requests = []

        for platform in job.platforms_to_scrape:
            try:
                url = self._get_platform_url(source, platform)
                if not url:
                    self.logger.debug(f"No {platform} URL found for source {source.name}")
                    continue

                # Get content types for this platform (default to ['post'] if not specified)
                content_types = job.content_types_to_scrape.get(platform, ['post'])
                if not content_types:
                    content_types = ['post']  # Default fallback

                # Process each content type for this platform
                for content_type in content_types:
                    try:
                        # Get platform_service_id from job platform_params if available
                        platform_service_id = None
                        if job.platform_params and 'platform_service_id' in job.platform_params:
                            platform_service_id = job.platform_params.get('platform_service_id')
                        
                        # Get platform-specific configuration for this content type
                        config = self._get_platform_config(platform, content_type, platform_service_id)
                        if not config:
                            error_msg = f"No active {platform}_{content_type}s configuration found"
                            self.logger.error(error_msg)
                            continue

                        # Create or get output folder
                        folder_id = self._get_or_create_output_folder(job, platform, source, content_type)

                        # Create scraper request (but don't trigger it yet)
                        scraper_request = self._create_scraper_request(
                            job, source, platform, url, config, folder_id, content_type
                        )

                        if scraper_request:
                            created_requests.append(scraper_request)
                            self.logger.debug(f"Created scraper request for {source.name} on {platform}_{content_type}")

                    except Exception as e:
                        self.logger.error(f"Error creating scraper request for {source.name} on {platform}_{content_type}: {str(e)}")

            except Exception as e:
                self.logger.error(f"Error processing platform {platform} for source {source.name}: {str(e)}")

        return created_requests

    def _execute_batch_requests(self, scraper_requests: List[ScraperRequest]) -> Dict:
        """
        Group scraper requests by platform+content_type and execute batch API calls
        """
        # Group requests by platform+content_type combination
        request_groups = {}
        for request in scraper_requests:
            key = f"{request.platform}_{request.content_type}"
            if key not in request_groups:
                request_groups[key] = []
            request_groups[key].append(request)

        batch_results = {}

        for group_key, requests in request_groups.items():
            self.logger.info(f"Executing batch API call for {group_key} with {len(requests)} sources")

            try:
                # Get the platform from the first request (all requests in group have same platform)
                base_platform = requests[0].platform.split('_')[0]

                # Execute batch call based on platform
                success = self._execute_batch_for_platform(base_platform, requests)

                batch_results[group_key] = {
                    'successful': len(requests) if success else 0,
                    'failed': 0 if success else len(requests),
                    'total_sources': len(requests)
                }

                # Update request statuses
                status = 'pending' if success else 'failed'
                for request in requests:
                    request.status = status
                    if not success:
                        request.error_message = f"Batch API call failed for {group_key}"
                    request.save()

            except Exception as e:
                self.logger.error(f"Error executing batch for {group_key}: {str(e)}")
                batch_results[group_key] = {
                    'successful': 0,
                    'failed': len(requests),
                    'total_sources': len(requests)
                }

                # Mark all requests as failed
                for request in requests:
                    request.status = 'failed'
                    request.error_message = f"Batch execution error: {str(e)}"
                    request.save()

        return batch_results

    def _execute_batch_for_platform(self, platform: str, requests: List[ScraperRequest]) -> bool:
        """
        Execute a batch API call for a specific platform with multiple sources
        """
        if not requests:
            return True

        # Use the first request to get config and determine the trigger method
        first_request = requests[0]

        # Map platform to batch trigger method
        platform_batch_methods = {
            'facebook': self._trigger_facebook_batch,
            'instagram': self._trigger_instagram_batch,
            'linkedin': self._trigger_linkedin_batch,
            'tiktok': self._trigger_tiktok_batch,
        }

        # Handle platform-specific content types
        if platform == 'facebook':
            # Facebook supports both posts and comments
            return self._trigger_facebook_batch(requests)
        elif platform == 'instagram':
            # Instagram supports posts, reels, and comments
            return self._trigger_instagram_batch(requests)
        else:
            # Other platforms use the standard mapping
            batch_method = platform_batch_methods.get(platform)
            if not batch_method:
                self.logger.error(f"No batch trigger method found for platform: {platform}")
                return False
            return batch_method(requests)

    def _get_platform_url(self, source: TrackSource, platform: str) -> Optional[str]:
        """
        Extract the appropriate platform URL from the source
        """
        url_mapping = {
            'facebook': source.facebook_link,
            'instagram': source.instagram_link,
            'linkedin': source.linkedin_link,
            'tiktok': source.tiktok_link,
        }

        url = url_mapping.get(platform)
        if url and url.strip():
            cleaned_url = url.strip()

            # Clean Instagram URLs by removing query parameters
            # BrightData API expects clean URLs like: https://www.instagram.com/username/
            # but rejects URLs with query params like: https://www.instagram.com/username/?hl=en
            if platform == 'instagram' and cleaned_url:
                try:
                    parsed = urlparse(cleaned_url)
                    # Remove query parameters and fragments for Instagram URLs
                    cleaned_parsed = parsed._replace(query='', fragment='')
                    cleaned_url = urlunparse(cleaned_parsed)
                    self.logger.info(f"Cleaned Instagram URL: {url} -> {cleaned_url}")
                except Exception as e:
                    self.logger.warning(f"Could not clean Instagram URL {url}: {str(e)}")
                    # Fall back to original URL if parsing fails
                    cleaned_url = url.strip()

            return cleaned_url
        return None

    def _get_platform_config(self, platform: str, content_type: str = 'post', platform_service_id: int = None) -> Optional[BrightdataConfig]:
        """
        Get the active configuration for a specific platform and content type
        Enhanced to work with PlatformService relationships
        """
        # If platform_service_id is provided, try to get config from PlatformService first
        if platform_service_id:
            try:
                from users.models import PlatformService
                platform_service = PlatformService.objects.get(id=platform_service_id)
                
                # Check if PlatformService has a dataset_id configured
                if hasattr(platform_service, 'dataset_id') and platform_service.dataset_id:
                    # Try to find existing config for this platform-service combination
                    platform_config_key = f'{platform_service.platform.name}_{platform_service.service.name}'
                    config = BrightdataConfig.objects.filter(
                        platform__icontains=platform_service.platform.name,
                        dataset_id=platform_service.dataset_id,
                        is_active=True
                    ).first()
                    
                    if config:
                        self.logger.info(f"Found config for PlatformService {platform_service_id}: {config}")
                        return config
                    
                    # If no config found, create one using PlatformService data
                    # This would require the PlatformService to have BrightData credentials
                    # For now, fall back to the old method
                    self.logger.warning(f"No BrightData config found for PlatformService {platform_service_id}, falling back to legacy method")
                
            except Exception as e:
                self.logger.error(f"Error getting config for PlatformService {platform_service_id}: {str(e)}")
        
        # Legacy method: Map platform names to match our BrightData configs
        if platform == 'linkedin':
            # LinkedIn config is now 'linkedin_posts'
            platform_config_key = 'linkedin_posts'
        elif platform == 'tiktok':
            # TikTok config is now 'tiktok_posts'
            platform_config_key = 'tiktok_posts'
        else:
            # For Facebook and Instagram, use the content type suffix
            if content_type in ['post', 'posts']:
                content_type = 'posts'
            elif content_type in ['reel', 'reels']:
                content_type = 'reels'
            elif content_type in ['comment', 'comments']:
                content_type = 'comments'
            platform_config_key = f'{platform}_{content_type}'  # e.g., instagram_posts, facebook_reels
        
        return BrightdataConfig.objects.filter(platform=platform_config_key, is_active=True).first()

    def _get_platform_config_key(self, platform: str, content_type: str = 'post') -> str:
        """
        Get the platform configuration key for a given platform and content type
        """
        # Ensure content type is in plural form for config lookup
        if content_type in ['post', 'posts']:
            content_type = 'posts'
        elif content_type in ['reel', 'reels']:
            content_type = 'reels'
        elif content_type in ['comment', 'comments']:
            content_type = 'comments'

        return f'{platform}_{content_type}'

    def _get_or_create_output_folder(self, job: BatchScraperJob, platform: str, source: TrackSource, content_type: str) -> Optional[int]:
        """
        Get or create a UnifiedRunFolder for the job that can be used across all platforms
        """
        if not job.auto_create_folders:
            return None

        try:
            # Convert content type to the appropriate category for folder creation
            # Handle both singular and plural forms
            if content_type in ['post', 'posts']:
                folder_category = 'posts'
                content_type_for_name = 'posts'
            elif content_type in ['reel', 'reels']:
                folder_category = 'reels'
                content_type_for_name = 'reels'
            elif content_type in ['comment', 'comments']:
                folder_category = 'comments'
                content_type_for_name = 'comments'
            else:
                folder_category = 'posts'  # Default fallback
                content_type_for_name = content_type

            # 🔧 FIXED: Create UnifiedRunFolder instead of platform-specific folder
            # Generate folder name using date and job name
            folder_name = f"{platform.title()} {content_type_for_name.title()} - {source.name}"
            
            # Import UnifiedRunFolder from track_accounts
            from track_accounts.models import UnifiedRunFolder
            
            # Create or get the UnifiedRunFolder
            unified_folder, created = UnifiedRunFolder.objects.get_or_create(
                name=folder_name,
                defaults={
                    'description': f'Created from batch job: {job.name}',
                    'folder_type': 'content',
                    'project_id': job.project_id,
                    'category': folder_category,
                    'service_code': content_type_for_name
                }
            )

            if created:
                self.logger.info(f"✅ Created new UnifiedRunFolder: {folder_name} (ID: {unified_folder.id})")
            else:
                self.logger.info(f"✅ Using existing UnifiedRunFolder: {folder_name} (ID: {unified_folder.id})")

            return unified_folder.id

        except Exception as e:
            self.logger.error(f"Error creating UnifiedRunFolder for {platform}: {str(e)}")
            return None

    def _create_scraper_request(self, job: BatchScraperJob, source: TrackSource,
                              platform: str, url: str, config: BrightdataConfig,
                              folder_id: Optional[int], content_type: str, 
                              scrape_job: 'workflow.ScrapingJob' = None) -> Optional[ScraperRequest]:
        """
        Create a scraper request for the source and platform with direct job linking
        """
        try:
            # Get the platform config key that includes content type
            platform_config_key = self._get_platform_config_key(platform, content_type)

            # Create ScraperRequest
            scraper_request = ScraperRequest.objects.create(
                config=config,
                batch_job=job,
                platform=platform_config_key,
                content_type=content_type,
                target_url=url,
                source_name=source.name,
                account_name=source.name,  # Keep legacy field in sync
                num_of_posts=job.num_of_posts,
                start_date=job.start_date,
                end_date=job.end_date,
                folder_id=folder_id,
                status='pending'
            )

            # Store platform-specific parameters in request_payload for later use
            if job.platform_params:
                platform_params = job.platform_params.get(platform_config_key, {})
                if platform_params:
                    scraper_request.request_payload = {
                        'platform_params': platform_params,
                        'source_name': source.name,
                        'platform': platform_config_key
                    }
                    scraper_request.save()

            self.logger.info(f"Created scraper request for {source.name} on {platform} ({content_type}) with direct job link")
            return scraper_request

        except Exception as e:
            self.logger.error(f"Error creating scraper request: {str(e)}")
            return None

    def _trigger_scrape(self, scraper_request: ScraperRequest) -> bool:
        """
        Trigger the actual scrape using BrightData API
        """
        try:
            # Extract base platform from the platform field (e.g., 'facebook' from 'facebook_posts')
            base_platform = scraper_request.platform.split('_')[0]

            # Prepare the API request based on base platform
            platform_trigger_methods = {
                'facebook': self._trigger_facebook_scrape,
                'instagram': self._trigger_instagram_scrape,
                'linkedin': self._trigger_linkedin_scrape,
                'tiktok': self._trigger_tiktok_scrape,
            }

            trigger_method = platform_trigger_methods.get(base_platform)
            if not trigger_method:
                self.logger.error(f"No trigger method found for platform: {base_platform}")
                return False

            return trigger_method(scraper_request)

        except Exception as e:
            self.logger.error(f"Error triggering scrape for request {scraper_request.id}: {str(e)}")
            scraper_request.status = 'failed'
            scraper_request.error_message = str(e)
            scraper_request.save()
            return False

    def _make_brightdata_request(self, scraper_request: ScraperRequest, payload: List[Dict]) -> bool:
        """
        Make the actual API request to BrightData
        """
        try:
            config = scraper_request.config

            # Import Django settings to get webhook base URL
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                raise ValueError("BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured")

            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }

            # Base parameters - simplified to match working independent code
            params = {
                "dataset_id": config.dataset_id,
                "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
                "notify": f"{webhook_base_url}/api/brightdata/notify/",
                "format": "json",
                "uncompressed_webhook": "true",
                "include_errors": "true",
            }

            # Add Instagram-specific parameters
            if scraper_request.platform.startswith('instagram'):
                params.update({
                    "type": "discover_new",
                    "discover_by": "url",
                })
            # Facebook doesn't need discovery parameters - dataset works with URL payload directly

            # ===== DETAILED DEBUG LOGGING =====
            print("\n" + "="*80)
            print("🐛 BRIGHTDATA API REQUEST DEBUG - AUTOMATED BATCH SCRAPER")
            print("="*80)
            print(f"Platform: {scraper_request.platform}")
            print(f"Config Name: {config.name}")
            print(f"Config ID: {config.id}")
            print(f"Webhook Base URL: {webhook_base_url}")
            print()
            print("📡 REQUEST DETAILS:")
            print(f"URL: {url}")
            print(f"Headers: {headers}")
            print(f"Params: {params}")
            print(f"Payload ({len(payload)} items): {payload}")
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

            # Log batch details
            self.logger.info(f"Sending batch API request for {scraper_request.platform} with {len(payload)} sources")
            if len(payload) <= 5:  # Log URLs for small batches
                urls = [item.get('url', 'N/A') for item in payload]
                self.logger.info(f"Batch URLs: {urls}")
            else:
                first_few = [item.get('url', 'N/A') for item in payload[:3]]
                self.logger.info(f"Batch URLs (first 3): {first_few} ... and {len(payload) - 3} more")

            # Store the request payload
            scraper_request.request_payload = payload
            scraper_request.status = 'processing'
            scraper_request.save()

            # Make the API request
            response = requests.post(url, headers=headers, params=params, json=payload)

            # ===== DETAILED RESPONSE LOGGING =====
            print("\n📥 BRIGHTDATA API RESPONSE:")
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Text: {response.text}")
            print("="*80 + "\n")

            if response.status_code == 200:
                try:
                    response_data = response.json()
                except json.JSONDecodeError as json_err:
                    response_data = {
                        "error": "Invalid or empty JSON response",
                        "raw_response": response.text,
                        "json_error": str(json_err)
                    }
                
                scraper_request.request_id = response_data.get('snapshot_id') or response_data.get('request_id')
                scraper_request.response_metadata = response_data
                scraper_request.save()

                self.logger.info(f"Successfully triggered batch scrape for {scraper_request.platform} with {len(payload)} sources. Request ID: {scraper_request.request_id}")
                print(f"✅ SUCCESS! Request ID: {scraper_request.request_id}")
                return True
            else:
                error_msg = f"BrightData API error for {scraper_request.platform} batch: {response.status_code} - {response.text}"
                self.logger.error(error_msg)
                scraper_request.status = 'failed'
                scraper_request.error_message = error_msg
                scraper_request.save()
                print(f"❌ FAILED! Status: {response.status_code}, Error: {response.text}")
                return False

        except Exception as e:
            error_msg = f"Exception during BrightData batch request for {scraper_request.platform}: {str(e)}"
            self.logger.error(error_msg)
            scraper_request.status = 'failed'
            scraper_request.error_message = error_msg
            scraper_request.save()
            print(f"❌ EXCEPTION! Error: {str(e)}")
            print("="*80 + "\n")
            return False

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

    def _trigger_instagram_scrape(self, scraper_request: ScraperRequest) -> bool:
        """Trigger Instagram scrape - Different parameters for posts vs reels"""
        # Determine content type from platform field (e.g., 'instagram_posts' -> 'posts')
        content_type = scraper_request.platform.split('_')[-1]  # gets 'posts', 'reels', etc.

        if content_type == 'reels':
            # Instagram Reels API format
            payload = [{
                "url": scraper_request.target_url,
                "start_date": scraper_request.start_date.strftime('%m-%d-%Y') if scraper_request.start_date else "",
                "end_date": scraper_request.end_date.strftime('%m-%d-%Y') if scraper_request.end_date else "",
                "all_reels": False,  # Default to specific date range instead of all reels
            }]
        else:
            # Instagram Posts API format (includes posts and other content types)
            payload = [{
                "url": scraper_request.target_url,
                "num_of_posts": scraper_request.num_of_posts,
                "start_date": scraper_request.start_date.strftime('%m-%d-%Y') if scraper_request.start_date else "",
                "end_date": scraper_request.end_date.strftime('%m-%d-%Y') if scraper_request.end_date else "",
                "post_type": "Post" if content_type == 'posts' else content_type.title(),
                "posts_to_not_include": [],  # Could be extended to support excluded posts
            }]

        return self._make_brightdata_request(scraper_request, payload)

    def _trigger_linkedin_scrape(self, scraper_request: ScraperRequest) -> bool:
        """Trigger LinkedIn scrape"""
        payload = [{
            "url": scraper_request.target_url,
            "num_of_posts": scraper_request.num_of_posts,
            "start_date": scraper_request.start_date.strftime('%m-%d-%Y') if scraper_request.start_date else "",
            "end_date": scraper_request.end_date.strftime('%m-%d-%Y') if scraper_request.end_date else "",
        }]
        return self._make_brightdata_request(scraper_request, payload)

    def _trigger_tiktok_scrape(self, scraper_request: ScraperRequest) -> bool:
        """Trigger TikTok scrape"""
        payload = [{
            "url": scraper_request.target_url,
            "num_of_posts": scraper_request.num_of_posts,
            "start_date": scraper_request.start_date.strftime('%m-%d-%Y') if scraper_request.start_date else "",
            "end_date": scraper_request.end_date.strftime('%m-%d-%Y') if scraper_request.end_date else "",
        }]
        return self._make_brightdata_request(scraper_request, payload)

    def _trigger_facebook_batch(self, requests: List[ScraperRequest]) -> bool:
        """Trigger Facebook batch scrape with multiple sources"""
        if not requests:
            return True

        # Get platform-specific parameters from the first request
        platform_params = {}
        if requests[0].request_payload:
            # Handle both dict and list payload types safely
            if isinstance(requests[0].request_payload, dict) and 'platform_params' in requests[0].request_payload:
                platform_params = requests[0].request_payload['platform_params']
            elif isinstance(requests[0].request_payload, list):
                # If payload is a list, skip platform_params extraction
                platform_params = {}
            else:
                # For any other type, use empty dict
                platform_params = {}

        # Create batch payload with all sources
        payload = []
        for request in requests:
            # Base payload for Facebook batch API - use URL directly like Instagram
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

        # Use the first request for API call configuration, but update ALL requests with the response
        success = self._make_brightdata_batch_request(requests, payload)
        return success

    def _trigger_instagram_batch(self, requests: List[ScraperRequest]) -> bool:
        """Trigger Instagram batch scrape with multiple sources"""
        if not requests:
            return True

        # Get content type from the first request (all requests in batch have same content type)
        content_type = requests[0].platform.split('_')[-1]  # gets 'posts', 'reels', etc.

        # Get platform-specific parameters from the first request
        platform_params = {}
        if requests[0].request_payload and 'platform_params' in requests[0].request_payload:
            platform_params = requests[0].request_payload['platform_params']

        # Create batch payload with all sources
        payload = []
        for request in requests:
            if content_type == 'reels':
                # Instagram Reels API format
                item = {
                    "url": request.target_url,
                    "start_date": request.start_date.strftime('%m-%d-%Y') if request.start_date else "",
                    "end_date": request.end_date.strftime('%m-%d-%Y') if request.end_date else "",
                    "all_reels": False,  # Default to specific date range instead of all reels
                }
                payload.append(item)
            elif content_type == 'comments':
                # Instagram Comments API format
                item = {
                    "url": request.target_url,
                    "num_of_posts": request.num_of_posts,
                    "start_date": request.start_date.strftime('%m-%d-%Y') if request.start_date else "",
                    "end_date": request.end_date.strftime('%m-%d-%Y') if request.end_date else "",
                }
                # Add platform-specific parameters for Instagram Comments
                if 'limit_records' in platform_params:
                    item['limit_records'] = platform_params['limit_records']
                payload.append(item)
            else:
                # Instagram Posts API format (includes posts and other content types)
                item = {
                    "url": request.target_url,
                    "num_of_posts": request.num_of_posts,
                    "start_date": request.start_date.strftime('%m-%d-%Y') if request.start_date else "",
                    "end_date": request.end_date.strftime('%m-%d-%Y') if request.end_date else "",
                    "post_type": "Post" if content_type == 'posts' else content_type.title(),
                    "posts_to_not_include": [],  # Could be extended to support excluded posts
                }
                payload.append(item)

        # Use the first request for API call configuration, but update ALL requests with the response
        success = self._make_brightdata_batch_request(requests, payload)
        return success

    def _trigger_linkedin_batch(self, requests: List[ScraperRequest]) -> bool:
        """Trigger LinkedIn batch scrape with multiple sources"""
        if not requests:
            return True

        # Get platform-specific parameters from the first request
        platform_params = {}
        if requests[0].request_payload and 'platform_params' in requests[0].request_payload:
            platform_params = requests[0].request_payload['platform_params']

        # Create batch payload with all sources
        payload = []
        for request in requests:
            # LinkedIn batch API format - following the expected curl format
            item = {
                "url": request.target_url,
            }

            # Add date parameters in MM-DD-YYYY format (consistent with other platforms)
            if request.start_date:
                item['start_date'] = request.start_date.strftime('%m-%d-%Y')
            if request.end_date:
                item['end_date'] = request.end_date.strftime('%m-%d-%Y')

            # Add platform-specific parameters for LinkedIn Posts
            if 'limit' in platform_params:
                item['limit'] = platform_params['limit']

            payload.append(item)

        # Use the first request for API call configuration, but update ALL requests with the response
        success = self._make_brightdata_batch_request(requests, payload)
        return success

    def _trigger_tiktok_batch(self, requests: List[ScraperRequest]) -> bool:
        """Trigger TikTok batch scrape with multiple sources"""
        if not requests:
            return True

        # Create batch payload with all sources
        payload = []
        for request in requests:
            # TikTok batch API needs URL field with uppercase "URL"
            payload.append({
                "URL": request.target_url,
            })

        # Use the first request for API call configuration, but update ALL requests with the response
        success = self._make_brightdata_batch_request(requests, payload)
        return success

    def _make_brightdata_batch_request(self, scraper_requests: List[ScraperRequest], payload: List[Dict]) -> bool:
        """
        Make a batch API request to BrightData and update ALL requests with the same snapshot_id
        """
        if not scraper_requests:
            return False

        # Use the first request for configuration
        primary_request = scraper_requests[0]

        try:
            import requests  # Import requests library explicitly to avoid naming conflict

            config = primary_request.config

            # Import Django settings to get webhook base URL
            webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL')
            if not webhook_base_url:
                raise ValueError("BRIGHTDATA_WEBHOOK_BASE_URL setting is not configured")

            url = "https://api.brightdata.com/datasets/v3/trigger"
            headers = {
                "Authorization": f"Bearer {config.api_token}",
                "Content-Type": "application/json",
            }

            # Base parameters - simplified to match working independent code
            params = {
                "dataset_id": config.dataset_id,
                "endpoint": f"{webhook_base_url}/api/brightdata/webhook/",
                "notify": f"{webhook_base_url}/api/brightdata/notify/",
                "format": "json",
                "uncompressed_webhook": "true",
                "include_errors": "true",
            }

            # Add platform-specific parameters
            if primary_request.platform.startswith('instagram'):
                params.update({
                    "type": "discover_new",
                    "discover_by": "url",
                })
            elif primary_request.platform.startswith('facebook'):
                # Facebook-specific parameters - NO discovery parameters needed
                # The dataset gd_lkaxegm826bjpoo9m5 works with URL payload without discovery params
                pass
            elif primary_request.platform.startswith('linkedin'):
                # LinkedIn-specific parameters - using profile_url discovery like the curl example
                params.update({
                    "type": "discover_new",
                    "discover_by": "profile_url",
                })
            elif primary_request.platform.startswith('tiktok'):
                # TikTok-specific parameters
                params.update({
                    "type": "discover_new",
                    "discover_by": "url",
                })

            # ===== ENHANCED DEBUG LOGGING FOR FACEBOOK FAILURE INVESTIGATION =====
            print("\n" + "="*80)
            print("🔍 FACEBOOK BATCH FAILURE DEBUG INVESTIGATION")
            print("="*80)
            print(f"Platform: {primary_request.platform}")
            print(f"Config Name: {config.name}")
            print(f"Config ID: {config.id}")
            print(f"Dataset ID: {config.dataset_id}")
            print(f"API Token: {config.api_token[:10]}...")
            print(f"Webhook Base URL: {webhook_base_url}")
            print(f"Batch Size: {len(scraper_requests)} requests, {len(payload)} sources")
            print()
            
            # Detailed request information
            print("📡 FULL REQUEST DETAILS:")
            print(f"URL: {url}")
            print(f"Headers: {json.dumps(headers, indent=2)}")
            print(f"Params: {json.dumps(params, indent=2)}")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            print()
            
            # Validate payload structure
            print("🔍 PAYLOAD VALIDATION:")
            for i, item in enumerate(payload):
                print(f"Item {i+1}:")
                print(f"  URL: {item.get('url', 'MISSING')}")
                print(f"  num_of_posts: {item.get('num_of_posts', 'MISSING')}")
                print(f"  start_date: {item.get('start_date', 'MISSING')}")
                print(f"  end_date: {item.get('end_date', 'MISSING')}")
                print(f"  posts_to_not_include: {item.get('posts_to_not_include', 'MISSING')}")
                print()
            
            # Platform-specific parameter analysis
            if payload and len(payload) > 0:
                print("🔧 PLATFORM-SPECIFIC PARAMETERS:")
                sample_item = payload[0]
                platform_specific_keys = [k for k in sample_item.keys() if k not in ['url', 'num_of_posts', 'start_date', 'end_date', 'posts_to_not_include', 'post_type', 'all_reels']]
                if platform_specific_keys:
                    print(f"   Additional parameters: {platform_specific_keys}")
                    for key in platform_specific_keys:
                        print(f"   - {key}: {sample_item.get(key)}")
                else:
                    print("   No additional platform-specific parameters")
            print()

            # Log batch details
            self.logger.info(f"Sending batch API request for {primary_request.platform} with {len(payload)} sources")
            if len(payload) <= 5:  # Log URLs for small batches
                urls = [item.get('url', 'N/A') for item in payload]
                self.logger.info(f"Batch URLs: {urls}")
            else:
                first_few = [item.get('url', 'N/A') for item in payload[:3]]
                self.logger.info(f"Batch URLs (first 3): {first_few} ... and {len(payload) - 3} more")

            # Update ALL requests to processing status
            for request in scraper_requests:
                request.request_payload = payload
                request.status = 'processing'
                request.save()

            # Make the API request
            response = requests.post(url, headers=headers, params=params, json=payload)

            # ===== DETAILED RESPONSE LOGGING =====
            print("\n📥 BRIGHTDATA API RESPONSE:")
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            print(f"Response Text: {response.text}")
            print("="*80 + "\n")

            if response.status_code == 200:
                try:
                    response_data = response.json()
                except json.JSONDecodeError as json_err:
                    response_data = {
                        "error": "Invalid or empty JSON response",
                        "raw_response": response.text,
                        "json_error": str(json_err)
                    }
                
                snapshot_id = response_data.get('snapshot_id') or response_data.get('request_id')

                # 🔧 CRITICAL FIX: Update ALL requests with the same snapshot_id
                for request in scraper_requests:
                    request.request_id = snapshot_id
                    request.response_metadata = response_data
                    request.save()

                # Note: The snapshot_id is already included in the webhook processing
                # No need for a second API call to update the endpoint
                if snapshot_id:
                    self.logger.info(f"✅ Received snapshot_id: {snapshot_id} for webhook processing")

                self.logger.info(f"✅ Successfully triggered batch scrape for {primary_request.platform} with {len(payload)} sources. Snapshot ID: {snapshot_id}")
                self.logger.info(f"✅ Updated {len(scraper_requests)} scraper requests with snapshot_id: {snapshot_id}")
                print(f"✅ SUCCESS! Snapshot ID: {snapshot_id}")
                print(f"✅ Updated {len(scraper_requests)} scraper requests with the same snapshot_id")
                return True
            else:
                error_msg = f"BrightData API error for {primary_request.platform} batch: {response.status_code} - {response.text}"
                self.logger.error(error_msg)

                # Update ALL requests with failed status
                for request in scraper_requests:
                    request.status = 'failed'
                    request.error_message = error_msg
                    request.save()

                print(f"❌ FAILED! Status: {response.status_code}, Error: {response.text}")
                return False

        except Exception as e:
            error_msg = f"Exception during BrightData batch request for {primary_request.platform}: {str(e)}"
            self.logger.error(error_msg)

            # Update ALL requests with failed status
            for request in scraper_requests:
                request.status = 'failed'
                request.error_message = error_msg
                request.save()

            print(f"❌ EXCEPTION! Error: {str(e)}")
            print("="*80 + "\n")
            return False

    def _pre_create_platform_folders(self, scrape_job: 'workflow.ScrapingJob', unified_folder_id: int) -> Dict[str, int]:
        """
        Pre-create platform-specific folders for a scraping job
        Returns a dict mapping platform to folder_id
        """
        platform_folders = {}
        
        try:
            from track_accounts.models import UnifiedRunFolder
            unified_folder = UnifiedRunFolder.objects.get(id=unified_folder_id)
            
            # Pre-create folders for all platforms
            platforms = ['instagram', 'facebook', 'linkedin', 'tiktok']
            
            for platform in platforms:
                try:
                    if platform == 'instagram':
                        from instagram_data.models import Folder
                    elif platform == 'facebook':
                        from facebook_data.models import Folder
                    elif platform == 'linkedin':
                        from linkedin_data.models import Folder
                    elif platform == 'tiktok':
                        from tiktok_data.models import Folder
                    else:
                        continue
                    
                    # Create platform-specific folder
                    platform_folder = Folder.objects.create(
                        name=f"{platform.title()} - {unified_folder.name}",
                        description=f"Pre-created folder for {platform} scraping job",
                        category=unified_folder.category or 'posts',
                        project_id=unified_folder.project_id,
                        scraping_run=unified_folder.scraping_run,
                        scrape_job=scrape_job,  # NEW: Direct link to ScrapingJob
                        unified_job_folder=unified_folder
                    )
                    
                    platform_folders[platform] = platform_folder.id
                    self.logger.info(f"✅ Pre-created {platform} folder: {platform_folder.id} for job: {scrape_job.id}")
                    
                except Exception as e:
                    self.logger.error(f"Error creating {platform} folder: {str(e)}")
                    continue
            
            return platform_folders
            
        except Exception as e:
            self.logger.error(f"Error in _pre_create_platform_folders: {str(e)}")
            return {}

# Convenience function for external use
def create_and_execute_batch_job(name: str, project_id: int, source_folder_ids: List[int],
                                 platforms_to_scrape: List[str] = None,
                                 content_types_to_scrape: Dict[str, List[str]] = None,
                                 **kwargs) -> Tuple[BatchScraperJob, bool]:
    """
    Create and immediately execute a batch scraper job
    """
    scraper = AutomatedBatchScraper()
    job = scraper.create_batch_job(name, project_id, source_folder_ids, platforms_to_scrape,
                                   content_types_to_scrape=content_types_to_scrape, **kwargs)
    success = scraper.execute_batch_job(job.id)
    return job, success

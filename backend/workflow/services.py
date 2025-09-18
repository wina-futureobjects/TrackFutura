from typing import List, Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from .models import InputCollection, WorkflowTask, ScrapingRun, ScrapingJob
from brightdata_integration.models import BatchScraperJob, BrightdataConfig
from users.models import Project, PlatformService
from track_accounts.models import TrackSource
import logging

logger = logging.getLogger(__name__)

class WorkflowService:
    """Service class for managing workflow operations"""
    
    # Dataset ID mapping based on platform and service
    DATASET_MAPPING = {
        'facebook': {
            'posts': 'gd_lkaxegm826bjpoo9m5',
            'comments': 'gd_lkay758p1eanlolqw8',
            'reels': 'gd_lyclm3ey2q6rww027t',
            'pages_posts': 'gd_lkaxegm826bjpoo9m5',
        },
        'instagram': {
            'posts': 'gd_lk5ns7kz21pck8jpis',
            'comments': 'gd_ltppn085pokosxh13',
            'reels': 'gd_lyclm20il4r5helnj',
        },
        'linkedin': {
            'posts': 'gd_lyy3tktm25m4avu764',
            'comments': 'gd_lyy3tktm25m4avu764',
        },
        'tiktok': {
            'posts': 'gd_lu702nij2f790tmv9h',
            'comments': 'gd_lu702nij2f790tmv9h',
        },
    }
    
    @transaction.atomic
    def create_input_collection(self, project_id: int, platform_service_id: int, urls: List[str]) -> InputCollection:
        """
        Create input collection and trigger workflow
        
        Args:
            project_id: ID of the project
            platform_service_id: ID of the platform-service combination
            urls: List of URLs for scraping
            
        Returns:
            InputCollection: Created input collection instance
        """
        try:
            # Validate project exists
            project = Project.objects.get(id=project_id)
            
            # Validate platform service exists and is enabled
            platform_service = PlatformService.objects.get(
                id=platform_service_id,
                is_enabled=True,
                platform__is_enabled=True
            )
            
            # Create input collection
            input_collection = InputCollection.objects.create(
                project=project,
                platform_service=platform_service,
                urls=urls,
                status='pending'
            )
            
            logger.info(f"Created input collection {input_collection.id} for project {project.name}")
            
            # Auto-create scraper task
            workflow_task = self.create_scraper_task(input_collection)
            
            return input_collection
            
        except Project.DoesNotExist:
            raise ValueError(f"Project with ID {project_id} does not exist")
        except PlatformService.DoesNotExist:
            raise ValueError(f"Platform service with ID {platform_service_id} does not exist or is disabled")
        except Exception as e:
            logger.error(f"Error creating input collection: {str(e)}")
            raise
    
    def create_scraper_task(self, input_collection: InputCollection) -> Optional[WorkflowTask]:
        """
        Create scraper task from input collection
        
        Args:
            input_collection: InputCollection instance
            
        Returns:
            WorkflowTask: Created workflow task instance or None if failed
        """
        try:
            # Get or create BrightData config for the platform-service combination
            config = self._get_or_create_brightdata_config(input_collection.platform_service)
            
            if not config:
                logger.error(f"No BrightData config found for platform service {input_collection.platform_service}")
                input_collection.status = 'failed'
                input_collection.save()
                return None
            
            # Create batch scraper job
            batch_job = self._create_batch_scraper_job(input_collection, config)
            
            if not batch_job:
                logger.error(f"Failed to create batch scraper job for input collection {input_collection.id}")
                input_collection.status = 'failed'
                input_collection.save()
                return None
            
            # Create workflow task
            workflow_task = WorkflowTask.objects.create(
                input_collection=input_collection,
                batch_job=batch_job,
                status='pending'
            )
            
            # Update input collection status
            input_collection.status = 'processing'
            input_collection.save()
            
            logger.info(f"Created workflow task {workflow_task.id} for input collection {input_collection.id}")
            
            return workflow_task
            
        except Exception as e:
            logger.error(f"Error creating scraper task: {str(e)}")
            input_collection.status = 'failed'
            input_collection.save()
            return None
    
    def _get_or_create_brightdata_config(self, platform_service: PlatformService) -> Optional[BrightdataConfig]:
        """
        Get or create BrightData configuration for platform-service combination
        
        Args:
            platform_service: PlatformService instance
            
        Returns:
            BrightdataConfig: Configuration instance or None if not found
        """
        try:
            # Map platform and service to BrightData config platform format
            platform_name = platform_service.platform.name.lower()
            service_name = platform_service.service.name.lower()
            
            # Create the platform key for BrightData config
            if platform_name == 'facebook':
                if service_name == 'posts':
                    config_platform = 'facebook_posts'
                elif service_name == 'reels':
                    config_platform = 'facebook_reels'
                elif service_name == 'comments':
                    config_platform = 'facebook_comments'
                else:
                    config_platform = 'facebook_posts'  # Default
            elif platform_name == 'instagram':
                if service_name == 'posts':
                    config_platform = 'instagram_posts'
                elif service_name == 'reels':
                    config_platform = 'instagram_reels'
                elif service_name == 'comments':
                    config_platform = 'instagram_comments'
                else:
                    config_platform = 'instagram_posts'  # Default
            elif platform_name == 'linkedin':
                if service_name == 'posts':
                    config_platform = 'linkedin_posts'
                else:
                    config_platform = 'linkedin_posts'  # Default
            elif platform_name == 'tiktok':
                if service_name == 'posts':
                    config_platform = 'tiktok_posts'
                else:
                    config_platform = 'tiktok_posts'  # Default
            else:
                logger.error(f"Unsupported platform: {platform_name}")
                return None
            
            # Try to find existing config
            config = BrightdataConfig.objects.filter(
                platform=config_platform,
                is_active=True
            ).first()
            
            if config:
                logger.info(f"Found BrightData config {config.id} for platform {config_platform}")
                return config
            
            # If no config found, log the issue
            logger.error(f"No BrightData config found for platform {config_platform}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting BrightData config: {str(e)}")
            return None
    
    def _create_batch_scraper_job(self, input_collection: InputCollection, config: BrightdataConfig) -> Optional[BatchScraperJob]:
        """
        Create batch scraper job from input collection
        
        Args:
            input_collection: InputCollection instance
            config: BrightdataConfig instance
            
        Returns:
            BatchScraperJob: Created batch job instance or None if failed
        """
        try:
            # Determine content type based on service
            service_name = input_collection.platform_service.service.name.lower()
            content_type = self._map_service_to_content_type(service_name)
            
            # Create batch scraper job with platform service information
            batch_job = BatchScraperJob.objects.create(
                name=f"Workflow_{input_collection.id}_{content_type}",
                project=input_collection.project,
                source_folder_ids=[],  # Will be populated by the scraper service
                platforms_to_scrape=[input_collection.platform_service.platform.name],
                content_types_to_scrape={
                    input_collection.platform_service.platform.name: [content_type]
                },
                num_of_posts=10,  # Default value
                auto_create_folders=True,
                status='pending',
                platform_params={
                    'platform_service_id': input_collection.platform_service.id,
                    'platform_name': input_collection.platform_service.platform.name,
                    'service_name': input_collection.platform_service.service.name
                }
            )
            
            logger.info(f"Created batch scraper job {batch_job.id} for input collection {input_collection.id}")
            
            return batch_job
            
        except Exception as e:
            logger.error(f"Error creating batch scraper job: {str(e)}")
            return None
    
    def _map_service_to_content_type(self, service_name: str) -> str:
        """
        Map service name to content type for BrightData
        
        Args:
            service_name: Service name (e.g., 'posts', 'comments', 'reels')
            
        Returns:
            str: Content type for BrightData
        """
        mapping = {
            'posts': 'post',
            'comments': 'comment',
            'reels': 'reel',
            'profiles': 'profile',
            'videos': 'video'
        }
        
        return mapping.get(service_name, 'post')
    
    def configure_input_collection_job(self, input_collection_id: int, job_config: dict) -> Optional[BatchScraperJob]:
        """
        Configure and create a batch scraper job for an existing input collection
        
        Args:
            input_collection_id: ID of the input collection
            job_config: Configuration for the job (name, num_of_posts, etc.)
            
        Returns:
            BatchScraperJob: Created batch job instance or None if failed
        """
        try:
            logger.info(f"Starting job configuration for input collection {input_collection_id}")
            
            # Get the input collection
            input_collection = InputCollection.objects.get(id=input_collection_id)
            logger.info(f"Found input collection: {input_collection.id}, platform: {input_collection.platform_service.platform.name}, service: {input_collection.platform_service.service.name}")
            
            # Get or create BrightData config for the platform-service combination
            config = self._get_or_create_brightdata_config(input_collection.platform_service)
            
            if not config:
                logger.error(f"No BrightData config found for platform service {input_collection.platform_service}")
                return None
            
            logger.info(f"Using BrightData config: {config.id} for platform {config.platform}")
            
            # Determine content type based on service
            service_name = input_collection.platform_service.service.name.lower()
            content_type = self._map_service_to_content_type(service_name)
            logger.info(f"Mapped service '{service_name}' to content type '{content_type}'")
            
            # Create batch scraper job with the provided configuration
            batch_job = BatchScraperJob.objects.create(
                name=job_config.get('name', f"Workflow_{input_collection.id}_{content_type}"),
                project=input_collection.project,
                source_folder_ids=[],
                platforms_to_scrape=[input_collection.platform_service.platform.name],
                content_types_to_scrape={
                    input_collection.platform_service.platform.name: [content_type]
                },
                num_of_posts=job_config.get('num_of_posts', 10),
                start_date=job_config.get('start_date'),
                end_date=job_config.get('end_date'),
                auto_create_folders=job_config.get('auto_create_folders', True),
                status='pending',
                platform_params={
                    'platform_service_id': input_collection.platform_service.id,
                    'platform_name': input_collection.platform_service.platform.name,
                    'service_name': input_collection.platform_service.service.name,
                    'input_collection_id': input_collection.id,
                    'urls': input_collection.urls
                }
            )
            
            logger.info(f"Successfully created batch scraper job {batch_job.id} for input collection {input_collection.id}")
            
            return batch_job
            
        except InputCollection.DoesNotExist:
            logger.error(f"Input collection {input_collection_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error creating batch scraper job: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return None

    def update_workflow_status(self, workflow_task_id: int, status: str) -> bool:
        """
        Update workflow task status
        
        Args:
            workflow_task_id: ID of the workflow task
            status: New status
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            workflow_task = WorkflowTask.objects.get(id=workflow_task_id)
            workflow_task.status = status
            workflow_task.save()
            
            # Update input collection status based on workflow task status
            if status in ['completed', 'failed']:
                input_collection = workflow_task.input_collection
                input_collection.status = status
                input_collection.save()
            
            logger.info(f"Updated workflow task {workflow_task_id} status to {status}")
            return True
            
        except WorkflowTask.DoesNotExist:
            logger.error(f"Workflow task {workflow_task_id} not found")
            return False
        except Exception as e:
            logger.error(f"Error updating workflow status: {str(e)}")
            return False 
    
    def _create_input_collections_from_tracksources(self, project: Project, user=None) -> List[InputCollection]:
        """
        Create InputCollection records from TrackSource data for a project
        
        Args:
            project: Project instance
            user: User creating the collections
            
        Returns:
            List[InputCollection]: Created input collections
        """
        input_collections = []
        
        # Get all TrackSource records for this project
        track_sources = TrackSource.objects.filter(project=project)
        
        for track_source in track_sources:
            # Get platform and service info
            platform_name = track_source.platform.lower()
            service_name = track_source.service_name.lower()
            
            # Find the corresponding PlatformService
            try:
                platform_service = PlatformService.objects.get(
                    platform__name=platform_name,
                    service__name=service_name,
                    is_enabled=True
                )
            except PlatformService.DoesNotExist:
                logger.warning(f"No PlatformService found for {platform_name} - {service_name}")
                continue
            
            # Extract URLs from TrackSource
            urls = []
            if track_source.facebook_link:
                urls.append(track_source.facebook_link)
            if track_source.instagram_link:
                urls.append(track_source.instagram_link)
            if track_source.linkedin_link:
                urls.append(track_source.linkedin_link)
            if track_source.tiktok_link:
                urls.append(track_source.tiktok_link)
            if track_source.other_social_media:
                urls.append(track_source.other_social_media)
            
            # Create InputCollection for each URL
            for url in urls:
                # Handle anonymous user case
                created_by_user = user if user and not user.is_anonymous else None
                
                input_collection = InputCollection.objects.create(
                    project=project,
                    platform_service=platform_service,
                    urls=[url],  # Single URL per collection
                    status='pending',
                    created_by=created_by_user
                )
                input_collections.append(input_collection)
                logger.info(f"Created InputCollection {input_collection.id} from TrackSource {track_source.id}")
        
        return input_collections

    def create_scraping_run(self, project_id: int, configuration: Dict[str, Any], user=None) -> ScrapingRun:
        """
        Create a new scraping run with global configuration
        
        Args:
            project_id: ID of the project
            configuration: Global configuration for all jobs in this run
            user: User creating the run
            
        Returns:
            ScrapingRun: Created scraping run instance
        """
        try:
            project = Project.objects.get(id=project_id)
            
            # Create scraping run
            # Handle anonymous user case
            created_by_user = user if user and not user.is_anonymous else None
            
            scraping_run = ScrapingRun.objects.create(
                project=project,
                name=f"Scraping Run - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                configuration=configuration,
                status='pending',
                created_by=created_by_user
            )
            
            logger.info(f"Created scraping run {scraping_run.id} for project {project.name}")
            
            # Get all input collections for this project
            input_collections = InputCollection.objects.filter(project=project, status='pending')
            
            # If no input collections exist, create them from TrackSource data
            if not input_collections.exists():
                logger.info(f"No InputCollection records found for project {project.name}, creating from TrackSource data")
                input_collections = self._create_input_collections_from_tracksources(project, user)
            
            scraping_run.total_jobs = len(input_collections)
            scraping_run.save()
            
            # Create individual scraping jobs
            self._create_scraping_jobs(scraping_run, input_collections)
            
            return scraping_run
            
        except Project.DoesNotExist:
            raise ValueError(f"Project with ID {project_id} does not exist")
        except Exception as e:
            logger.error(f"Error creating scraping run: {str(e)}")
            raise
    
    def _create_scraping_jobs(self, scraping_run: ScrapingRun, input_collections: List[InputCollection]):
        """
        Create individual scraping jobs for each input collection
        
        Args:
            scraping_run: ScrapingRun instance
            input_collections: List of InputCollection instances
        """
        for input_collection in input_collections:
            try:
                # Get platform and service info
                platform = input_collection.platform_service.platform.name.lower()
                service = input_collection.platform_service.service.name.lower()
                
                # Get dataset ID
                dataset_id = self._get_dataset_id(platform, service)
                
                # Get the URL (assuming single URL per input collection)
                url = input_collection.urls[0] if input_collection.urls else ""
                
                # Create batch scraper job
                batch_job = self._create_batch_scraper_job_for_run(
                    input_collection, 
                    scraping_run.configuration,
                    dataset_id
                )
                
                if batch_job:
                    # Create scraping job
                    ScrapingJob.objects.create(
                        scraping_run=scraping_run,
                        input_collection=input_collection,
                        batch_job=batch_job,
                        status='pending',
                        dataset_id=dataset_id,
                        platform=platform,
                        service_type=service,
                        url=url
                    )
                    
                    logger.info(f"Created scraping job for input collection {input_collection.id}")
                else:
                    logger.error(f"Failed to create batch job for input collection {input_collection.id}")
                    
            except Exception as e:
                logger.error(f"Error creating scraping job for input collection {input_collection.id}: {str(e)}")
    
    def _get_dataset_id(self, platform: str, service: str) -> str:
        """
        Get dataset ID based on platform and service
        
        Args:
            platform: Platform name (facebook, instagram, etc.)
            service: Service type (posts, comments, etc.)
            
        Returns:
            str: Dataset ID for BrightData
        """
        platform_mapping = self.DATASET_MAPPING.get(platform, {})
        return platform_mapping.get(service, 'gd_lk5ns7kz21pck8jpis')  # Default dataset
    
    def _create_batch_scraper_job_for_run(self, input_collection: InputCollection, 
                                        configuration: Dict[str, Any], dataset_id: str) -> Optional[BatchScraperJob]:
        """
        Create batch scraper job for a specific input collection with run configuration
        
        Args:
            input_collection: InputCollection instance
            configuration: Global configuration from ScrapingRun
            dataset_id: Dataset ID for BrightData
            
        Returns:
            BatchScraperJob: Created batch job or None if failed
        """
        try:
            # Get or create BrightData config
            config = self._get_or_create_brightdata_config(input_collection.platform_service)
            
            if not config:
                logger.error(f"No BrightData config found for platform service {input_collection.platform_service}")
                return None
            
            # Convert ISO date strings to YYYY-MM-DD format for Django DateField
            start_date = None
            end_date = None
            
            if configuration.get('start_date'):
                try:
                    # Parse ISO date string and convert to YYYY-MM-DD
                    from datetime import datetime
                    start_date_obj = datetime.fromisoformat(configuration['start_date'].replace('Z', '+00:00'))
                    start_date = start_date_obj.strftime('%Y-%m-%d')
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid start_date format: {configuration.get('start_date')}")
            
            if configuration.get('end_date'):
                try:
                    # Parse ISO date string and convert to YYYY-MM-DD
                    from datetime import datetime
                    end_date_obj = datetime.fromisoformat(configuration['end_date'].replace('Z', '+00:00'))
                    end_date = end_date_obj.strftime('%Y-%m-%d')
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid end_date format: {configuration.get('end_date')}")
            
            # Map service name to content type for BrightData
            service_name = input_collection.platform_service.service.name.lower()
            content_type = self._map_service_to_content_type(service_name)
            
            # Create batch scraper job with global configuration
            batch_job = BatchScraperJob.objects.create(
                name=f"Batch Job - {input_collection.platform_service.platform.name} - {input_collection.platform_service.service.name}",
                project=input_collection.project,
                source_folder_ids=[],  # Will be populated by BrightData integration
                platforms_to_scrape=[input_collection.platform_service.platform.name],
                content_types_to_scrape={
                    input_collection.platform_service.platform.name: [content_type]
                },
                num_of_posts=configuration.get('num_of_posts', 10),
                start_date=start_date,
                end_date=end_date,
                auto_create_folders=configuration.get('auto_create_folders', True),
                output_folder_pattern=configuration.get('output_folder_pattern', 'scraped_data'),
                platform_params={
                    'input_collection_id': input_collection.id,
                    'dataset_id': dataset_id,
                    'brightdata_config_id': config.id
                }
            )
            
            logger.info(f"Created batch scraper job {batch_job.id} for input collection {input_collection.id}")
            return batch_job
            
        except Exception as e:
            logger.error(f"Error creating batch scraper job: {str(e)}")
            return None
    
    def retry_failed_job(self, job_id: int) -> bool:
        """
        Retry a failed scraping job
        
        Args:
            job_id: ID of the ScrapingJob to retry
            
        Returns:
            bool: True if retry was successful, False otherwise
        """
        try:
            job = ScrapingJob.objects.get(id=job_id)
            
            if job.status != 'failed':
                logger.warning(f"Job {job_id} is not in failed status, cannot retry")
                return False
            
            # Reset job status
            job.status = 'pending'
            job.error_message = None
            job.retry_count += 1
            job.save()
            
            # Reset batch job status
            if job.batch_job:
                job.batch_job.status = 'pending'
                job.batch_job.save()
            
            logger.info(f"Retried job {job_id}, retry count: {job.retry_count}")
            return True
            
        except ScrapingJob.DoesNotExist:
            logger.error(f"ScrapingJob with ID {job_id} does not exist")
            return False
        except Exception as e:
            logger.error(f"Error retrying job {job_id}: {str(e)}")
            return False
    
    def update_scraping_run_status(self, run_id: int) -> bool:
        """
        Update the status of a scraping run based on its jobs
        
        Args:
            run_id: ID of the ScrapingRun
            
        Returns:
            bool: True if update was successful
        """
        try:
            run = ScrapingRun.objects.get(id=run_id)
            run.update_status_from_jobs()
            return True
            
        except ScrapingRun.DoesNotExist:
            logger.error(f"ScrapingRun with ID {run_id} does not exist")
            return False
        except Exception as e:
            logger.error(f"Error updating scraping run status: {str(e)}")
            return False 
    
    def create_scraping_run_from_tracksources(self, project_id: int, configuration: Dict[str, Any], user=None) -> ScrapingRun:
        """
        Create a new scraping run directly from TrackSource items (simplified flow)
        
        Args:
            project_id: ID of the project
            configuration: Global configuration for all jobs in this run
            user: User creating the run
            
        Returns:
            ScrapingRun: Created scraping run instance
        """
        try:
            # Validate configuration
            if not configuration.get('start_date'):
                raise ValueError("Start date is required in configuration")
            
            if not configuration.get('end_date'):
                raise ValueError("End date is required in configuration")
            
            # Validate that end_date is not before start_date
            try:
                from datetime import datetime
                start_date = datetime.fromisoformat(configuration['start_date'].replace('Z', '+00:00'))
                end_date = datetime.fromisoformat(configuration['end_date'].replace('Z', '+00:00'))
                
                if end_date < start_date:
                    raise ValueError("End date cannot be before start date")
            except (ValueError, AttributeError):
                raise ValueError("Invalid date format in configuration")
            
            project = Project.objects.get(id=project_id)
            
            # Create scraping run
            created_by_user = user if user and not user.is_anonymous else None
            
            scraping_run = ScrapingRun.objects.create(
                project=project,
                name=f"Scraping Run - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                configuration=configuration,
                status='pending',
                created_by=created_by_user
            )
            
            logger.info(f"Created scraping run {scraping_run.id} for project {project.name}")
            
            # Create hierarchical folders
            from .correct_folder_service import CorrectFolderService
            folder_service = CorrectFolderService()
            
            # Get all TrackSource records for this project
            track_sources = TrackSource.objects.filter(project=scraping_run.project)
            
            if track_sources.exists():
                # Create correct hierarchical folder structure
                created_folders = folder_service.create_correct_folder_structure(scraping_run, list(track_sources))
                logger.info(f"Created correct hierarchical folders for scraping run {scraping_run.id}")
            
            # Create jobs directly from TrackSource items
            self._create_scraping_jobs_from_tracksources(scraping_run, configuration)
            
            return scraping_run
            
        except Project.DoesNotExist:
            raise ValueError(f"Project with ID {project_id} does not exist")
        except Exception as e:
            logger.error(f"Error creating scraping run: {str(e)}")
            raise

    def _create_scraping_jobs_from_tracksources(self, scraping_run: ScrapingRun, configuration: Dict[str, Any]):
        """
        Create individual scraping jobs directly from TrackSource items
        
        Args:
            scraping_run: ScrapingRun instance
            configuration: Global configuration from ScrapingRun
        """
        from track_accounts.models import TrackSource
        from users.models import PlatformService
        
        # Get all TrackSource records for this project
        track_sources = TrackSource.objects.filter(project=scraping_run.project)
        
        for track_source in track_sources:
            # Get platform and service info
            platform_name = track_source.platform.lower()
            service_name = track_source.service_name.lower()
            
            # Find the corresponding PlatformService
            try:
                platform_service = PlatformService.objects.get(
                    platform__name=platform_name,
                    service__name=service_name,
                    is_enabled=True
                )
            except PlatformService.DoesNotExist:
                logger.warning(f"No PlatformService found for {platform_name} - {service_name}")
                continue
            
            # Extract URL for the specific platform
            url = None
            if platform_name == 'facebook' and track_source.facebook_link:
                url = track_source.facebook_link
            elif platform_name == 'instagram' and track_source.instagram_link:
                url = track_source.instagram_link
            elif platform_name == 'linkedin' and track_source.linkedin_link:
                url = track_source.linkedin_link
            elif platform_name == 'tiktok' and track_source.tiktok_link:
                url = track_source.tiktok_link
            elif track_source.other_social_media:
                url = track_source.other_social_media
            
            if not url:
                logger.warning(f"No URL found for {platform_name} - {service_name}")
                continue
            
            try:
                # Get dataset ID
                dataset_id = self._get_dataset_id(platform_name, service_name)
                
                # Get or create BrightData config
                config = self._get_or_create_brightdata_config(platform_service)
                
                if not config:
                    logger.error(f"No BrightData config found for platform service {platform_service}")
                    continue
                
                # Convert ISO date strings to YYYY-MM-DD format for Django DateField
                start_date = None
                end_date = None
                
                if configuration.get('start_date'):
                    try:
                        # Parse ISO date string and convert to YYYY-MM-DD
                        from datetime import datetime
                        start_date_obj = datetime.fromisoformat(configuration['start_date'].replace('Z', '+00:00'))
                        start_date = start_date_obj.strftime('%Y-%m-%d')
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid start_date format: {configuration.get('start_date')}")
                
                if configuration.get('end_date'):
                    try:
                        # Parse ISO date string and convert to YYYY-MM-DD
                        from datetime import datetime
                        end_date_obj = datetime.fromisoformat(configuration['end_date'].replace('Z', '+00:00'))
                        end_date = end_date_obj.strftime('%Y-%m-%d')
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid end_date format: {configuration.get('end_date')}")
                
                # Map service name to content type for BrightData
                content_type = self._map_service_to_content_type(service_name)
                
                # Create batch scraper job
                batch_job = BatchScraperJob.objects.create(
                    name=f"Batch Job - {platform_name} - {service_name}",
                    project=scraping_run.project,
                    source_folder_ids=[],
                    platforms_to_scrape=[platform_name],
                    content_types_to_scrape={
                        platform_name: [content_type]
                    },
                    num_of_posts=configuration.get('num_of_posts', 10),
                    start_date=start_date,
                    end_date=end_date,
                    auto_create_folders=configuration.get('auto_create_folders', True),
                    output_folder_pattern=configuration.get('output_folder_pattern', 'scraped_data'),
                    platform_params={
                        'track_source_id': track_source.id,
                        'dataset_id': dataset_id,
                        'brightdata_config_id': config.id,
                        'platform_name': platform_name,
                        'service_name': service_name
                    }
                )
                
                # Create scraping job (without InputCollection)
                ScrapingJob.objects.create(
                    scraping_run=scraping_run,
                    input_collection=None,  # No InputCollection needed
                    batch_job=batch_job,
                    status='pending',
                    dataset_id=dataset_id,
                    platform=platform_name,
                    service_type=service_name,
                    url=url
                )
                
                logger.info(f"Created scraping job for TrackSource {track_source.id} - {url}")
                
            except Exception as e:
                logger.error(f"Error creating scraping job for TrackSource {track_source.id}: {str(e)}")
        
        # Update run statistics
        scraping_run.total_jobs = scraping_run.scraping_jobs.count()
        scraping_run.save() 

def update_scraping_jobs_from_batch_job(batch_job_id: int) -> bool:
    """
    Update ScrapingJob statuses based on the completion of a BatchScraperJob.
    This method should be called when a BatchScraperJob completes to ensure
    ScrapingJob statuses are properly updated even if ScraperRequests fail.
    """
    try:
        from brightdata_integration.models import BatchScraperJob, ScraperRequest
        
        batch_job = BatchScraperJob.objects.get(id=batch_job_id)
        
        # Get all ScrapingJobs associated with this BatchScraperJob
        scraping_jobs = ScrapingJob.objects.filter(batch_job=batch_job)
        
        # Get all ScraperRequests associated with this BatchScraperJob
        scraper_requests = ScraperRequest.objects.filter(batch_job=batch_job)
        
        # Create a mapping of ScraperRequest to ScrapingJob
        request_to_job = {}
        for scraping_job in scraping_jobs:
            # Find the corresponding ScraperRequest by URL and platform
            matching_request = None
            for request in scraper_requests:
                if (request.target_url == scraping_job.url and 
                    request.platform.split('_')[0] == scraping_job.platform):
                    matching_request = request
                    break
            
            if matching_request:
                request_to_job[matching_request.id] = scraping_job
        
        # Update ScrapingJob statuses based on ScraperRequest statuses
        updated_count = 0
        for request in scraper_requests:
            if request.id in request_to_job:
                scraping_job = request_to_job[request.id]
                
                # Update status based on ScraperRequest status
                if request.status == 'completed':
                    scraping_job.status = 'completed'
                    scraping_job.completed_at = timezone.now()
                elif request.status == 'failed':
                    scraping_job.status = 'failed'
                    scraping_job.error_message = request.error_message or 'Scraper request failed'
                    scraping_job.completed_at = timezone.now()
                elif request.status == 'pending':
                    # Keep as processing if still pending
                    scraping_job.status = 'processing'
                else:
                    # For any other status, keep as processing
                    scraping_job.status = 'processing'
                
                scraping_job.save()
                updated_count += 1
        
        logger.info(f"Updated {updated_count} ScrapingJob statuses for BatchScraperJob {batch_job_id}")
        return True
        
    except BatchScraperJob.DoesNotExist:
        logger.error(f"BatchScraperJob with ID {batch_job_id} does not exist")
        return False
    except Exception as e:
        logger.error(f"Error updating ScrapingJob statuses for BatchScraperJob {batch_job_id}: {str(e)}")
        return False 
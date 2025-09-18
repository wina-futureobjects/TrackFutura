from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from .models import ScrapingRun
from track_accounts.models import TrackSource
from users.models import Project
import logging

logger = logging.getLogger(__name__)

class CorrectFolderService:
    """
    Service for creating the correct folder structure based on user requirements:
    
    1. Each project has one or more input sources, where each input source corresponds to one project only
    2. Each input source corresponds to only one scrape job, and each scrape job has only one output
    3. Each run contains one or more scrape jobs, where each run schedules all available input sources for scrape job
    4. Each scrape output is stored into a job folder through webhook, where each job folder corresponds to one output only
    5. Each run's outputs are stored in one run folder, where each run folder stores the run's scrape job's outputs as job folders
    6. Each run folder corresponds to one run only
    """
    
    def __init__(self):
        self.platform_folder_models = {
            'facebook': 'facebook_data.Folder',
            'instagram': 'instagram_data.Folder', 
            'linkedin': 'linkedin_data.Folder',
            'tiktok': 'tiktok_data.Folder'
        }
    
    def create_correct_folder_structure(self, scraping_run: ScrapingRun, track_sources: List[TrackSource]) -> Dict[str, Any]:
        """
        Create the correct folder structure: 
        Run Folder (Parent) → Service Folders (Children) → Job Folders (Grandchildren)
        
        Example:
        - Run Folder: "Scraping Run - 2025-08-07 10:30"
        - Instagram - Posts (Service Folder)
          - Instagram Profile - user1 (Job Folder)
          - Instagram Profile - user2 (Job Folder)
        - Facebook - Posts (Service Folder)
          - Facebook Profile - user1 (Job Folder)
        - LinkedIn - Posts (Service Folder)
          - LinkedIn Profile - user1 (Job Folder)
          - LinkedIn Profile - user2 (Job Folder)
          - LinkedIn Profile - user3 (Job Folder)
        
        Args:
            scraping_run: ScrapingRun instance
            track_sources: List of TrackSource items for this run
            
        Returns:
            Dict containing created folders
        """
        try:
            with transaction.atomic():
                # Create the parent run folder
                run_folder = self._create_run_folder(scraping_run)

                created_folders = {
                    'run_folder': run_folder,
                    'platform_folders': {},
                    'service_folders': {},
                    'job_folders': {}
                }

                # Group track sources by platform and service
                by_platform: Dict[str, Dict[str, List[TrackSource]]] = {}
                for track_source in track_sources:
                    if not track_source.platform or not track_source.service_name:
                        # Skip sources lacking identity
                        logger.warning(f"TrackSource {track_source.id} missing platform/service; skipping")
                        continue
                    platform = track_source.platform.lower()
                    service = track_source.service_name.lower()
                    by_platform.setdefault(platform, {})
                    by_platform[platform].setdefault(service, [])
                    by_platform[platform][service].append(track_source)

                # For each platform, create platform folder, then service folders, then job folders
                for platform, services_map in by_platform.items():
                    platform_folder = self._create_platform_folder(run_folder, platform, scraping_run)
                    created_folders['platform_folders'][platform] = platform_folder

                    for service, sources in services_map.items():
                        service_folder = self._create_service_folder(platform_folder, platform, service, scraping_run)
                        created_folders['service_folders'][f"{platform}_{service}"] = service_folder

                        # Maintain ServiceFolderIndex for O(1) lookups
                        self._upsert_service_folder_index(scraping_run, platform, service, service_folder)

                        for track_source in sources:
                            job_folder = self._create_job_folder(service_folder, track_source, scraping_run)
                            created_folders['job_folders'][track_source.id] = job_folder
                
                total_services = sum(len(services_map) for services_map in by_platform.values())
                logger.info(
                    f"Created correct folder structure for scraping run {scraping_run.id}: "
                    f"{len(by_platform)} platform folders, {total_services} service folders, {len(track_sources)} job folders"
                )
                return created_folders
                
        except Exception as e:
            logger.error(f"Error creating correct folder structure: {str(e)}")
            raise
    
    def _create_run_folder(self, scraping_run: ScrapingRun):
        """
        Create the top-level Scraping Run folder
        
        Args:
            scraping_run: ScrapingRun instance
            
        Returns:
            Single run folder that represents the entire scraping run
        """
        name = f"Scraping Run - {scraping_run.created_at.strftime('%Y-%m-%d %H:%M')}"
        description = f"Scraping run created on {scraping_run.created_at.strftime('%Y-%m-%d %H:%M')}"
        
        # Create a single run folder in the track_accounts app (platform-agnostic)
        from track_accounts.models import UnifiedRunFolder
        
        run_folder = UnifiedRunFolder.objects.create(
            name=name,
            description=description,
            folder_type='run',
            scraping_run=scraping_run,
            project=scraping_run.project,
            category='posts'
        )
        
        logger.info(f"Created unified run folder: {name}")
        return run_folder
    
    def _create_service_folder(self, parent_folder, platform: str, service: str, scraping_run: ScrapingRun):
        """
        Create a service folder (child of platform folder)
        
        Args:
            parent_folder: Parent platform folder
            platform: Platform name (facebook, instagram, etc.)
            service: Service name (posts, comments, etc.)
            scraping_run: ScrapingRun instance
            
        Returns:
            UnifiedRunFolder instance for the service
        """
        from track_accounts.models import UnifiedRunFolder
        
        # Generate service folder name
        service_name = f"{platform.title()} - {service.title()}"
        
        # Map service to category
        category = self._map_service_to_category(service)
        
        service_folder = UnifiedRunFolder.objects.create(
            name=service_name,
            description=f"Service folder for {platform} {service}",
            category=category,
            folder_type='service',
            parent_folder=parent_folder,
            project=scraping_run.project,
            scraping_run=scraping_run,
            platform_code=platform.lower(),
            service_code=service.lower(),
        )
        
        logger.info(f"Created service folder: {service_name}")
        return service_folder

    def _create_platform_folder(self, run_folder, platform: str, scraping_run: ScrapingRun):
        """
        Create a platform folder (child of run folder)

        Args:
            run_folder: Parent run folder
            platform: Platform code
            scraping_run: ScrapingRun instance

        Returns:
            UnifiedRunFolder instance for the platform
        """
        from track_accounts.models import UnifiedRunFolder

        platform_name = platform.title()
        platform_folder = UnifiedRunFolder.objects.create(
            name=platform_name,
            description=f"Platform folder for {platform}",
            category='posts',
            folder_type='platform',
            parent_folder=run_folder,
            project=scraping_run.project,
            scraping_run=scraping_run,
            platform_code=platform.lower(),
        )
        logger.info(f"Created platform folder: {platform_name}")
        return platform_folder
    
    def _create_job_folder(self, service_folder, track_source: TrackSource, scraping_run: ScrapingRun):
        """
        Create a job folder for a single TrackSource (child of service folder)
        
        Args:
            service_folder: Parent service folder
            track_source: TrackSource instance
            scraping_run: ScrapingRun instance
            
        Returns:
            UnifiedRunFolder instance for the job
        """
        from track_accounts.models import UnifiedRunFolder
        
        # Generate job folder name
        job_name = self._generate_job_folder_name(track_source)
        
        # Get the appropriate URL for description
        platform = track_source.platform.lower()
        url = None
        
        if platform == 'facebook' and track_source.facebook_link:
            url = track_source.facebook_link
        elif platform == 'instagram' and track_source.instagram_link:
            url = track_source.instagram_link
        elif platform == 'linkedin' and track_source.linkedin_link:
            url = track_source.linkedin_link
        elif platform == 'tiktok' and track_source.tiktok_link:
            url = track_source.tiktok_link
        elif track_source.other_social_media:
            url = track_source.other_social_media
        
        job_folder = UnifiedRunFolder.objects.create(
            name=job_name,
            description=f"Job output for {url or 'unknown source'}",
            folder_type='job',
            parent_folder=service_folder,  # Parent is the service folder
            scraping_run=scraping_run,
            project=scraping_run.project,
            category=self._map_service_to_category(track_source.service_name),
            platform_code=(track_source.platform or '').lower() or None,
            service_code=(track_source.service_name or '').lower() or None,
        )
        
        logger.info(f"Created job folder: {job_name}")
        return job_folder

    def _upsert_service_folder_index(self, scraping_run: ScrapingRun, platform: str, service: str, folder) -> None:
        """Create or update the ServiceFolderIndex entry for this (run, platform, service)."""
        from track_accounts.models import ServiceFolderIndex
        ServiceFolderIndex.objects.update_or_create(
            scraping_run=scraping_run,
            platform_code=platform.lower(),
            service_code=service.lower(),
            defaults={
                'folder': folder,
            }
        )
    
    def _generate_job_folder_name(self, track_source: TrackSource) -> str:
        """
        Generate a job folder name for a TrackSource
        
        Args:
            track_source: TrackSource instance
            
        Returns:
            Job folder name string
        """
        # Get the appropriate URL based on platform
        platform = track_source.platform.lower()
        url = None
        
        if platform == 'facebook' and track_source.facebook_link:
            url = track_source.facebook_link
        elif platform == 'instagram' and track_source.instagram_link:
            url = track_source.instagram_link
        elif platform == 'linkedin' and track_source.linkedin_link:
            url = track_source.linkedin_link
        elif platform == 'tiktok' and track_source.tiktok_link:
            url = track_source.tiktok_link
        elif track_source.other_social_media:
            url = track_source.other_social_media
        
        if not url:
            return f"{track_source.platform.title()} Profile - Unknown Source"
        
        # Try to extract username from different URL formats
        if 'facebook.com' in url:
            # Extract from Facebook URL
            if '/posts/' in url:
                # Post URL - extract post ID
                post_id = url.split('/posts/')[-1].split('/')[0]
                return f"Facebook Profile - Post {post_id}"
            else:
                # Profile URL - extract username
                username = url.split('facebook.com/')[-1].split('/')[0]
                return f"Facebook Profile - {username}"
        elif 'instagram.com' in url:
            # Extract from Instagram URL
            if '/p/' in url:
                # Post URL - extract post ID
                post_id = url.split('/p/')[-1].split('/')[0]
                return f"Instagram Profile - Post {post_id}"
            else:
                # Profile URL - extract username
                username = url.split('instagram.com/')[-1].split('/')[0]
                return f"Instagram Profile - {username}"
        elif 'linkedin.com' in url:
            # Extract from LinkedIn URL
            if '/posts/' in url:
                # Post URL - extract post ID
                post_id = url.split('/posts/')[-1].split('/')[0]
                return f"LinkedIn Profile - Post {post_id}"
            else:
                # Profile URL - extract username
                username = url.split('linkedin.com/in/')[-1].split('/')[0]
                return f"LinkedIn Profile - {username}"
        elif 'tiktok.com' in url:
            # Extract from TikTok URL
            if '/video/' in url:
                # Video URL - extract video ID
                video_id = url.split('/video/')[-1].split('/')[0]
                return f"TikTok Profile - Video {video_id}"
            else:
                # Profile URL - extract username
                username = url.split('tiktok.com/@')[-1].split('/')[0]
                return f"Job {track_source.id} - TikTok Profile {username}"
        else:
            # Generic fallback
            return f"Job {track_source.id} - {platform.title()} {track_source.service_name.title()}"
    
    def _get_folder_model(self, platform: str):
        """
        Get the appropriate Folder model for a platform
        
        Args:
            platform: Platform name
            
        Returns:
            Folder model class
        """
        if platform == 'facebook':
            from facebook_data.models import Folder
            return Folder
        elif platform == 'instagram':
            from instagram_data.models import Folder
            return Folder
        elif platform == 'linkedin':
            from linkedin_data.models import Folder
            return Folder
        elif platform == 'tiktok':
            from tiktok_data.models import Folder
            return Folder
        else:
            raise ValueError(f"Unsupported platform: {platform}")
    
    def _map_service_to_category(self, service: str) -> str:
        """
        Map service name to folder category
        
        Args:
            service: Service name
            
        Returns:
            Category string
        """
        service_mapping = {
            'posts': 'posts',
            'comments': 'comments',
            'reels': 'reels',
            'profiles': 'posts'  # Profiles are stored as posts
        }
        return service_mapping.get(service.lower(), 'posts')
    
    def get_correct_folder_hierarchy(self, scraping_run: ScrapingRun) -> Dict[str, Any]:
        """
        Get the correct folder hierarchy for a scraping run
        
        Args:
            scraping_run: ScrapingRun instance
            
        Returns:
            Dict containing the folder hierarchy
        """
        try:
            from track_accounts.models import UnifiedRunFolder
            
            # Get the run folder
            run_folder = UnifiedRunFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='run'
            ).first()
            
            if not run_folder:
                return {'error': 'Run folder not found'}
            
            # Get all platform folders for this run
            platform_folders = UnifiedRunFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='platform'
            ).order_by('created_at')

            # Get all service folders for this run
            service_folders = UnifiedRunFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='service'
            ).order_by('created_at')

            # Get all job folders for this run (new type), fallback legacy content
            job_folders = UnifiedRunFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='job'
            ).order_by('created_at')
            if not job_folders.exists():
                job_folders = UnifiedRunFolder.objects.filter(
                    scraping_run=scraping_run,
                    folder_type='content'
                ).order_by('created_at')

            return {
                'run_folder': self._serialize_folder(run_folder),
                'platform_folders': [self._serialize_folder(folder) for folder in platform_folders],
                'service_folders': [self._serialize_folder(folder) for folder in service_folders],
                'job_folders': [self._serialize_folder(folder) for folder in job_folders]
            }
            
        except Exception as e:
            logger.error(f"Error getting correct folder hierarchy: {str(e)}")
            return {'error': str(e)}
    
    def _serialize_folder(self, folder) -> Dict[str, Any]:
        """
        Serialize a folder object to a dictionary
        
        Args:
            folder: Folder instance
            
        Returns:
            Dict containing folder data
        """
        return {
            'id': folder.id,
            'name': folder.name,
            'description': folder.description,
            'folder_type': folder.folder_type,
            'category': getattr(folder, 'category', 'posts'),
            'platform': self._get_platform_from_folder(folder),
            'scraping_run': folder.scraping_run_id,
            'project': folder.project_id,
            'created_at': folder.created_at.isoformat() if folder.created_at else None,
            'updated_at': folder.updated_at.isoformat() if hasattr(folder, 'updated_at') and folder.updated_at else None
        }
    
    def _get_platform_from_folder(self, folder) -> str:
        """
        Determine the platform from the folder's name (for UnifiedRunFolder)
        """
        if not folder.name:
            return 'unknown'
        
        name_lower = folder.name.lower()
        if 'instagram' in name_lower:
            return 'instagram'
        elif 'facebook' in name_lower:
            return 'facebook'
        elif 'linkedin' in name_lower:
            return 'linkedin'
        elif 'tiktok' in name_lower:
            return 'tiktok'
        return 'unknown' 
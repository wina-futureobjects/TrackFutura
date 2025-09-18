from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from datetime import datetime
from .models import ScrapingRun
from track_accounts.models import TrackSource
from users.models import Project
import logging

logger = logging.getLogger(__name__)

class FolderService:
    """
    Service for creating and managing hierarchical folder structures
    """
    
    def __init__(self):
        self.platform_folder_models = {
            'facebook': 'facebook_data.Folder',
            'instagram': 'instagram_data.Folder', 
            'linkedin': 'linkedin_data.Folder',
            'tiktok': 'tiktok_data.Folder'
        }
    
    def create_hierarchical_folders(self, scraping_run: ScrapingRun, track_sources: List[TrackSource]) -> Dict[str, Any]:
        """
        Create hierarchical folder structure for a scraping run
        
        Args:
            scraping_run: ScrapingRun instance
            track_sources: List of TrackSource items for this run
            
        Returns:
            Dict containing created folders organized by platform
        """
        try:
            with transaction.atomic():
                # Create a single unified run folder
                run_folder = self._create_run_folder(scraping_run)
                
                # Group TrackSources by platform and service
                platform_service_groups = self._group_tracksources_by_platform_service(track_sources)
                
                created_folders = {
                    'run_folder': run_folder,
                    'service_folders': {},
                    'content_folders': {}
                }
                
                # Create platform-service folders under the unified run folder
                for (platform, service), sources in platform_service_groups.items():
                    service_folder = self._create_service_folder(
                        run_folder, platform, service, scraping_run
                    )
                    created_folders['service_folders'][f"{platform}_{service}"] = service_folder
                    
                    # Create content folders for each source
                    for source in sources:
                        content_folder = self._create_content_folder(
                            service_folder, source, scraping_run
                        )
                        created_folders['content_folders'][source.id] = content_folder
                
                logger.info(f"Created hierarchical folders for scraping run {scraping_run.id}")
                return created_folders
                
        except Exception as e:
            logger.error(f"Error creating hierarchical folders: {str(e)}")
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
        Create a platform-service folder
        
        Args:
            parent_folder: Parent folder (run folder)
            platform: Platform name (facebook, instagram, etc.)
            service: Service type (posts, comments, etc.)
            scraping_run: ScrapingRun instance
            
        Returns:
            Folder instance for the service
        """
        # Get the appropriate Folder model for the platform
        folder_model = self._get_folder_model(platform)
        
        name = f"{platform.title()} - {service.title()}"
        
        # Create service folder without parent_folder (since it's cross-platform)
        service_folder = folder_model.objects.create(
            name=name,
            description=f"{platform.title()} {service} data from scraping run",
            folder_type='service',
            parent_folder=None,  # No parent since run folder is in different model
            scraping_run=scraping_run,
            project=scraping_run.project,
            category=self._map_service_to_category(service)
        )
        
        logger.info(f"Created service folder: {name}")
        return service_folder
    
    def _create_content_folder(self, parent_folder, track_source: TrackSource, scraping_run: ScrapingRun):
        """
        Create a content folder for a specific TrackSource
        
        Args:
            parent_folder: Parent folder (service folder)
            track_source: TrackSource instance
            scraping_run: ScrapingRun instance
            
        Returns:
            Folder instance for the content
        """
        # Get the appropriate Folder model for the platform
        folder_model = self._get_folder_model(track_source.platform.lower())
        
        # Generate folder name from TrackSource
        folder_name = self._generate_content_folder_name(track_source)
        
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
        
        content_folder = folder_model.objects.create(
            name=folder_name,
            description=f"Content from {url or 'unknown source'}",
            folder_type='content',
            parent_folder=parent_folder,
            scraping_run=scraping_run,
            project=scraping_run.project,
            category=self._map_service_to_category(track_source.service_name)
        )
        
        logger.info(f"Created content folder: {folder_name}")
        return content_folder
    
    def _group_tracksources_by_platform_service(self, track_sources: List[TrackSource]) -> Dict[tuple, List[TrackSource]]:
        """
        Group TrackSource items by platform and service
        
        Args:
            track_sources: List of TrackSource items
            
        Returns:
            Dict with (platform, service) as key and list of TrackSource items as value
        """
        groups = {}
        for source in track_sources:
            key = (source.platform.lower(), source.service_name.lower())
            if key not in groups:
                groups[key] = []
            groups[key].append(source)
        return groups
    
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
    
    def _generate_content_folder_name(self, track_source: TrackSource) -> str:
        """
        Generate a folder name for a TrackSource
        
        Args:
            track_source: TrackSource instance
            
        Returns:
            Folder name string
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
            return f"Unknown Source - {track_source.id}"
        
        # Try to extract username from different URL formats
        if 'facebook.com' in url:
            # Extract from Facebook URL
            if '/posts/' in url:
                # Post URL - extract post ID
                post_id = url.split('/posts/')[-1].split('/')[0]
                return f"Facebook Post - {post_id}"
            else:
                # Profile URL - extract username
                username = url.split('facebook.com/')[-1].split('/')[0]
                return f"Facebook Profile - {username}"
        
        elif 'instagram.com' in url:
            # Extract from Instagram URL
            if '/p/' in url:
                # Post URL - extract shortcode
                shortcode = url.split('/p/')[-1].split('/')[0]
                return f"Instagram Post - {shortcode}"
            else:
                # Profile URL - extract username
                username = url.split('instagram.com/')[-1].split('/')[0]
                return f"Instagram Profile - {username}"
        
        elif 'linkedin.com' in url:
            # Extract from LinkedIn URL
            if '/posts/' in url:
                # Post URL - extract post ID
                post_id = url.split('/posts/')[-1].split('/')[0]
                return f"LinkedIn Post - {post_id}"
            else:
                # Profile URL - extract identifier
                identifier = url.split('linkedin.com/')[-1].split('/')[0]
                return f"LinkedIn Profile - {identifier}"
        
        elif 'tiktok.com' in url:
            # Extract from TikTok URL
            if '/@' in url:
                # Profile URL - extract username
                username = url.split('/@')[-1].split('/')[0]
                return f"TikTok Profile - {username}"
            else:
                # Video URL - extract video ID
                video_id = url.split('/')[-1]
                return f"TikTok Video - {video_id}"
        
        else:
            # Generic fallback
            return f"Source - {track_source.id}"
    
    def get_folder_hierarchy(self, scraping_run: ScrapingRun) -> Dict[str, Any]:
        """
        Get the complete folder hierarchy for a scraping run
        
        Args:
            scraping_run: ScrapingRun instance
            
        Returns:
            Dict containing the folder hierarchy
        """
        try:
            # Get run folders from all platforms
            from facebook_data.models import Folder as FacebookFolder
            from instagram_data.models import Folder as InstagramFolder
            from linkedin_data.models import Folder as LinkedInFolder
            from tiktok_data.models import Folder as TikTokFolder
            
            run_folders = {}
            run_folders['facebook'] = FacebookFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='run'
            ).first()
            run_folders['instagram'] = InstagramFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='run'
            ).first()
            run_folders['linkedin'] = LinkedInFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='run'
            ).first()
            run_folders['tiktok'] = TikTokFolder.objects.filter(
                scraping_run=scraping_run,
                folder_type='run'
            ).first()
            
            # Use the first available run folder as the main one
            main_run_folder = None
            for platform, folder in run_folders.items():
                if folder:
                    main_run_folder = folder
                    break
            
            if not main_run_folder:
                return {}
            
            hierarchy = {
                'run_folder': self._serialize_folder(main_run_folder),
                'service_folders': [],
                'content_folders': []
            }
            
            # Get service folders from all platforms
            for platform, run_folder in run_folders.items():
                if run_folder:
                    for subfolder in run_folder.subfolders.filter(folder_type='service'):
                        service_data = self._serialize_folder(subfolder)
                        service_data['content_folders'] = []
                        
                        # Get content folders
                        for content_folder in subfolder.subfolders.filter(folder_type='content'):
                            content_data = self._serialize_folder(content_folder)
                            service_data['content_folders'].append(content_data)
                        
                        hierarchy['service_folders'].append(service_data)
            
            return hierarchy
            
        except Exception as e:
            logger.error(f"Error getting folder hierarchy: {str(e)}")
            return {}
    
    def _serialize_folder(self, folder) -> Dict[str, Any]:
        """
        Serialize a folder for API response
        
        Args:
            folder: Folder instance
            
        Returns:
            Dict containing folder data
        """
        return {
            'id': folder.id,
            'name': folder.name,
            'description': folder.description,
            'category': folder.category,
            'category_display': getattr(folder, 'category_display', ''),
            'folder_type': folder.folder_type,
            'platform': self._get_platform_from_folder(folder),
            'created_at': folder.created_at.isoformat() if folder.created_at else None,
            'post_count': folder.get_content_count(),
            'parent_folder': folder.parent_folder.id if folder.parent_folder else None,
            'scraping_run': folder.scraping_run.id if folder.scraping_run else None
        }
    
    def _get_platform_from_folder(self, folder) -> str:
        """
        Get platform name from folder model
        
        Args:
            folder: Folder instance
            
        Returns:
            Platform name string
        """
        model_name = folder._meta.model_name
        if 'facebook' in folder._meta.app_label:
            return 'facebook'
        elif 'instagram' in folder._meta.app_label:
            return 'instagram'
        elif 'linkedin' in folder._meta.app_label:
            return 'linkedin'
        elif 'tiktok' in folder._meta.app_label:
            return 'tiktok'
        else:
            return 'unknown' 
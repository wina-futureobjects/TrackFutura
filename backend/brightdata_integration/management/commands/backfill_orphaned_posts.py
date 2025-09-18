from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from brightdata_integration.models import ScraperRequest
from track_accounts.models import UnifiedRunFolder
from facebook_data.models import FacebookPost, Folder as FacebookFolder
from instagram_data.models import InstagramPost, Folder as InstagramFolder
from linkedin_data.models import LinkedInPost, Folder as LinkedInFolder
from tiktok_data.models import TikTokPost, Folder as TikTokFolder
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Backfill orphaned posts by matching them to correct folders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be processed without actually processing'
        )
        parser.add_argument(
            '--platform',
            type=str,
            choices=['facebook', 'instagram', 'linkedin', 'tiktok', 'all'],
            default='all',
            help='Platform to process (default: all)'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        platform = options['platform']
        
        self.stdout.write(f"Backfilling orphaned posts (platform: {platform}, dry_run: {dry_run})")
        
        platforms_to_process = ['facebook', 'instagram', 'linkedin', 'tiktok'] if platform == 'all' else [platform]
        
        total_orphaned = 0
        total_fixed = 0
        
        for platform_name in platforms_to_process:
            orphaned_count, fixed_count = self._process_platform(platform_name, dry_run)
            total_orphaned += orphaned_count
            total_fixed += fixed_count
        
        # Summary
        self.stdout.write("\n" + "="*50)
        self.stdout.write("BACKFILL SUMMARY")
        self.stdout.write("="*50)
        self.stdout.write(f"Total orphaned posts found: {total_orphaned}")
        self.stdout.write(f"Total posts fixed: {total_fixed}")
        
        if dry_run:
            self.stdout.write("\nThis was a dry run - no actual changes were made.")
    
    def _process_platform(self, platform, dry_run):
        """Process orphaned posts for a specific platform"""
        self.stdout.write(f"\nProcessing {platform} posts...")
        
        # Get orphaned posts for this platform
        if platform == 'facebook':
            orphaned_posts = FacebookPost.objects.filter(folder__isnull=True)
            folder_model = FacebookFolder
        elif platform == 'instagram':
            orphaned_posts = InstagramPost.objects.filter(folder__isnull=True)
            folder_model = InstagramFolder
        elif platform == 'linkedin':
            orphaned_posts = LinkedInPost.objects.filter(folder__isnull=True)
            folder_model = LinkedInFolder
        elif platform == 'tiktok':
            orphaned_posts = TikTokPost.objects.filter(folder__isnull=True)
            folder_model = TikTokFolder
        else:
            return 0, 0
        
        orphaned_count = orphaned_posts.count()
        self.stdout.write(f"  Found {orphaned_count} orphaned {platform} posts")
        
        if orphaned_count == 0:
            return 0, 0
        
        fixed_count = 0
        
        for post in orphaned_posts:
            try:
                # Try to find the correct folder for this post
                folder = self._find_correct_folder(post, platform, folder_model)
                
                if folder:
                    if not dry_run:
                        post.folder = folder
                        post.save()
                    
                    self.stdout.write(f"  ✓ Fixed post {post.id} -> folder '{folder.name}'")
                    fixed_count += 1
                else:
                    self.stdout.write(f"  ✗ Could not find folder for post {post.id}")
                    
            except Exception as e:
                self.stdout.write(f"  ✗ Error processing post {post.id}: {str(e)}")
        
        self.stdout.write(f"  Fixed {fixed_count}/{orphaned_count} {platform} posts")
        return orphaned_count, fixed_count
    
    def _find_correct_folder(self, post, platform, folder_model):
        """Find the correct folder for a post based on various criteria"""
        
        # Method 1: Try to find by post creation date and platform
        # Look for folders created around the same time as the post
        post_date = post.created_at
        if post_date:
            # Look for folders created within 1 hour of the post
            time_window = timezone.timedelta(hours=1)
            recent_folders = folder_model.objects.filter(
                created_at__range=(post_date - time_window, post_date + time_window)
            )
            
            if recent_folders.exists():
                # If multiple folders, try to find the most specific one
                for folder in recent_folders:
                    if self._is_folder_suitable(folder, platform):
                        return folder
                
                # If no specific match, return the first one
                return recent_folders.first()
        
        # Method 2: Try to find by platform-specific criteria
        if platform == 'instagram':
            # For Instagram, try to match by username if available
            if hasattr(post, 'user_posted') and post.user_posted:
                username_folders = folder_model.objects.filter(
                    name__icontains=post.user_posted
                )
                if username_folders.exists():
                    return username_folders.first()
        
        elif platform == 'facebook':
            # For Facebook, try to match by title or content
            if hasattr(post, 'title') and post.title:
                title_folders = folder_model.objects.filter(
                    name__icontains=post.title[:20]  # First 20 chars
                )
                if title_folders.exists():
                    return title_folders.first()
        
        # Method 3: Find any folder for this platform that doesn't have many posts
        # This is a fallback to avoid leaving posts completely orphaned
        from django.db.models import Count
        folders_with_post_counts = folder_model.objects.annotate(
            post_count=Count('posts')
        ).filter(post_count__lt=10)  # Folders with less than 10 posts
        
        if folders_with_post_counts.exists():
            return folders_with_post_counts.first()
        
        return None
    
    def _is_folder_suitable(self, folder, platform):
        """Check if a folder is suitable for a given platform"""
        # Check if folder name contains platform-specific keywords
        folder_name = folder.name.lower()
        
        if platform == 'instagram':
            return any(keyword in folder_name for keyword in ['instagram', 'ig', 'insta'])
        elif platform == 'facebook':
            return any(keyword in folder_name for keyword in ['facebook', 'fb'])
        elif platform == 'linkedin':
            return any(keyword in folder_name for keyword in ['linkedin', 'li'])
        elif platform == 'tiktok':
            return any(keyword in folder_name for keyword in ['tiktok', 'tt'])
        
        return True

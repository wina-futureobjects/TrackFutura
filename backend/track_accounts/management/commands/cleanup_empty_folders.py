from django.core.management.base import BaseCommand
from django.db.models import Q
from track_accounts.models import UnifiedRunFolder
from instagram_data.models import InstagramPost
from facebook_data.models import FacebookPost
from linkedin_data.models import LinkedInPost
from tiktok_data.models import TikTokPost


class Command(BaseCommand):
    help = 'Clean up empty UnifiedRunFolders that have no associated posts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--project',
            type=int,
            help='Only clean up folders for a specific project ID',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        project_id = options['project']

        self.stdout.write("🔍 Analyzing empty folders...")

        # Get all job and content type folders
        queryset = UnifiedRunFolder.objects.filter(folder_type__in=['job', 'content'])
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
            self.stdout.write(f"📁 Filtering for project {project_id}")

        # Get folders that have posts in any platform
        folders_with_posts = set()
        
        # Check Instagram posts
        insta_folders = InstagramPost.objects.values_list('folder__unified_job_folder_id', flat=True).distinct()
        folders_with_posts.update(insta_folders)
        
        # Check Facebook posts
        fb_folders = FacebookPost.objects.values_list('folder__unified_job_folder_id', flat=True).distinct()
        folders_with_posts.update(fb_folders)
        
        # Check LinkedIn posts
        linkedin_folders = LinkedInPost.objects.values_list('folder__unified_job_folder_id', flat=True).distinct()
        folders_with_posts.update(linkedin_folders)
        
        # Check TikTok posts
        tiktok_folders = TikTokPost.objects.values_list('folder__unified_job_folder_id', flat=True).distinct()
        folders_with_posts.update(tiktok_folders)

        # Find empty folders
        empty_folders = queryset.exclude(id__in=folders_with_posts)
        
        if not empty_folders.exists():
            self.stdout.write(self.style.SUCCESS("✅ No empty folders found!"))
            return

        self.stdout.write(f"📊 Found {empty_folders.count()} empty folders:")
        
        for folder in empty_folders:
            self.stdout.write(f"  - ID: {folder.id}, Name: {folder.name}, Type: {folder.folder_type}, Project: {folder.project_id}")

        if dry_run:
            self.stdout.write(self.style.WARNING("🔍 DRY RUN: No folders were deleted"))
            return

        # Confirm deletion
        confirm = input(f"\n🗑️  Delete {empty_folders.count()} empty folders? (yes/no): ")
        if confirm.lower() != 'yes':
            self.stdout.write("❌ Operation cancelled")
            return

        # Delete empty folders
        deleted_count = empty_folders.count()
        empty_folders.delete()
        
        self.stdout.write(self.style.SUCCESS(f"✅ Successfully deleted {deleted_count} empty folders"))

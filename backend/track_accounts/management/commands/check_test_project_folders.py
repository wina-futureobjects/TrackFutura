from django.core.management.base import BaseCommand
from track_accounts.models import TrackSource, UnifiedRunFolder
from workflow.models import ScrapingRun
from facebook_data.models import Folder as FacebookFolder
from instagram_data.models import Folder as InstagramFolder
from linkedin_data.models import Folder as LinkedInFolder
from tiktok_data.models import Folder as TikTokFolder
from users.models import Project

class Command(BaseCommand):
    help = 'Check data storage folders for Test Project for Hierarchical Folders'

    def handle(self, *args, **options):
        self.stdout.write("=== Checking Data Storage for 'Test Project for Hierarchical Folders' ===\n")
        
        # Find the test project
        test_project = Project.objects.filter(name__icontains="Test Project for Hierarchical Folders").first()
        if not test_project:
            self.stdout.write(self.style.ERROR("❌ Test Project not found!"))
            return
        
        self.stdout.write(f"✅ Found Test Project: {test_project.name} (ID: {test_project.id})")
        
        # Check TrackSources for this project
        track_sources = TrackSource.objects.filter(project=test_project)
        self.stdout.write(f"\n📊 TrackSources in Test Project: {track_sources.count()}")
        for ts in track_sources:
            self.stdout.write(f"  - {ts.platform} - {ts.service_name} - {ts.url}")
        
        # Check ScrapingRuns for this project
        scraping_runs = ScrapingRun.objects.filter(project=test_project)
        self.stdout.write(f"\n🔄 ScrapingRuns for Test Project: {scraping_runs.count()}")
        for run in scraping_runs:
            self.stdout.write(f"  - Run ID: {run.id}, Created: {run.created_at}")
        
        # Check UnifiedRunFolders
        unified_run_folders = UnifiedRunFolder.objects.filter(scraping_run__project=test_project)
        self.stdout.write(f"\n📁 UnifiedRunFolders: {unified_run_folders.count()}")
        for folder in unified_run_folders:
            self.stdout.write(f"  - Folder ID: {folder.id}, Run ID: {folder.scraping_run.id}, Name: {folder.name}")
        
        # Check platform-specific folders
        facebook_folders = FacebookFolder.objects.filter(scraping_run__project=test_project)
        instagram_folders = InstagramFolder.objects.filter(scraping_run__project=test_project)
        linkedin_folders = LinkedInFolder.objects.filter(scraping_run__project=test_project)
        tiktok_folders = TikTokFolder.objects.filter(scraping_run__project=test_project)
        
        self.stdout.write(f"\n📂 Platform-Specific Folders:")
        self.stdout.write(f"  - Facebook Folders: {facebook_folders.count()}")
        self.stdout.write(f"  - Instagram Folders: {instagram_folders.count()}")
        self.stdout.write(f"  - LinkedIn Folders: {linkedin_folders.count()}")
        self.stdout.write(f"  - TikTok Folders: {tiktok_folders.count()}")
        
        total_platform_folders = facebook_folders.count() + instagram_folders.count() + linkedin_folders.count() + tiktok_folders.count()
        self.stdout.write(f"\n📈 Total Platform Folders: {total_platform_folders}")
        
        # Check folder types
        self.stdout.write(f"\n🏷️ Folder Types:")
        for folder in facebook_folders:
            self.stdout.write(f"  - Facebook {folder.id}: {folder.folder_type}")
        for folder in instagram_folders:
            self.stdout.write(f"  - Instagram {folder.id}: {folder.folder_type}")
        for folder in linkedin_folders:
            self.stdout.write(f"  - LinkedIn {folder.id}: {folder.folder_type}")
        for folder in tiktok_folders:
            self.stdout.write(f"  - TikTok {folder.id}: {folder.folder_type}")
        
        self.stdout.write(f"\n=== Summary ===")
        self.stdout.write(f"✅ Test Project: {test_project.name}")
        self.stdout.write(f"📊 TrackSources: {track_sources.count()}")
        self.stdout.write(f"🔄 ScrapingRuns: {scraping_runs.count()}")
        self.stdout.write(f"📁 UnifiedRunFolders: {unified_run_folders.count()}")
        self.stdout.write(f"📂 Total Platform Folders: {total_platform_folders}") 
#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from track_accounts.models import UnifiedRunFolder
from workflow.models import ScrapingRun
from facebook_data.models import Folder as FacebookFolder
from instagram_data.models import Folder as InstagramFolder
from linkedin_data.models import Folder as LinkedInFolder
from tiktok_data.models import Folder as TikTokFolder

print("=== Current Folder Structure Analysis ===")

# Check UnifiedRunFolder
print(f"\nUnifiedRunFolder count: {UnifiedRunFolder.objects.count()}")
if UnifiedRunFolder.objects.exists():
    print("Sample UnifiedRunFolder entries:")
    for folder in UnifiedRunFolder.objects.all()[:3]:
        print(f"  ID: {folder.id}, Name: '{folder.name}', Type: {folder.folder_type}, ScrapingRun: {folder.scraping_run_id}, Parent: {folder.parent_folder_id}")

# Check ScrapingRun
print(f"\nScrapingRun count: {ScrapingRun.objects.count()}")
if ScrapingRun.objects.exists():
    print("Sample ScrapingRun entries:")
    for run in ScrapingRun.objects.all()[:3]:
        print(f"  ID: {run.id}, Status: {run.status}, Created: {run.created_at}")

# Check platform folders
platforms = [
    ('Facebook', FacebookFolder),
    ('Instagram', InstagramFolder),
    ('LinkedIn', LinkedInFolder),
    ('TikTok', TikTokFolder)
]

for platform_name, folder_model in platforms:
    print(f"\n{platform_name} folders: {folder_model.objects.count()}")
    if folder_model.objects.exists():
        print(f"Sample {platform_name} folder entries:")
        for folder in folder_model.objects.all()[:3]:
            print(f"  ID: {folder.id}, Name: '{folder.name}', Type: {folder.folder_type}, ScrapingRun: {folder.scraping_run_id}, Parent: {folder.parent_folder_id}")

# Check if folders are properly linked to ScrapingRun
print(f"\n=== Hierarchical Structure Check ===")
unified_folders = UnifiedRunFolder.objects.filter(folder_type='run')
print(f"UnifiedRunFolder with type='run': {unified_folders.count()}")

for unified_folder in unified_folders[:3]:
    print(f"\nUnifiedRunFolder: {unified_folder.name} (ID: {unified_folder.id})")
    if unified_folder.scraping_run_id:
        # Find service folders for this scraping run
        service_folders = []
        for platform_name, folder_model in platforms:
            platform_service_folders = folder_model.objects.filter(
                folder_type='service',
                scraping_run_id=unified_folder.scraping_run_id
            )
            service_folders.extend(platform_service_folders)
            print(f"  {platform_name} service folders: {platform_service_folders.count()}")
        
        print(f"  Total service folders for this run: {len(service_folders)}")
    else:
        print("  No ScrapingRun associated!")

print(f"\n=== Issue Analysis ===")
print("The problem appears to be that:")
print("1. We have UnifiedRunFolder entries but they may not be properly linked to ScrapingRun")
print("2. Service folders exist but may not be properly associated with UnifiedRunFolder")
print("3. The automatic folder creation during scraping run scheduling may not be working") 
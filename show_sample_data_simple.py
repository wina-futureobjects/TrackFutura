#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from brightdata_integration.models import ScraperRequest, BatchScraperJob
from workflow.models import ScrapingJob, ScrapingRun
from track_accounts.models import UnifiedRunFolder

print("=" * 60)
print("SAMPLE SCRAPER REQUEST AND RELATIONSHIPS")
print("=" * 60)

# Get the ScraperRequest with ID 26
sr = ScraperRequest.objects.get(id=26)

print("=== SAMPLE SCRAPER REQUEST ===")
print(f"ID: {sr.id}")
print(f"Status: {sr.status}")
print(f"Platform: {sr.platform}")
print(f"Target URL: {sr.target_url}")
print(f"Created: {sr.created_at}")
print(f"Completed: {sr.completed_at}")
print(f"Batch Job: {sr.batch_job.name if sr.batch_job else None}")
print(f"Folder ID: {sr.folder_id}")

print("\n--- RELATED BATCHSCRAPERJOB ---")
if sr.batch_job:
    print(f"Batch Job ID: {sr.batch_job.id}")
    print(f"Name: {sr.batch_job.name}")
    print(f"Status: {sr.batch_job.status}")
    print(f"Platforms: {sr.batch_job.platforms_to_scrape}")
    print(f"Content Types: {sr.batch_job.content_types_to_scrape}")
else:
    print("No BatchScraperJob associated")

print("\n--- RELATED SCRAPINGJOBS ---")
if sr.batch_job:
    jobs = ScrapingJob.objects.filter(batch_job=sr.batch_job)
    print(f"Found {jobs.count()} ScrapingJobs")
    for job in jobs[:3]:  # Show first 3
        print(f"  Job ID: {job.id}")
        print(f"    Status: {job.status}")
        print(f"    Run ID: {job.scraping_run.id if job.scraping_run else 'None'}")
        print(f"    Created: {job.created_at}")
        print(f"    Completed: {job.completed_at}")
        print()
else:
    print("No ScrapingJobs found (no batch job)")

print("\n--- RELATED SCRAPINGRUNS ---")
if sr.batch_job:
    runs = ScrapingRun.objects.filter(scraping_jobs__batch_job=sr.batch_job).distinct()
    print(f"Found {runs.count()} ScrapingRuns")
    for run in runs:
        print(f"  Run ID: {run.id}")
        print(f"    Status: {run.status}")
        print(f"    Created: {run.created_at}")
        print(f"    Completed: {run.completed_at}")
        print(f"    Project: {run.project.name if run.project else 'None'}")
        print()
else:
    print("No ScrapingRuns found (no batch job)")

print("\n--- RELATED UNIFIEDRUNFOLDER ---")
if sr.folder_id:
    try:
        folder = UnifiedRunFolder.objects.get(id=sr.folder_id)
        print(f"Folder ID: {folder.id}")
        print(f"Name: {folder.name}")
        print(f"Type: {folder.folder_type}")
        print(f"Parent: {folder.parent.name if folder.parent else 'None'}")
        print(f"Created: {folder.created_at}")
    except UnifiedRunFolder.DoesNotExist:
        print("Folder not found")
else:
    print("No folder ID associated")

print("\n" + "=" * 60)
print("EXAMPLE: SCRAPINGJOB + SCRAPINGRUN RECORDS")
print("BEFORE AND AFTER WEBHOOK")
print("=" * 60)

# Show a sample ScrapingJob and its run
sample_job = ScrapingJob.objects.first()
if sample_job:
    print(f"Sample ScrapingJob ID: {sample_job.id}")
    print(f"Status: {sample_job.status}")
    print(f"Created: {sample_job.created_at}")
    print(f"Completed: {sample_job.completed_at}")
    
    if sample_job.scraping_run:
        run = sample_job.scraping_run
        print(f"\nAssociated ScrapingRun ID: {run.id}")
        print(f"Status: {run.status}")
        print(f"Created: {run.created_at}")
        print(f"Completed: {run.completed_at}")
        
        # Show all jobs in this run
        all_jobs_in_run = run.scraping_jobs.all()
        print(f"\nAll jobs in this run: {all_jobs_in_run.count()}")
        for job in all_jobs_in_run:
            print(f"  Job {job.id}: {job.status}")
else:
    print("No ScrapingJob found")

print("\n" + "=" * 60)
print("STATUS SUMMARY")
print("=" * 60)

# Count by status
print("ScraperRequest statuses:")
for status in ['pending', 'processing', 'completed', 'failed']:
    count = ScraperRequest.objects.filter(status=status).count()
    print(f"  {status}: {count}")

print("\nBatchScraperJob statuses:")
for status in ['pending', 'processing', 'completed', 'failed']:
    count = BatchScraperJob.objects.filter(status=status).count()
    print(f"  {status}: {count}")

print("\nScrapingJob statuses:")
for status in ['pending', 'processing', 'completed', 'failed']:
    count = ScrapingJob.objects.filter(status=status).count()
    print(f"  {status}: {count}")

print("\nScrapingRun statuses:")
for status in ['pending', 'processing', 'completed', 'failed']:
    count = ScrapingRun.objects.filter(status=status).count()
    print(f"  {status}: {count}")

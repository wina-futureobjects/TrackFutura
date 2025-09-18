#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from brightdata_integration.models import BatchScraperJob, ScraperRequest
from workflow.models import ScrapingRun, ScrapingJob

print("=== FACEBOOK JOBS ANALYSIS ===")
print()

# Check Facebook BatchScraperJobs
facebook_jobs = BatchScraperJob.objects.filter(platform__icontains='facebook')
print(f"Total Facebook BatchScraperJobs: {facebook_jobs.count()}")

for job in facebook_jobs:
    print(f"ID: {job.id}, Status: {job.status}, Platform: {job.platform}")
    print(f"  - Start Date: {job.start_date}")
    print(f"  - End Date: {job.end_date}")
    print(f"  - Num of Posts: {job.num_of_posts}")
    print(f"  - Created: {job.created_at}")
    print()

# Check Facebook ScraperRequests
facebook_requests = ScraperRequest.objects.filter(platform__icontains='facebook')
print(f"Total Facebook ScraperRequests: {facebook_requests.count()}")

for req in facebook_requests:
    print(f"ID: {req.id}, Status: {req.status}, Platform: {req.platform}")
    print(f"  - URL: {req.target_url}")
    print(f"  - Start Date: {req.start_date}")
    print(f"  - End Date: {req.end_date}")
    print(f"  - Num of Posts: {req.num_of_posts}")
    print(f"  - Created: {req.created_at}")
    print()

# Check recent ScrapingRuns for Facebook
print("=== RECENT SCRAPING RUNS ===")
recent_runs = ScrapingRun.objects.order_by('-created_at')[:5]
for run in recent_runs:
    print(f"Run ID: {run.id}, Status: {run.status}, Created: {run.created_at}")
    jobs = ScrapingJob.objects.filter(run=run)
    print(f"  - Total Jobs: {jobs.count()}")
    facebook_run_jobs = jobs.filter(platform__icontains='facebook')
    print(f"  - Facebook Jobs: {facebook_run_jobs.count()}")
    for job in facebook_run_jobs:
        print(f"    * Job {job.id}: {job.platform} - {job.status}")
    print()

print("=== LATEST FAILED JOBS ===")
failed_jobs = BatchScraperJob.objects.filter(status='failed').order_by('-created_at')[:5]
for job in failed_jobs:
    print(f"Failed Job ID: {job.id}, Platform: {job.platform}, Status: {job.status}")
    print(f"  - Error: {getattr(job, 'error_message', 'No error message')}")
    print()

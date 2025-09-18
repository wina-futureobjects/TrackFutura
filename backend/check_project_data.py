#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyJob, ScrapyResult, ScrapyConfig
from users.models import Project

def check_project_data():
    """Check what data is available for project 8"""

    project_id = 8
    print(f"Checking data for project {project_id}...")

    # Check if project exists
    try:
        project = Project.objects.get(id=project_id)
        print(f"SUCCESS: Project found: {project.name}")
    except Project.DoesNotExist:
        print("ERROR: Project does not exist")
        return

    # Check ScrapyJobs
    scrapy_jobs = ScrapyJob.objects.filter(project_id=project_id)
    print(f"JOBS: ScrapyJobs for project {project_id}: {scrapy_jobs.count()}")

    for job in scrapy_jobs[:5]:  # Show first 5 jobs
        print(f"  - Job: {job.name} | Status: {job.status} | Platform: {job.config.platform if job.config else 'N/A'}")

    # Check ScrapyResults
    scrapy_results = ScrapyResult.objects.filter(job__project_id=project_id, success=True)
    print(f"RESULTS: Successful ScrapyResults for project {project_id}: {scrapy_results.count()}")

    # Check platform breakdown
    platforms = {}
    for result in scrapy_results:
        if result.job and result.job.config:
            platform = result.job.config.platform
            if platform not in platforms:
                platforms[platform] = 0
            platforms[platform] += 1

    print("PLATFORMS: Platform breakdown:")
    for platform, count in platforms.items():
        print(f"  - {platform}: {count} results")

    # Sample some data
    sample_results = scrapy_results[:3]
    print(f"\nSAMPLE: Sample data from first 3 results:")
    for i, result in enumerate(sample_results, 1):
        print(f"Result {i}:")
        print(f"  Platform: {result.job.config.platform if result.job.config else 'N/A'}")
        print(f"  Source: {result.source_name}")
        print(f"  URL: {result.source_url}")
        if result.scraped_data:
            print(f"  Data keys: {list(result.scraped_data.keys()) if isinstance(result.scraped_data, dict) else 'Not dict'}")
        print("")

if __name__ == '__main__':
    check_project_data()
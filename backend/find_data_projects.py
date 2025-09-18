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

from scrapy_integration.models import ScrapyJob, ScrapyResult
from users.models import Project

def find_data_projects():
    """Find which projects have data"""

    print("Finding projects with data...")

    # Check all projects
    projects = Project.objects.all()
    print(f"Total projects: {projects.count()}")

    for project in projects:
        jobs_count = ScrapyJob.objects.filter(project_id=project.id).count()
        results_count = ScrapyResult.objects.filter(job__project_id=project.id, success=True).count()

        if jobs_count > 0 or results_count > 0:
            print(f"Project {project.id} ({project.name}): {jobs_count} jobs, {results_count} results")

    # Check if there are any jobs at all
    all_jobs = ScrapyJob.objects.all()
    print(f"\nTotal ScrapyJobs in database: {all_jobs.count()}")

    all_results = ScrapyResult.objects.filter(success=True)
    print(f"Total successful ScrapyResults: {all_results.count()}")

    if all_jobs.count() > 0:
        print("\nFirst few jobs:")
        for job in all_jobs[:5]:
            print(f"  - Project {job.project_id}: {job.name} | Status: {job.status}")

if __name__ == '__main__':
    find_data_projects()
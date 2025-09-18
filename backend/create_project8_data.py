#!/usr/bin/env python

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyConfig, ScrapyJob, ScrapyResult
from users.models import Project
from datetime import datetime, timedelta
from django.utils import timezone
import json

def create_project8_data():
    """Create sample Instagram scraping data for project 8"""

    # Get project 8
    try:
        project = Project.objects.get(id=8)
        print(f'Found project: {project.name}')
    except:
        print('Project 8 not found')
        return

    # Create Instagram config if it doesn't exist
    config, created = ScrapyConfig.objects.get_or_create(
        platform='instagram',
        content_type='posts',
        defaults={
            'name': 'Instagram Posts Scraper',
            'description': 'Configuration for scraping Instagram posts',
            'is_active': True,
            'delay_range': '2-5',
            'user_agent_rotation': True,
            'use_proxy': True,
            'headless': True,
            'viewport_width': 1920,
            'viewport_height': 1080
        }
    )
    print(f'Instagram config created/found: {config.id}')

    # Create sample Instagram scraping jobs
    instagram_jobs_data = [
        {
            'name': 'Nike Brand Campaign Analysis',
            'target_urls': ['https://www.instagram.com/nike/', 'https://www.instagram.com/nikewomen/'],
            'source_names': ['Nike Official', 'Nike Women'],
            'num_of_posts': 25,
            'status': 'completed',
            'successful_scrapes': 20,
            'failed_scrapes': 5,
        },
        {
            'name': 'Fashion Influencer Study',
            'target_urls': ['https://www.instagram.com/fashion/', 'https://www.instagram.com/style/'],
            'source_names': ['Fashion Hub', 'Style Central'],
            'num_of_posts': 30,
            'status': 'completed',
            'successful_scrapes': 28,
            'failed_scrapes': 2,
        },
        {
            'name': 'Food Brand Analysis',
            'target_urls': ['https://www.instagram.com/foodnetwork/', 'https://www.instagram.com/tasty/'],
            'source_names': ['Food Network', 'Tasty'],
            'num_of_posts': 20,
            'status': 'running',
            'successful_scrapes': 15,
            'failed_scrapes': 0,
        }
    ]

    for job_data in instagram_jobs_data:
        # Create job
        job, created = ScrapyJob.objects.get_or_create(
            name=job_data['name'],
            project=project,
            defaults={
                'config': config,
                'target_urls': job_data['target_urls'],
                'source_names': job_data['source_names'],
                'num_of_posts': job_data['num_of_posts'],
                'status': job_data['status'],
                'total_urls': len(job_data['target_urls']),
                'processed_urls': len(job_data['target_urls']) if job_data['status'] == 'completed' else 1,
                'successful_scrapes': job_data['successful_scrapes'],
                'failed_scrapes': job_data['failed_scrapes'],
                'created_at': timezone.now() - timedelta(days=2),
                'started_at': timezone.now() - timedelta(days=2, hours=1),
                'completed_at': timezone.now() - timedelta(hours=3) if job_data['status'] == 'completed' else None,
                'auto_create_folders': True,
            }
        )

        if created:
            print(f'Created Instagram job: {job.name} (Status: {job.status})')

            # Create sample results for completed jobs
            if job_data['status'] == 'completed' and job_data['successful_scrapes'] > 0:
                for i in range(min(job_data['successful_scrapes'], 10)):  # Create up to 10 sample results
                    result_data = {
                        'post_url': f'https://www.instagram.com/p/ABC{i}XYZ{job.id}/',
                        'caption': f'Amazing content from {job_data["source_names"][i % len(job_data["source_names"])]}! Check out this awesome post #instagram #content #socialmedia',
                        'likes': 1500 + (i * 250) + (job.id * 100),
                        'comments_count': 45 + (i * 8),
                        'shares': 12 + (i * 3),
                        'views': 8500 + (i * 1200),
                        'media_type': 'photo' if i % 3 != 0 else 'video',
                        'username': job_data['source_names'][i % len(job_data['source_names'])].lower().replace(' ', ''),
                        'user_full_name': job_data['source_names'][i % len(job_data['source_names'])],
                        'timestamp': (timezone.now() - timedelta(days=(i % 10))).isoformat(),
                        'hashtags': ['instagram', 'content', 'socialmedia', 'brand', 'marketing', 'lifestyle'],
                        'mentions': ['@instagram', '@socialmedia'],
                        'images': [f'https://example.com/image_{job.id}_{i}.jpg'],
                        'videos': [f'https://example.com/video_{job.id}_{i}.mp4'] if i % 3 == 0 else [],
                        'comments': [
                            {
                                'username': f'user{i + 1}',
                                'user_full_name': f'User {i + 1}',
                                'text': 'Amazing post! This is exactly what I was looking for.',
                                'likes': 25 + (i % 50),
                                'timestamp': (timezone.now() - timedelta(hours=(i % 24))).isoformat(),
                            },
                            {
                                'username': f'fan{i + 2}',
                                'user_full_name': f'Fan {i + 2}',
                                'text': 'Love this content! Keep it up.',
                                'likes': 15 + (i % 30),
                                'timestamp': (timezone.now() - timedelta(hours=(i % 12))).isoformat(),
                            }
                        ]
                    }

                    ScrapyResult.objects.get_or_create(
                        job=job,
                        source_url=job_data['target_urls'][i % len(job_data['target_urls'])],
                        defaults={
                            'source_name': job_data['source_names'][i % len(job_data['source_names'])],
                            'scraped_data': result_data,
                            'success': True,
                            'scrape_timestamp': timezone.now() - timedelta(hours=(i % 48))
                        }
                    )

        else:
            print(f'Job already exists: {job.name}')

    print('\nSUCCESS: Instagram scraping data setup complete for project 8!')
    print(f'Total Instagram jobs: {ScrapyJob.objects.filter(project_id=8).count()}')
    print(f'Total Instagram results: {ScrapyResult.objects.filter(job__project_id=8).count()}')

if __name__ == '__main__':
    create_project8_data()
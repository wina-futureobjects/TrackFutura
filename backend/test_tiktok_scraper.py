#!/usr/bin/env python
"""
Test script for the TikTok scraper integration
"""

import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyConfig, ScrapyJob
from scrapy_integration.services import SocialMediaScrapingService
from users.models import Project, User


def test_tiktok_scraper():
    """Test TikTok scraper functionality"""
    
    print("Testing TikTok Scraper...")
    print("=" * 50)
    
    try:
        # Get or create a test user and project
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com', 'is_active': True}
        )
        
        project, created = Project.objects.get_or_create(
            name='Test Project',
            defaults={
                'description': 'Test project for TikTok scraping',
                'owner': user
            }
        )
        
        if created:
            project.authorized_users.add(user)
        
        # Create TikTok configuration
        tiktok_config, created = ScrapyConfig.objects.get_or_create(
            platform='tiktok',
            content_type='posts',
            defaults={
                'name': 'TikTok Posts Config',
                'description': 'Configuration for scraping TikTok videos',
                'delay_range': '4-7',  # Longer delays for TikTok
                'user_agent_rotation': True,
                'headless': True,
            }
        )
        
        print(f"TikTok config: {tiktok_config}")
        
        # Create a test scraping job
        service = SocialMediaScrapingService()
        
        # Test with a well-known TikTok account
        job = service.create_scraping_job(
            name='Test TikTok Posts Scraper',
            project_id=project.id,
            platform='tiktok',
            content_type='posts',
            target_urls=[
                'https://www.tiktok.com/@tiktok',  # TikTok's official account
            ],
            source_names=['TikTok Official'],
            num_of_posts=5  # Just 5 videos for testing
        )
        
        print(f"Created TikTok scraping job: {job}")
        
        # Test job status
        status = service.get_job_status(job.id)
        print(f"Job Status: {status}")
        
        print(f"\nTikTok scraper setup successful!")
        print(f"Created test job with ID: {job.id}")
        print(f"Job status: {job.status}")
        print(f"Platform: {job.config.platform}")
        print(f"Content type: {job.config.content_type}")
        print(f"Target URLs: {len(job.target_urls)}")
        print(f"URLs: {job.target_urls}")
        
        print(f"\nTo test scraping, run:")
        print(f"service.start_scraping_job({job.id})")
        
        print(f"\nView jobs in admin at: http://localhost:8000/admin/scrapy_integration/scrapyjob/")
        print(f"Frontend integration coming soon!")
        
        return job
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    test_tiktok_scraper()
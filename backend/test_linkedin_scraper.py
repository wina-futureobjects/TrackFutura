#!/usr/bin/env python
"""
Test script for the LinkedIn scraper integration
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


def test_linkedin_scraper():
    """Test LinkedIn scraper functionality"""
    
    print("Testing LinkedIn Scraper...")
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
                'description': 'Test project for LinkedIn scraping',
                'owner': user
            }
        )
        
        if created:
            project.authorized_users.add(user)
        
        # Create LinkedIn configuration
        linkedin_config, created = ScrapyConfig.objects.get_or_create(
            platform='linkedin',
            content_type='posts',
            defaults={
                'name': 'LinkedIn Posts Config',
                'description': 'Configuration for scraping LinkedIn posts',
                'delay_range': '3-6',  # Moderate delays for LinkedIn
                'user_agent_rotation': True,
                'headless': True,
            }
        )
        
        print(f"LinkedIn config: {linkedin_config}")
        
        # Create a test scraping job
        service = SocialMediaScrapingService()
        
        # Test with well-known LinkedIn company pages
        job = service.create_scraping_job(
            name='Test LinkedIn Posts Scraper',
            project_id=project.id,
            platform='linkedin',
            content_type='posts',
            target_urls=[
                'https://www.linkedin.com/company/linkedin/',  # LinkedIn's official company page
            ],
            source_names=['LinkedIn Official'],
            num_of_posts=5  # Just 5 posts for testing
        )
        
        print(f"Created LinkedIn scraping job: {job}")
        
        # Test job status
        status = service.get_job_status(job.id)
        print(f"Job Status: {status}")
        
        print(f"\nLinkedIn scraper setup successful!")
        print(f"Created test job with ID: {job.id}")
        print(f"Job status: {job.status}")
        print(f"Platform: {job.config.platform}")
        print(f"Content type: {job.config.content_type}")
        print(f"Target URLs: {len(job.target_urls)}")
        print(f"URLs: {job.target_urls}")
        
        print(f"\nTo test scraping, run:")
        print(f"service.start_scraping_job({job.id})")
        
        print(f"\nNote: LinkedIn has strict anti-bot measures.")
        print(f"You may need to be logged in or use different URLs for best results.")
        
        print(f"\nView jobs in admin at: http://localhost:8000/admin/scrapy_integration/scrapyjob/")
        print(f"Frontend integration coming soon!")
        
        return job
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == '__main__':
    test_linkedin_scraper()
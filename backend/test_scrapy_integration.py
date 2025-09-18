#!/usr/bin/env python
"""
Test script for the new Scrapy integration
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


def create_test_data():
    """Create test configuration and job"""
    
    print("Creating test data...")
    
    # Get or create a test user and project
    user, created = User.objects.get_or_create(
        username='test_user',
        defaults={'email': 'test@example.com', 'is_active': True}
    )
    
    project, created = Project.objects.get_or_create(
        name='Test Project',
        defaults={
            'description': 'Test project for Scrapy integration',
            'owner': user
        }
    )
    
    if created:
        project.authorized_users.add(user)
    
    # Create Facebook configuration
    fb_config, created = ScrapyConfig.objects.get_or_create(
        platform='facebook',
        content_type='posts',
        defaults={
            'name': 'Facebook Posts Config',
            'description': 'Configuration for scraping Facebook posts',
            'delay_range': '2-4',
            'user_agent_rotation': True,
            'headless': True,
        }
    )
    
    print(f"Created Facebook config: {fb_config}")
    
    # Create a test scraping job
    service = SocialMediaScrapingService()
    
    job = service.create_scraping_job(
        name='Test Facebook Scraping Job',
        project_id=project.id,
        platform='facebook',
        content_type='posts',
        target_urls=[
            'https://www.facebook.com/facebook',  # Facebook's official page
            'https://www.facebook.com/microsoft'   # Microsoft's page
        ],
        source_names=['Facebook Official', 'Microsoft'],
        num_of_posts=5
    )
    
    print(f"Created test job: {job}")
    return job


def test_job_creation():
    """Test job creation and status"""
    
    print("\n=== Testing Job Creation ===")
    
    job = create_test_data()
    
    # Test job status
    service = SocialMediaScrapingService()
    status = service.get_job_status(job.id)
    
    print(f"Job Status: {status}")
    
    return job


def main():
    """Main test function"""
    
    print("Testing Scrapy Integration Setup...")
    print("=" * 50)
    
    try:
        # Test basic model creation
        job = test_job_creation()
        
        print(f"\nScrapy integration setup successful!")
        print(f"Created test job with ID: {job.id}")
        print(f"Job status: {job.status}")
        print(f"Platform: {job.config.platform}")
        print(f"Target URLs: {len(job.target_urls)}")
        
        print(f"\nTo start scraping, use:")
        print(f"service.start_scraping_job({job.id})")
        
        print(f"\nView in admin at: http://localhost:8000/admin/scrapy_integration/")
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
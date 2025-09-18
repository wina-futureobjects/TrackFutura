#!/usr/bin/env python
"""
Direct test of Instagram scraper with malaysiakini URL
"""
import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

from scrapy_integration.services import SocialMediaScrapingService

def test_instagram_scraper():
    """Test Instagram scraper directly"""
    
    service = SocialMediaScrapingService()
    
    try:
        # Create a job
        job = service.create_scraping_job(
            name="Test Malaysiakini Instagram",
            project_id=10,
            platform="instagram", 
            content_type="posts",
            target_urls=["https://www.instagram.com/malaysiakini/"],
            source_names=["Malaysiakini"],
            num_of_posts=5
        )
        
        job_id = job.id
        print(f"Created job with ID: {job_id}")
        
        # Start the job
        success = service.start_scraping_job(job_id)
        print(f"Job started: {success}")
        
        if success:
            # Check status
            import time
            time.sleep(10)  # Wait 10 seconds
            
            status = service.get_job_status(job_id)
            print(f"Job status: {status}")
            
        return job_id
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("Testing Instagram scraper with malaysiakini URL...")
    test_instagram_scraper()
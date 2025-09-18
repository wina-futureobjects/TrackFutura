#!/usr/bin/env python3
"""
Test script for Apify TikTok scraper integration
"""

import os
import sys
import django
import asyncio

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apify_integration.services import ApifyScrapingService


async def test_tiktok_scraper():
    """Test TikTok scraping with Apify"""
    
    print("Testing Apify TikTok Scraper")
    print("=" * 50)
    
    try:
        service = ApifyScrapingService()
        
        # Create test job
        print("Creating test scraping job...")
        job = await service.create_scraping_job(
            name="Test TikTok Scrape - @nasa",
            project_id=9,  # Use default project ID
            platform="tiktok",
            content_type="posts",
            target_urls=["https://www.tiktok.com/@nasa"],
            source_names=["NASA"],
            num_of_posts=5,
            auto_create_folders=True
        )
        
        print(f"Created job: {job.id} - {job.name}")
        print(f"   Status: {job.status}")
        print(f"   Platform: {job.config.platform}")
        print(f"   URLs: {job.target_urls}")
        
        # Start the job
        print("\nStarting scraping job...")
        success = await service.start_scraping_job(job.id)
        
        if success:
            print("Job started successfully!")
            
            # Monitor progress
            print("\nMonitoring job progress...")
            for i in range(30):  # Check for up to 5 minutes
                status_data = await service.get_job_status(job.id)
                
                print(f"   Step {i+1}: Status = {status_data['status']}, Progress = {status_data['progress']['percentage']}%")
                
                if status_data['status'] in ['completed', 'failed', 'cancelled']:
                    break
                    
                await asyncio.sleep(10)  # Wait 10 seconds
            
            # Get final status
            final_status = await service.get_job_status(job.id)
            print(f"\nFinal Status: {final_status}")
            
            if final_status['status'] == 'completed':
                print("\nScraping completed successfully!")
                print("Check the results in the database or through the API")
            else:
                print(f"\nJob ended with status: {final_status['status']}")
                if final_status.get('error_log'):
                    print(f"   Error: {final_status['error_log']}")
        else:
            print("Failed to start job")
            
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_tiktok_scraper())
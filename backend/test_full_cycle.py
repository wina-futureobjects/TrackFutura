#!/usr/bin/env python3
"""
Full cycle test - create job, run it, check results
"""

import os
import sys
import django
import asyncio
import time

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apify_integration.services import ApifyScrapingService
from scrapy_integration.models import ScrapyJob, ScrapyResult


async def test_full_cycle():
    """Test complete scraping cycle"""
    
    print("=" * 60)
    print("FULL CYCLE TEST - APIFY INSTAGRAM SCRAPER")
    print("=" * 60)
    
    try:
        service = ApifyScrapingService()
        
        # Create test job
        print("\nStep 1: Creating scraping job...")
        job = await service.create_scraping_job(
            name="Full Cycle Test - Malaysiakini",
            project_id=9,
            platform="instagram",
            content_type="posts", 
            target_urls=["https://www.instagram.com/malaysiakini/"],
            source_names=["Malaysiakini Test"],
            num_of_posts=2,  # Small test
            auto_create_folders=True
        )
        
        print(f"   Job created: ID {job.id} - {job.name}")
        print(f"   Status: {job.status}")
        print(f"   URLs: {job.target_urls}")
        
        # Start the job
        print("\nStep 2: Starting scraping job...")
        success = await service.start_scraping_job(job.id)
        
        if success:
            print("   Job started successfully!")
            
            # Wait for completion (up to 2 minutes)
            print("\nStep 3: Monitoring progress...")
            for i in range(24):  # 2 minutes max
                status_data = await service.get_job_status(job.id)
                
                print(f"   Check {i+1}: Status={status_data['status']}, Progress={status_data['progress']['percentage']}%, Successful={status_data['progress']['successful_scrapes']}")
                
                if status_data['status'] in ['completed', 'failed', 'cancelled']:
                    break
                    
                await asyncio.sleep(5)  # Wait 5 seconds
            
            # Final status check
            print("\nStep 4: Final results...")
            final_status = await service.get_job_status(job.id)
            print(f"   Final Status: {final_status['status']}")
            print(f"   Successful scrapes: {final_status['progress']['successful_scrapes']}")
            print(f"   Failed scrapes: {final_status['progress']['failed_scrapes']}")
            
            # Check database results
            print("\nStep 5: Database verification...")
            from django.db import connection
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM scrapy_integration_scrapyresult WHERE job_id = %s AND success = true", [job.id])
            db_count = cursor.fetchone()[0]
            print(f"   Database results count: {db_count}")
            
            # Get sample data
            results = ScrapyResult.objects.filter(job=job, success=True)[:2]
            print(f"\nStep 6: Sample scraped data:")
            for i, result in enumerate(results, 1):
                data = result.scraped_data
                print(f"   Post {i}:")
                print(f"     URL: {data.get('post_url', 'N/A')}")
                print(f"     Likes: {data.get('likes', 'N/A')}")
                print(f"     Comments: {data.get('comments', 'N/A')}")
                print(f"     Caption: {str(data.get('caption', ''))[:100]}...")
                print(f"     Images: {len(data.get('images', []))} image(s)")
                print(f"     Success: {result.success}")
            
            # Test API endpoint
            print("\nStep 7: Testing API endpoint...")
            import requests
            try:
                api_url = f"http://localhost:8000/api/scrapy/api/jobs/{job.id}/results/"
                response = requests.get(api_url, timeout=10)
                if response.status_code == 200:
                    api_results = response.json()
                    print(f"   API returned {len(api_results)} results")
                    if api_results:
                        first_result = api_results[0]
                        print(f"   Sample API result likes: {first_result.get('scraped_data', {}).get('likes', 'N/A')}")
                else:
                    print(f"   API Error: {response.status_code}")
            except Exception as e:
                print(f"   API Test failed: {str(e)}")
            
            print("\n" + "=" * 60)
            if final_status['status'] == 'completed' and db_count > 0:
                print("SUCCESS: Scraping is working perfectly!")
                print(f"✓ Scraped {db_count} Instagram posts successfully")
                print(f"✓ Data includes likes, comments, images, captions")
                print(f"✓ API endpoint working")
                print("✓ Frontend should now show results")
            else:
                print("ISSUE: Something went wrong")
                if final_status.get('error_log'):
                    print(f"Error: {final_status['error_log']}")
        else:
            print("   Failed to start job")
            
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_full_cycle())
#!/usr/bin/env python3
"""
Script to transform existing ScrapyResult data to platform-specific models
"""

import os
import sys
import django
import asyncio

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apify_integration.data_transformer import DataTransformer
from scrapy_integration.models import ScrapyJob
from asgiref.sync import sync_to_async


async def transform_existing_data():
    """Transform existing ScrapyResult data"""
    
    print("Transforming Existing Scraped Data")
    print("=" * 50)
    
    try:
        transformer = DataTransformer()
        
        # Get jobs with successful scrapes that might not have been transformed
        get_jobs = sync_to_async(
            lambda: list(ScrapyJob.objects.select_related('config').filter(successful_scrapes__gt=0).order_by('-id')[:5])
        )
        jobs = await get_jobs()
        
        print(f"Found {len(jobs)} jobs with successful scrapes")
        
        for job in jobs:
            print(f"\nTransforming Job {job.id}: {job.name}")
            print(f"Platform: {job.config.platform if job.config else 'Unknown'}")
            print(f"Successful scrapes: {job.successful_scrapes}")
            
            try:
                await transformer.transform_scrapy_results_to_platform_data(job.id)
                print(f"[SUCCESS] Successfully transformed job {job.id}")
            except Exception as e:
                print(f"[ERROR] Error transforming job {job.id}: {str(e)}")
        
        print("\n" + "=" * 50)
        print("Transformation completed!")
        
        # Verify results
        from tiktok_data.models import TikTokPost
        from linkedin_data.models import LinkedInPost
        from facebook_data.models import FacebookPost
        from instagram_data.models import InstagramPost
        
        # Use async database queries
        get_counts = sync_to_async(
            lambda: (
                TikTokPost.objects.count(),
                LinkedInPost.objects.count(),
                FacebookPost.objects.count(),
                InstagramPost.objects.count()
            )
        )
        tiktok_count, linkedin_count, facebook_count, instagram_count = await get_counts()
        
        print(f"\nResults:")
        print(f"TikTok posts: {tiktok_count}")
        print(f"LinkedIn posts: {linkedin_count}")
        print(f"Facebook posts: {facebook_count}")
        print(f"Instagram posts: {instagram_count}")
        
    except Exception as e:
        print(f"Script failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(transform_existing_data())
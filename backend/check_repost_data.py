#!/usr/bin/env python3
"""
Check what repost/share data is available in our scraped data
"""
import os
import sys
import django
import asyncio

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyResult
from asgiref.sync import sync_to_async

async def check_repost_data():
    """Check what repost/share-related fields exist in our data"""
    
    print("Checking Repost/Share Data Availability")
    print("=" * 50)
    
    # Check all platforms
    platforms = ['facebook', 'instagram', 'tiktok']
    
    for platform in platforms:
        print(f"\n=== {platform.upper()} ===")
        
        get_results = sync_to_async(lambda p=platform: list(ScrapyResult.objects.filter(
            job__config__platform=p
        ).order_by('-scrape_timestamp')[:2]))
        
        results = await get_results()
        
        if not results:
            print(f"No {platform} results found")
            continue
            
        for i, result in enumerate(results):
            print(f"\nResult {i+1}:")
            data = result.scraped_data
            
            # Check for repost/share-related fields
            share_fields = {}
            for key, value in data.items():
                key_lower = key.lower()
                if any(word in key_lower for word in ['share', 'repost', 'retweet', 'forward']):
                    share_fields[key] = value
                    
            print(f"Share/repost fields found: {share_fields}")
            
            # Check all fields to see what data we have
            all_fields = {}
            for key, value in data.items():
                if isinstance(value, (int, float)) and value >= 0:
                    all_fields[key] = value
                    
            print(f"All numeric fields: {all_fields}")
            break  # Just check first result
    
    return True

if __name__ == "__main__":
    success = asyncio.run(check_repost_data())
    if success:
        print("\nRepost data analysis completed!")
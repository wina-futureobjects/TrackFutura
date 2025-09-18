#!/usr/bin/env python3
"""
Test script to check actual data structures from scrapers
"""
import os
import sys
import django
import asyncio
import json
from datetime import datetime, timezone

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyResult
from asgiref.sync import sync_to_async

async def test_comment_data_structure():
    """Test what comment data structure we're getting from scrapers"""
    
    print("Testing Comment Data Structure from Scrapers")
    print("=" * 60)
    
    # Get recent results for each platform
    get_instagram_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='instagram'
    ).order_by('-scrape_timestamp')[:3]))
    
    get_facebook_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='facebook'
    ).order_by('-scrape_timestamp')[:3]))
    
    get_tiktok_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='tiktok'
    ).order_by('-scrape_timestamp')[:3]))
    
    platforms = [
        ('Instagram', await get_instagram_results()),
        ('Facebook', await get_facebook_results()),
        ('TikTok', await get_tiktok_results())
    ]
    
    for platform_name, results in platforms:
        print(f"\n{platform_name} Results:")
        print("-" * 40)
        
        if not results:
            print(f"No {platform_name} results found")
            continue
            
        for i, result in enumerate(results[:1]):  # Just check first result
            print(f"\nResult {i+1} Data Structure:")
            scraped_data = result.scraped_data
            
            if not scraped_data:
                print("No scraped data")
                continue
                
            # Check what fields are available
            print(f"Available keys: {list(scraped_data.keys())}")
            
            # Look for comment-related fields
            comment_fields = []
            for key in scraped_data.keys():
                if 'comment' in key.lower():
                    comment_fields.append(key)
            
            if comment_fields:
                print(f"Comment-related fields: {comment_fields}")
                
                for field in comment_fields:
                    value = scraped_data[field]
                    if isinstance(value, list) and value:
                        print(f"  {field}: {len(value)} items")
                        print(f"    Sample item keys: {list(value[0].keys()) if value and isinstance(value[0], dict) else 'Not a dict'}")
                        if isinstance(value[0], dict):
                            print(f"    Sample item: {json.dumps(value[0], indent=2)[:200]}...")
                    else:
                        print(f"  {field}: {value}")
            else:
                print("No comment-related fields found")
                
            # Show general structure
            print(f"Sample keys from data: {list(scraped_data.keys())[:10]}")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_comment_data_structure())
    if success:
        print("\nTest completed successfully!")
    else:
        print("\nTest failed!")
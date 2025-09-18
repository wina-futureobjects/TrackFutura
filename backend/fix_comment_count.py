#!/usr/bin/env python3
"""
URGENT: Fix comment count display by checking exact field names used
"""
import os
import sys
import django
import asyncio
import json

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyResult
from asgiref.sync import sync_to_async

async def check_comment_fields():
    """Check exactly what comment-related fields exist in our data"""
    
    print("URGENT: Checking Comment Count Fields")
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
            
            # Check ALL comment-related fields
            comment_fields = {}
            for key, value in data.items():
                key_lower = key.lower()
                if 'comment' in key_lower:
                    comment_fields[key] = value
                    
            print(f"Comment fields found: {comment_fields}")
            
            # Also check for any number fields that might be comments
            number_fields = {}
            for key, value in data.items():
                if isinstance(value, int) and value > 0:
                    number_fields[key] = value
                    
            print(f"All number fields: {number_fields}")
            break  # Just check first result
    
    return True

if __name__ == "__main__":
    success = asyncio.run(check_comment_fields())
    if success:
        print("\nComment field analysis completed!")
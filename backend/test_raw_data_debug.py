#!/usr/bin/env python3
"""
Debug script to check the raw Apify data structure for comment extraction issues
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

async def debug_raw_comment_data():
    """Debug what raw comment data structure we're getting"""
    
    print("Debugging Raw Comment Data from Apify Scrapers")
    print("=" * 70)
    
    # Get recent results for Facebook and TikTok
    get_facebook_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='facebook'
    ).order_by('-scrape_timestamp')[:2]))
    
    get_tiktok_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='tiktok'
    ).order_by('-scrape_timestamp')[:2]))
    
    get_instagram_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='instagram'
    ).order_by('-scrape_timestamp')[:1]))  # Working example
    
    print("\n=== INSTAGRAM (Working Example) ===")
    instagram_results = await get_instagram_results()
    if instagram_results:
        result = instagram_results[0]
        data = result.scraped_data
        print(f"Instagram data keys: {list(data.keys())}")
        if 'comments' in data:
            comments = data['comments']
            print(f"Comments type: {type(comments)}, length: {len(comments) if isinstance(comments, list) else 'N/A'}")
            if isinstance(comments, list) and comments:
                print(f"Sample comment structure: {json.dumps(comments[0], indent=2)}")
    else:
        print("No Instagram results found")
    
    print("\n=== FACEBOOK (Issue: comments array empty) ===")
    facebook_results = await get_facebook_results()
    if facebook_results:
        for i, result in enumerate(facebook_results):
            print(f"\nFacebook Result {i+1}:")
            data = result.scraped_data
            
            print(f"Data keys: {list(data.keys())}")
            print(f"comments_count: {data.get('comments_count', 'N/A')}")
            
            if 'comments' in data:
                comments = data['comments']
                print(f"Comments type: {type(comments)}, length: {len(comments) if isinstance(comments, list) else 'N/A'}")
                if isinstance(comments, list):
                    if comments:
                        print(f"Sample comment: {json.dumps(comments[0], indent=2)}")
                    else:
                        print("Comments array is empty!")
                        
                        # Let's check if there's any debug info we can find
                        # First let's see ALL keys to find where comments might be hiding
                        print("All available keys in Facebook data:")
                        for key in data.keys():
                            value = data[key]
                            if isinstance(value, (list, dict)) and key.lower() != 'comments':
                                print(f"  {key}: {type(value)} - {len(value) if isinstance(value, list) else 'dict'}")
            break  # Only check first result for detailed debug
    else:
        print("No Facebook results found")
    
    print("\n=== TIKTOK (Issue: comments_count=0) ===")
    tiktok_results = await get_tiktok_results()
    if tiktok_results:
        for i, result in enumerate(tiktok_results):
            print(f"\nTikTok Result {i+1}:")
            data = result.scraped_data
            
            print(f"Data keys: {list(data.keys())}")
            print(f"comments_count: {data.get('comments_count', 'N/A')}")
            print(f"views: {data.get('views', 'N/A')}")
            
            if 'comments' in data:
                comments = data['comments']
                print(f"Comments type: {type(comments)}, length: {len(comments) if isinstance(comments, list) else 'N/A'}")
            
            # Debug: Show all key-value pairs to see where comment data might be
            print("Sample of all data fields:")
            for key, value in list(data.items())[:15]:  # First 15 fields
                if isinstance(value, (str, int, float)):
                    print(f"  {key}: {value}")
                elif isinstance(value, list):
                    print(f"  {key}: list with {len(value)} items")
                elif isinstance(value, dict):
                    print(f"  {key}: dict with keys {list(value.keys())}")
            break  # Only check first result for detailed debug
    else:
        print("No TikTok results found")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(debug_raw_comment_data())
    if success:
        print("\n" + "="*70)
        print("Debug completed!")
        print("\nNext steps:")
        print("1. Check if Facebook scraper is actually getting comment data from Apify")
        print("2. Check if TikTok scraper configuration is working")
        print("3. Fix the data processing to handle actual comment structures")
    else:
        print("\nDebug failed!")
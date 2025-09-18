#!/usr/bin/env python3
"""
Debug script to show FULL raw data structure from Apify to find where comments might be hiding
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

def safe_print(obj, max_length=500):
    """Safely print objects with potential unicode issues"""
    try:
        s = str(obj)
        if len(s) > max_length:
            s = s[:max_length] + "..."
        # Replace problematic characters
        s = s.encode('ascii', 'replace').decode('ascii')
        print(s)
    except Exception as e:
        print(f"[Error printing object: {e}]")

async def debug_full_raw_structure():
    """Show the complete raw data structure to find hidden comment fields"""
    
    print("Full Raw Data Structure Analysis")
    print("=" * 60)
    
    # Focus on one Facebook result to see the complete structure
    get_facebook_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='facebook'
    ).order_by('-scrape_timestamp')[:1]))
    
    facebook_results = await get_facebook_results()
    
    if facebook_results:
        result = facebook_results[0]
        data = result.scraped_data
        
        print("FULL FACEBOOK DATA STRUCTURE:")
        print("-" * 40)
        
        for key in sorted(data.keys()):
            value = data[key]
            print(f"\n{key}: ({type(value).__name__})")
            
            if isinstance(value, str):
                safe_print(f"  '{value[:200]}{'...' if len(value) > 200 else ''}'")
            elif isinstance(value, (int, float, bool)):
                print(f"  {value}")
            elif isinstance(value, list):
                print(f"  List with {len(value)} items")
                if value:
                    print(f"  First item type: {type(value[0]).__name__}")
                    if isinstance(value[0], dict):
                        print(f"  First item keys: {list(value[0].keys())}")
                        # Show the first item completely if it's small enough
                        try:
                            first_item_str = json.dumps(value[0], indent=2, ensure_ascii=True)
                            if len(first_item_str) < 300:
                                print(f"  First item: {first_item_str}")
                            else:
                                print(f"  First item: (too large to display)")
                        except:
                            print(f"  First item: (could not serialize)")
                    else:
                        safe_print(f"  First item: {value[0]}")
            elif isinstance(value, dict):
                print(f"  Dict with {len(value)} keys: {list(value.keys())}")
            else:
                safe_print(f"  {value}")
    else:
        print("No Facebook results found")
    
    print("\n" + "="*60)
    print("Looking for comment-like field names:")
    
    if facebook_results:
        data = facebook_results[0].scraped_data
        comment_related_keys = []
        
        for key in data.keys():
            key_lower = key.lower()
            if any(word in key_lower for word in ['comment', 'reply', 'response', 'interact', 'engage']):
                comment_related_keys.append(key)
        
        if comment_related_keys:
            print("Found comment-related keys:", comment_related_keys)
            for key in comment_related_keys:
                value = data[key]
                print(f"\n{key}:")
                if isinstance(value, list):
                    print(f"  List with {len(value)} items")
                    if value and isinstance(value[0], dict):
                        print(f"  Sample item keys: {list(value[0].keys())}")
                else:
                    safe_print(f"  Value: {value}")
        else:
            print("No obvious comment-related keys found")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(debug_full_raw_structure())
    if success:
        print("\nFull structure analysis completed!")
    else:
        print("\nAnalysis failed!")
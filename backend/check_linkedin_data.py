#!/usr/bin/env python3
"""
Check LinkedIn scraped data availability and structure
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

def safe_print(obj, max_length=300):
    """Safely print objects with potential unicode issues"""
    try:
        s = str(obj)
        if len(s) > max_length:
            s = s[:max_length] + "..."
        s = s.encode('ascii', 'replace').decode('ascii')
        print(s)
    except Exception as e:
        print(f"[Error printing object: {e}]")

async def check_linkedin_data():
    """Check LinkedIn scraped data structure"""
    
    print("LinkedIn Scraped Data Analysis")
    print("=" * 50)
    
    # Check for LinkedIn results
    get_linkedin_results = sync_to_async(lambda: list(ScrapyResult.objects.filter(
        job__config__platform='linkedin'
    ).order_by('-scrape_timestamp')[:3]))
    
    linkedin_results = await get_linkedin_results()
    
    if not linkedin_results:
        print("No LinkedIn results found")
        return False
        
    print(f"Found {len(linkedin_results)} LinkedIn results")
    
    for i, result in enumerate(linkedin_results):
        print(f"\n--- LinkedIn Result {i+1} ---")
        print(f"Job ID: {result.job.id}")
        print(f"Scrape Time: {result.scrape_timestamp}")
        print(f"Status: {result.job.status}")
        
        data = result.scraped_data
        print(f"Data Keys: {list(data.keys())}")
        
        # Show sample data structure
        for key, value in data.items():
            print(f"\n{key}: ({type(value).__name__})")
            
            if isinstance(value, str):
                safe_print(f"  '{value[:100]}{'...' if len(value) > 100 else ''}'")
            elif isinstance(value, (int, float, bool)):
                print(f"  {value}")
            elif isinstance(value, list):
                print(f"  List with {len(value)} items")
                if value:
                    print(f"  First item type: {type(value[0]).__name__}")
                    if isinstance(value[0], dict):
                        print(f"  First item keys: {list(value[0].keys())}")
            elif isinstance(value, dict):
                print(f"  Dict with {len(value)} keys: {list(value.keys())}")
            else:
                safe_print(f"  {value}")
        
        # Check if this data has been processed into LinkedIn models
        if hasattr(result.job, 'linkedinpost_set'):
            linkedin_posts_count = result.job.linkedinpost_set.count()
            print(f"\nProcessed LinkedIn Posts: {linkedin_posts_count}")
        
        print("\n" + "-" * 30)
        
        # Only show first result in detail
        if i == 0:
            print("\nSample Raw Data (first result):")
            try:
                sample_json = json.dumps(data, indent=2, ensure_ascii=True)[:1000]
                print(sample_json + ("..." if len(sample_json) == 1000 else ""))
            except Exception as e:
                print(f"Could not serialize data: {e}")
    
    return True

if __name__ == "__main__":
    success = asyncio.run(check_linkedin_data())
    if success:
        print("\nLinkedIn data analysis completed!")
    else:
        print("\nLinkedIn data analysis failed!")
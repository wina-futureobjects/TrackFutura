#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from brightdata_integration.models import WebhookEvent, ScraperRequest
from instagram_data.models import InstagramPost

def debug_webhook():
    snapshot_id = 's_me5ghmhu1pgxzeruj7'
    
    print("=== Webhook Debug Analysis ===")
    print(f"Snapshot ID: {snapshot_id}")
    print()
    
    # Check ScraperRequest
    try:
        scraper_request = ScraperRequest.objects.get(request_id=snapshot_id)
        print("✅ ScraperRequest found:")
        print(f"  ID: {scraper_request.id}")
        print(f"  Platform: {scraper_request.platform}")
        print(f"  Target URL: {scraper_request.target_url}")
        print(f"  Folder ID: {scraper_request.folder_id}")
        print(f"  Status: {scraper_request.status}")
    except ScraperRequest.DoesNotExist:
        print("❌ ScraperRequest not found")
        return
    
    # Check WebhookEvent
    try:
        webhook_event = WebhookEvent.objects.get(snapshot_id=snapshot_id)
        print("\n✅ WebhookEvent found:")
        print(f"  ID: {webhook_event.id}")
        print(f"  Status: {webhook_event.status}")
        print(f"  Platform: {webhook_event.platform}")
        print(f"  Error: {webhook_event.error_message}")
        print(f"  Received: {webhook_event.received_at}")
        print(f"  Processed: {webhook_event.processed_at}")
        
        if webhook_event.raw_payload:
            print(f"  Raw payload keys: {list(webhook_event.raw_payload.keys())}")
            
            # Check if data exists in payload
            if 'data' in webhook_event.raw_payload:
                data = webhook_event.raw_payload['data']
                print(f"  Data type: {type(data)}")
                if isinstance(data, list):
                    print(f"  Data length: {len(data)}")
                    if len(data) > 0:
                        print(f"  First item keys: {list(data[0].keys())}")
                        print(f"  First item sample: {str(data[0])[:200]}...")
                else:
                    print(f"  Data content: {str(data)[:200]}...")
            else:
                print("  ❌ No 'data' key in raw_payload")
        else:
            print("  ❌ No raw_payload")
            
    except WebhookEvent.DoesNotExist:
        print("❌ WebhookEvent not found")
        return
    
    # Check Instagram posts
    print("\n=== Instagram Posts Analysis ===")
    total_posts = InstagramPost.objects.count()
    print(f"Total Instagram posts: {total_posts}")
    
    # Check posts created after webhook
    from datetime import datetime
    import pytz
    webhook_time = datetime(2025, 8, 10, 9, 4, 12, tzinfo=pytz.UTC)
    recent_posts = InstagramPost.objects.filter(created_at__gte=webhook_time)
    print(f"Posts created after webhook: {recent_posts.count()}")
    
    # Check posts in the specific folder
    if scraper_request.folder_id:
        folder_posts = InstagramPost.objects.filter(folder_id=scraper_request.folder_id)
        print(f"Posts in folder {scraper_request.folder_id}: {folder_posts.count()}")
        
        if folder_posts.exists():
            print("Recent posts in folder:")
            for post in folder_posts.order_by('-created_at')[:3]:
                print(f"  - {post.post_id} by {post.user_posted} ({post.created_at})")
    
    print("\n=== Analysis Complete ===")

if __name__ == "__main__":
    debug_webhook()

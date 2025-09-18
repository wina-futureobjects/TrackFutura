#!/usr/bin/env python3
"""
Test script to send actual BrightData JSON to webhook endpoint
"""
import requests
import json

# The actual BrightData JSON structure from your file
webhook_data = [
    {
        "url": "https://www.facebook.com/openai/videos/23867194552904616/",
        "post_id": "1201521108436164",
        "user_url": "https://www.facebook.com/openai",
        "user_username_raw": "OpenAI",
        "content": "Sam & Jony introduce io.",
        "date_posted": "2025-05-21T17:10:31.000Z",
        "num_comments": 55,
        "num_shares": 116,
        "num_likes_type": {"type": "Like", "num": 265},
        "page_name": "OpenAI",
        "profile_id": "100057348583504",
        "page_intro": "Creating safe AGI that benefits all of humanity.",
        "page_category": "Computer Company",
        "likes": 316,
        "post_type": "Post",
        "video_view_count": 8436,
        "timestamp": "2025-05-27T14:48:21.565Z",
        "input": {
            "url": "https://www.facebook.com/openai",
            "num_of_posts": 10,
            "posts_to_not_include": [],
            "start_date": "05-18-2025",
            "end_date": "05-27-2025"
        }
    }
]

# Headers with authentication
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer bd_webhook_token_2024_secure_development_key',
    'X-Platform': 'facebook'
}

# Test the webhook endpoint
webhook_url = 'http://localhost:8000/api/brightdata/webhook/'

print("Testing BrightData webhook endpoint...")
print(f"URL: {webhook_url}")
print(f"Data: {len(webhook_data)} posts")
print(f"First post ID: {webhook_data[0]['post_id']}")

try:
    response = requests.post(
        webhook_url,
        json=webhook_data,
        headers=headers,
        timeout=30
    )
    
    print(f"\nResponse Status: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print(f"Response Content: {response.text}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS: Webhook processed successfully!")
        print("Check your Django admin or database to see if the Facebook post was created.")
    else:
        print(f"\n❌ ERROR: Webhook returned status {response.status_code}")
        
except requests.exceptions.ConnectionError:
    print("\n❌ ERROR: Could not connect to Django server")
    print("Make sure Django server is running: python manage.py runserver 8000")
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}") 
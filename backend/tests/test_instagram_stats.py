#!/usr/bin/env python3
"""
Simple test script to verify Instagram posts stats endpoint
"""

import requests
import json

def test_instagram_posts_stats():
    """Test the Instagram posts stats endpoint"""
    
    # Test URL - adjust if your Django server is running on a different port
    base_url = "http://localhost:8000"
    stats_url = f"{base_url}/api/instagram-data/posts/stats/"
    
    # Test parameters
    params = {
        'folder_id': '1',
        'project': '9'
    }
    
    print(f"Testing Instagram posts stats endpoint...")
    print(f"URL: {stats_url}")
    print(f"Parameters: {params}")
    print("-" * 50)
    
    try:
        # Make the request
        response = requests.get(stats_url, params=params, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Response data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"❌ Error! Response text:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure Django server is running on localhost:8000")
    except requests.exceptions.Timeout:
        print("❌ Timeout Error: Request took too long")
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")

if __name__ == "__main__":
    test_instagram_posts_stats() 
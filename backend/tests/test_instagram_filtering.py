#!/usr/bin/env python3
"""
Test script to verify Instagram filtering and sorting functionality
"""

import requests
import json

def test_instagram_filtering():
    """Test the Instagram posts filtering and sorting endpoints"""
    
    # Test URL - adjust if your Django server is running on a different port
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Instagram filtering and sorting functionality...")
    print("=" * 60)
    
    # Test 1: Basic posts endpoint with sorting
    print("\n1️⃣ Testing basic posts endpoint with sorting...")
    posts_url = f"{base_url}/api/instagram-data/posts/"
    params = {
        'folder_id': '1',
        'project': '9',
        'sort_by': 'likes',
        'sort_order': 'desc',
        'page': '1',
        'page_size': '5'
    }
    
    try:
        response = requests.get(posts_url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {data.get('count', 0)} posts")
            print(f"📊 Results: {len(data.get('results', []))} items")
            
            # Check if results are sorted by likes (descending)
            results = data.get('results', [])
            if len(results) >= 2:
                first_likes = results[0].get('likes', 0)
                second_likes = results[1].get('likes', 0)
                if first_likes >= second_likes:
                    print("✅ Sorting by likes (descending) is working correctly")
                else:
                    print("❌ Sorting by likes (descending) is not working")
        else:
            print(f"❌ Error! Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure Django server is running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
    
    # Test 2: Posts endpoint with date filtering
    print("\n2️⃣ Testing posts endpoint with date filtering...")
    params = {
        'folder_id': '1',
        'project': '9',
        'start_date': '2024-01-01',
        'end_date': '2024-12-31',
        'sort_by': 'date_posted',
        'sort_order': 'desc',
        'page': '1',
        'page_size': '5'
    }
    
    try:
        response = requests.get(posts_url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {data.get('count', 0)} posts in date range")
            print(f"📊 Results: {len(data.get('results', []))} items")
        else:
            print(f"❌ Error! Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
    
    # Test 3: Posts endpoint with likes filtering
    print("\n3️⃣ Testing posts endpoint with likes filtering...")
    params = {
        'folder_id': '1',
        'project': '9',
        'min_likes': '100',
        'max_likes': '1000',
        'sort_by': 'likes',
        'sort_order': 'asc',
        'page': '1',
        'page_size': '5'
    }
    
    try:
        response = requests.get(posts_url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {data.get('count', 0)} posts with likes in range")
            print(f"📊 Results: {len(data.get('results', []))} items")
            
            # Check if likes are within the specified range
            results = data.get('results', [])
            if results:
                all_in_range = all(100 <= post.get('likes', 0) <= 1000 for post in results)
                if all_in_range:
                    print("✅ Likes filtering is working correctly")
                else:
                    print("❌ Likes filtering is not working correctly")
        else:
            print(f"❌ Error! Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
    
    # Test 4: Comments endpoint with sorting
    print("\n4️⃣ Testing comments endpoint with sorting...")
    comments_url = f"{base_url}/api/instagram-data/comments/"
    params = {
        'folder_id': '1',
        'project': '9',
        'sort_by': 'comment_date',
        'sort_order': 'desc',
        'page': '1',
        'page_size': '5'
    }
    
    try:
        response = requests.get(comments_url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {data.get('count', 0)} comments")
            print(f"📊 Results: {len(data.get('results', []))} items")
        else:
            print(f"❌ Error! Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Unexpected Error: {str(e)}")
    
    print("\n" + "=" * 60)
    print("🏁 Testing completed!")

if __name__ == "__main__":
    test_instagram_filtering() 
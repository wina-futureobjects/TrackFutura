#!/usr/bin/env python3
"""
Simple test script to debug webhook issues step by step
"""
import os
import sys
import django
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from facebook_data.models import FacebookPost, Folder

def test_simple_facebook_post_creation():
    """Test creating a simple Facebook post"""
    print("Testing simple Facebook post creation...")
    
    try:
        # Create a test folder
        folder = Folder.objects.create(
            name='Simple Test Folder',
            description='Test folder for debugging'
        )
        print(f"✓ Created folder: {folder.name}")
        
        # Create a simple Facebook post
        post_data = {
            'url': 'https://www.facebook.com/openai/videos/23867194552904616/',
            'post_id': 'test_post_123',
            'content': 'Test post content',
            'likes': 100,
            'num_comments': 5,
            'folder': folder
        }
        
        facebook_post = FacebookPost.objects.create(**post_data)
        print(f"✓ Created Facebook post: {facebook_post.post_id}")
        print(f"  Content: {facebook_post.content}")
        print(f"  Likes: {facebook_post.likes}")
        print(f"  Folder: {facebook_post.folder.name}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error creating Facebook post: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_webhook_auth():
    """Test webhook authentication"""
    print("\nTesting webhook authentication...")
    
    try:
        from brightdata_integration.views import _verify_webhook_auth
        
        # Test with correct token
        auth_header = "Bearer bd_webhook_token_2024_secure_development_key"
        result = _verify_webhook_auth(auth_header)
        print(f"✓ Auth with correct token: {result}")
        
        # Test with wrong token
        auth_header = "Bearer wrong_token"
        result = _verify_webhook_auth(auth_header)
        print(f"✓ Auth with wrong token: {result}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing webhook auth: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_field_mapping():
    """Test field mapping function"""
    print("\nTesting field mapping...")
    
    try:
        from brightdata_integration.views import _map_post_fields
        
        # Sample BrightData post
        sample_post = {
            "url": "https://www.facebook.com/openai/videos/23867194552904616/",
            "post_id": "1201521108436164",
            "user_username_raw": "OpenAI",
            "content": "Sam & Jony introduce io.",
            "date_posted": "2025-05-21T17:10:31.000Z",
            "num_comments": 55,
            "num_shares": 116,
            "likes": 316,
            "page_name": "OpenAI"
        }
        
        mapped_fields = _map_post_fields(sample_post, 'facebook')
        print(f"✓ Field mapping successful")
        print(f"  Mapped {len(mapped_fields)} fields")
        print(f"  Sample: post_id={mapped_fields.get('post_id')}, content='{mapped_fields.get('content')[:30]}...'")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing field mapping: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_webhook_processing():
    """Test webhook data processing"""
    print("\nTesting webhook data processing...")
    
    try:
        from brightdata_integration.views import _process_webhook_data
        
        # Sample webhook data
        webhook_data = [
            {
                "url": "https://www.facebook.com/openai/videos/23867194552904616/",
                "post_id": "webhook_test_post_456",
                "user_username_raw": "OpenAI",
                "content": "Webhook test post content",
                "date_posted": "2025-05-21T17:10:31.000Z",
                "num_comments": 55,
                "num_shares": 116,
                "likes": 316,
                "page_name": "OpenAI"
            }
        ]
        
        result = _process_webhook_data(webhook_data, 'facebook')
        print(f"✓ Webhook processing result: {result}")
        
        # Check if post was created
        if result:
            post = FacebookPost.objects.filter(post_id='webhook_test_post_456').first()
            if post:
                print(f"✓ Post created successfully: {post.content}")
            else:
                print("✗ Post was not found in database")
        
        return result
        
    except Exception as e:
        print(f"✗ Error testing webhook processing: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("=== Simple Webhook Debugging ===\n")
    
    test1 = test_simple_facebook_post_creation()
    test2 = test_webhook_auth()
    test3 = test_field_mapping()
    test4 = test_webhook_processing()
    
    print(f"\n=== Results ===")
    print(f"Simple post creation: {'✓ PASS' if test1 else '✗ FAIL'}")
    print(f"Webhook authentication: {'✓ PASS' if test2 else '✗ FAIL'}")
    print(f"Field mapping: {'✓ PASS' if test3 else '✗ FAIL'}")
    print(f"Webhook processing: {'✓ PASS' if test4 else '✗ FAIL'}")
    
    if all([test1, test2, test3, test4]):
        print("\n🎉 All tests passed! The webhook should work.")
    else:
        print("\n❌ Some tests failed. Check the errors above.")

if __name__ == '__main__':
    main() 
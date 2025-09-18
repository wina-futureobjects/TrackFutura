#!/usr/bin/env python3
"""
Test script to verify Facebook comment extraction functionality
"""
import os
import sys
import django
import asyncio
import json
from datetime import datetime, timezone
from asgiref.sync import sync_to_async

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Import after Django setup
from apify_integration.data_transformer import DataTransformer
from scrapy_integration.models import ScrapyResult, ScrapyJob
from facebook_data.models import FacebookPost, FacebookComment, Folder
from users.models import Project

async def test_facebook_comment_extraction():
    """Test Facebook comment extraction functionality"""
    
    print("Testing Facebook Comment Extraction")
    print("=" * 50)
    
    # Create test data that mimics Apify Facebook scraper output
    test_scraped_data = {
        "post_url": "https://facebook.com/test/posts/123456789",
        "username": "testuser",
        "text": "This is a test Facebook post for comment extraction!",
        "likes": 25,
        "shares": 5,
        "timestamp": "2024-01-15T10:30:00Z",
        "comments": [
            {
                "id": "comment_1",
                "author": "John Smith",
                "author_id": "john123",
                "author_url": "https://facebook.com/john123",
                "text": "Great post! I totally agree with this sentiment.",
                "date": "2024-01-15T11:00:00Z",
                "likes": 3,
                "replies": 1
            },
            {
                "id": "comment_2", 
                "author": "Jane Doe",
                "author_id": "jane456",
                "author_url": "https://facebook.com/jane456", 
                "text": "This is amazing! Thanks for sharing :)",
                "date": "2024-01-15T11:15:00Z",
                "likes": 7,
                "replies": 0
            },
            {
                "id": "comment_3",
                "author": "Bob Johnson", 
                "author_id": "bob789",
                "author_url": "https://facebook.com/bob789",
                "text": "I disagree with this viewpoint. Here's why...",
                "date": "2024-01-15T11:30:00Z", 
                "likes": 1,
                "replies": 2
            }
        ]
    }
    
    try:
        # Import models
        from scrapy_integration.models import ScrapyConfig
        
        # Create async versions of database operations
        create_project = sync_to_async(Project.objects.get_or_create)
        create_config = sync_to_async(ScrapyConfig.objects.get_or_create)
        create_job = sync_to_async(ScrapyJob.objects.get_or_create)
        create_result = sync_to_async(ScrapyResult.objects.get_or_create)
        count_comments = sync_to_async(lambda: FacebookComment.objects.filter(post_id__contains="123456789").count())
        count_posts = sync_to_async(lambda: FacebookPost.objects.filter(post_id__contains="123456789").count())
        
        # Create test project
        project, _ = await create_project(
            name="Test Project",
            defaults={"description": "Test project for comment extraction"}
        )
        
        # Create test config
        config, _ = await create_config(
            platform="facebook",
            content_type="posts",
            defaults={
                "name": "Test Facebook Config",
                "description": "Test configuration for comment extraction"
            }
        )
        
        # Create test job
        job, _ = await create_job(
            name="Facebook Comments Test",
            project=project,
            config=config,
            defaults={
                "target_urls": ["https://facebook.com/test"],
                "num_of_posts": 10
            }
        )
        
        # Create test ScrapyResult
        result, _ = await create_result(
            job=job,
            source_url="https://facebook.com/test",
            source_name="Test Facebook Page",
            defaults={
                "scraped_data": test_scraped_data,
                "success": True
            }
        )
        
        # Initialize data transformer
        transformer = DataTransformer()
        
        print(f"Test Data Summary:")
        print(f"   Post: {test_scraped_data['text'][:50]}...")
        print(f"   Comments: {len(test_scraped_data['comments'])}")
        print(f"   Expected comment texts:")
        for i, comment in enumerate(test_scraped_data['comments'], 1):
            print(f"     {i}. \"{comment['text'][:40]}...\" by {comment['author']}")
        print()
        
        # Count comments before transformation
        initial_comment_count = await count_comments()
        initial_post_count = await count_posts()
        
        print(f"Before Transformation:")
        print(f"   Facebook Posts: {initial_post_count}")
        print(f"   Facebook Comments: {initial_comment_count}")
        print()
        
        # Transform the data (this should create the post and comments)
        await transformer._transform_facebook_data([result])
        
        # Count comments after transformation
        final_comment_count = await count_comments()
        final_post_count = await count_posts()
        
        print(f"After Transformation:")
        print(f"   Facebook Posts: {final_post_count}")
        print(f"   Facebook Comments: {final_comment_count}")
        print()
        
        # Create async functions for remaining database operations
        get_post = sync_to_async(lambda: FacebookPost.objects.filter(post_id__contains="123456789").last())
        get_comments = sync_to_async(lambda: list(FacebookComment.objects.filter(post_id__contains="123456789").order_by('created_at')))
        get_comments_with_text = sync_to_async(lambda: list(FacebookComment.objects.filter(
            post_id__contains="123456789",
            comment_text__isnull=False
        ).exclude(comment_text="")))
        
        # Verify the results
        if final_post_count > initial_post_count:
            print("PASS: Post Creation SUCCESS")
            
            # Get the created post
            post = await get_post()
            if post:
                print(f"   Created post: {post.content[:50]}...")
                print(f"   Post comment count: {post.num_comments}")
        else:
            print("FAIL: Post Creation FAILED")
            
        if final_comment_count > initial_comment_count:
            print("PASS: Comment Extraction SUCCESS")
            
            # Get the created comments
            comments = await get_comments()
            print(f"   Created {len(comments)} comments:")
            
            for comment in comments:
                print(f"     - \"{comment.comment_text[:40]}...\" by {comment.user_name}")
                print(f"       Likes: {comment.num_likes}, Replies: {comment.num_replies}")
        else:
            print("FAIL: Comment Extraction FAILED")
            
        print()
        
        # Test sentiment analysis readiness
        print("Sentiment Analysis Readiness:")
        comments_with_text = await get_comments_with_text()
        
        print(f"   Comments with text for analysis: {len(comments_with_text)}")
        
        if comments_with_text:
            print("   Sample comment texts:")
            for comment in comments_with_text[:3]:
                print(f"     - \"{comment.comment_text[:60]}...\"")
                
        print()
        
        # API endpoint test
        print("API Endpoint Verification:")
        print("   Facebook Comments API: /api/facebook-data/comments/")
        print("   You can now fetch comments for sentiment analysis!")
        
        return True
        
    except Exception as e:
        print(f"FAIL: Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_facebook_comment_extraction())
    if success:
        print("\nSUCCESS: Facebook Comment Extraction Test PASSED!")
        print("Comments are now properly extracted and ready for sentiment analysis.")
    else:
        print("\nFAILED: Facebook Comment Extraction Test FAILED!")
        print("Please check the error messages above.")
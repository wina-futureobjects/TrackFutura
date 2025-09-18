#!/usr/bin/env python3
"""
Test LinkedIn data transformation with the actual JSON data
"""
import os
import sys
import django
import json
import asyncio

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.append(project_root)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyJob, ScrapyResult, ScrapyConfig
from apify_integration.data_transformer import DataTransformer
from linkedin_data.models import LinkedInPost
from asgiref.sync import sync_to_async

async def test_linkedin_transformation():
    """Test LinkedIn data transformation using existing JSON data"""
    
    print("Testing LinkedIn Data Transformation")
    print("=" * 50)
    
    # Load the transformed LinkedIn posts JSON
    json_file = os.path.join(project_root, 'transformed_linkedin_posts.json')
    
    if not os.path.exists(json_file):
        print("LinkedIn JSON file not found!")
        return False
        
    with open(json_file, 'r', encoding='utf-8') as f:
        linkedin_data = json.load(f)
    
    print(f"Loaded {len(linkedin_data)} LinkedIn posts from JSON")
    
    # Create a test job and config
    get_or_create_config = sync_to_async(lambda: ScrapyConfig.objects.get_or_create(
        platform='linkedin',
        defaults={'name': 'LinkedIn Test Config'}
    )[0])
    config = await get_or_create_config()
    
    create_job = sync_to_async(ScrapyJob.objects.create)
    job = await create_job(
        name="LinkedIn Test Transform Job",
        config=config,
        target_urls=["https://linkedin.com/test"],
        source_names=["LinkedIn Test"]
    )
    
    print(f"Created test job: {job.name}")
    
    # Create test results for each LinkedIn post
    transformer = DataTransformer()
    results = []
    
    for i, post_data in enumerate(linkedin_data):
        create_result = sync_to_async(ScrapyResult.objects.create)
        result = await create_result(
            job=job,
            source_name=f"LinkedIn Test {i+1}",
            source_url=post_data['metadata']['url'],
            success=True,
            scraped_data=post_data
        )
        results.append(result)
        print(f"Created test result {i+1}: {result.source_name}")
    
    print(f"\nTransforming {len(results)} LinkedIn results...")
    
    # Count existing LinkedIn posts before transformation
    count_posts = sync_to_async(LinkedInPost.objects.count)
    initial_count = await count_posts()
    
    # Transform the data
    await transformer.transform_scrapy_results_to_platform_data(job.id)
    
    # Count LinkedIn posts after transformation
    final_count = await count_posts()
    created_posts = final_count - initial_count
    
    print(f"\nTransformation Results:")
    print(f"- LinkedIn posts before: {initial_count}")
    print(f"- LinkedIn posts after: {final_count}")
    print(f"- Posts created: {created_posts}")
    
    # Show sample of created posts
    get_posts = sync_to_async(lambda: list(LinkedInPost.objects.order_by('-created_at')[:3]))
    recent_posts = await get_posts()
    
    print(f"\nSample of created posts:")
    for i, post in enumerate(recent_posts):
        print(f"Post {i+1}:")
        print(f"  - User: {post.user_posted}")
        print(f"  - Likes: {post.likes}")
        print(f"  - Comments: {post.num_comments}")
        print(f"  - Date: {post.date_posted}")
        print(f"  - Text: {post.description[:100]}...")
    
    # Clean up test data
    delete_job = sync_to_async(job.delete)
    await delete_job()
    print(f"\nCleaned up test job")
    
    return created_posts > 0

if __name__ == "__main__":
    success = asyncio.run(test_linkedin_transformation())
    if success:
        print("\nLinkedIn transformation test completed successfully!")
    else:
        print("\nLinkedIn transformation test failed!")
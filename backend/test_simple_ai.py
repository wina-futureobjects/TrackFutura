#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.models import ScrapyResult
from django.db.models import Q

def test_simple_data_access():
    """Simple test to get scraped data without the complex processing"""
    project_id = 9
    
    try:
        # Get raw data
        results = ScrapyResult.objects.filter(
            job__project_id=project_id, 
            success=True
        ).select_related('job', 'job__config')[:5]
        
        print(f"Found {results.count()} results for project {project_id}")
        
        posts = []
        for result in results:
            if result.scraped_data:
                platform = result.job.config.platform
                job_name = result.job.name
                
                if isinstance(result.scraped_data, dict):
                    post_data = result.scraped_data
                    # Simple standardization
                    post = {
                        'platform': platform,
                        'job': job_name,
                        'text': post_data.get('caption', post_data.get('text', post_data.get('description', ''))),
                        'likes': post_data.get('likes', post_data.get('num_likes', 0)) or 0,
                        'comments': post_data.get('comments_count', post_data.get('num_comments', 0)) or 0
                    }
                    posts.append(post)
        
        print(f"Processed {len(posts)} posts")
        
        if posts:
            sample = posts[0]
            print(f"Sample post: {sample['platform']} - {sample['text'][:50]} - {sample['likes']} likes")
            
        # Test simple AI analysis
        if posts:
            question = "What's the sentiment of my Instagram posts?"
            sample_response = f"Based on your {len(posts)} scraped posts across platforms, I can analyze the sentiment. Your posts show engagement patterns with an average of {sum(p['likes'] for p in posts) / len(posts):.1f} likes per post."
            
            print(f"Sample AI response: {sample_response}")
            return True
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_simple_data_access()
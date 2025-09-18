#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.ai_analysis_chat_service import ai_chat_service

def test_ai_analysis():
    """Test AI analysis with error handling"""
    try:
        print("Testing AI analysis data retrieval...")
        
        # Test with project 9 which has data
        result = ai_chat_service.get_project_scraped_data(9)
        
        print(f"Result keys: {list(result.keys())}")
        print(f"Total results: {result.get('total_results', 0)}")
        print(f"Has error: {'error' in result}")
        
        if result.get('error'):
            print(f"Error: {result['error']}")
        else:
            print(f"Platforms: {list(result.get('platforms', {}).keys())}")
            print(f"Number of posts: {len(result.get('all_posts', []))}")
            
            if result.get('all_posts'):
                sample_post = result['all_posts'][0]
                print(f"Sample post keys: {list(sample_post.keys())}")
                print(f"Sample post platform: {sample_post.get('platform')}")
        
    except Exception as e:
        print(f"Exception occurred: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_ai_analysis()
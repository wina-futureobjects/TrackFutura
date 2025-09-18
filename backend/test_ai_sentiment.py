#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.ai_analysis_chat_service import ai_chat_service

def test_sentiment_analysis():
    """Test AI sentiment analysis with real data"""
    try:
        print("Testing AI sentiment analysis...")
        
        # Test with project 9 which has 86 posts
        question = "Analyze the sentiment of my Instagram posts"
        result = ai_chat_service.analyze_with_ai(question, 9)
        
        print(f"AI Analysis Success: {result.get('success')}")
        if result.get('success'):
            print(f"Response length: {len(result.get('response', ''))}")
            print(f"Data context: {result.get('data_context')}")
            print(f"Tokens used: {result.get('tokens_used')}")
            print("AI Response Preview:")
            print(result.get('response', '')[:500] + "..." if len(result.get('response', '')) > 500 else result.get('response', ''))
            return True
        else:
            print(f"Error: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_sentiment_analysis()
    if success:
        print("\n✅ AI sentiment analysis is working correctly!")
    else:
        print("\n❌ AI sentiment analysis failed")
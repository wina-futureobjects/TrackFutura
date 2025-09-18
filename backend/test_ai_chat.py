#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import django

# Set console encoding for Windows
if os.name == 'nt':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from scrapy_integration.ai_analysis_chat_service import AIAnalysisChatService

def test_ai_chatbot():
    """Test the AI chatbot functionality"""

    print("Testing AI Analysis Chatbot...")

    # Initialize the service
    ai_service = AIAnalysisChatService()

    # Test with project ID 8 (now has sample data)
    project_id = 8
    test_questions = [
        "What are my top performing Instagram posts?"
    ]

    for i, question in enumerate(test_questions, 1):
        print(f"\nTest Question {i}: {question}")
        print("=" * 60)

        # Get comprehensive data analysis
        result = ai_service.analyze_with_ai(question, project_id)

        if result.get('success'):
            print("SUCCESS!")
            print(f"Data Context: {result.get('data_context', {})}")
            print(f"AI Response:\n{result.get('response', '')}")
            if result.get('tokens_used'):
                print(f"Tokens Used: {result.get('tokens_used')}")
        else:
            print("FAILED!")
            print(f"Error: {result.get('error', 'Unknown error')}")

        print("\n" + "="*80 + "\n")

if __name__ == '__main__':
    test_ai_chatbot()
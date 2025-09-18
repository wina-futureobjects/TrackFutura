#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from openai import OpenAI
import httpx

def test_openai_direct():
    """Test OpenAI directly"""

    print("Testing OpenAI initialization...")

    api_key = os.getenv('OPENAI_API_KEY', 'your-openai-api-key')

    try:
        # Create custom HTTP client without proxy settings
        http_client = httpx.Client(
            timeout=60.0,
            follow_redirects=True
        )

        # Initialize OpenAI with custom http client
        client = OpenAI(
            api_key=api_key,
            http_client=http_client
        )
        print("SUCCESS: OpenAI client initialized!")

        # Test a simple chat completion
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "user", "content": "Hello! Just say 'Hi' back to test the connection."}
            ],
            max_tokens=50
        )

        print("SUCCESS: OpenAI API call completed!")
        print(f"Response: {response.choices[0].message.content}")
        print(f"Tokens used: {response.usage.total_tokens}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_openai_direct()
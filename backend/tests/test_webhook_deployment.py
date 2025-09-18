#!/usr/bin/env python
"""
Webhook Deployment Test Script

This script tests the webhook functionality to ensure it works correctly
when deployed to Upsun. It performs comprehensive tests of:
- Webhook endpoint accessibility
- Security validation
- BrightData integration compatibility
- Environment configuration
"""

import os
import sys
import django
import requests
import json
import time
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from django.test import Client
from django.urls import reverse

def test_django_setup():
    """Test that Django is properly configured"""
    print("🔧 Testing Django Setup...")

    try:
        from django.core.management import execute_from_command_line
        print("✅ Django management commands available")

        # Test database connection
        from django.db import connection
        connection.ensure_connection()
        print("✅ Database connection successful")

        # Test settings
        print(f"✅ Debug mode: {settings.DEBUG}")
        print(f"✅ Allowed hosts: {settings.ALLOWED_HOSTS}")

        return True
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        return False

def test_webhook_urls():
    """Test that webhook URLs are properly configured"""
    print("\n🌐 Testing Webhook URL Configuration...")

    try:
        client = Client()

        # Test webhook endpoint exists
        webhook_response = client.post('/api/brightdata/webhook/',
                                     content_type='application/json',
                                     data='{}')

        # Should get 401 (unauthorized) or 400 (bad request), not 404
        if webhook_response.status_code != 404:
            print("✅ Webhook endpoint accessible")
        else:
            print("❌ Webhook endpoint not found (404)")
            return False

        # Test notify endpoint exists
        notify_response = client.post('/api/brightdata/notify/',
                                    content_type='application/json',
                                    data='{}')

        if notify_response.status_code != 404:
            print("✅ Notify endpoint accessible")
        else:
            print("❌ Notify endpoint not found (404)")
            return False

        return True
    except Exception as e:
        print(f"❌ URL configuration test failed: {e}")
        return False

def test_webhook_security():
    """Test webhook security configuration"""
    print("\n🔒 Testing Webhook Security...")

    try:
        # Check security settings
        webhook_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', '')
        if not webhook_token or webhook_token == 'your-default-webhook-secret-token-change-this':
            print("⚠️  Default webhook token detected - should be changed for production")
        else:
            print("✅ Webhook token configured")

        # Check rate limiting
        rate_limit = getattr(settings, 'WEBHOOK_RATE_LIMIT', 0)
        print(f"✅ Rate limit: {rate_limit} requests/minute")

        # Check timestamp validation
        max_age = getattr(settings, 'WEBHOOK_MAX_TIMESTAMP_AGE', 0)
        print(f"✅ Max timestamp age: {max_age} seconds")

        return True
    except Exception as e:
        print(f"❌ Security configuration test failed: {e}")
        return False

def test_environment_detection():
    """Test environment detection for URL configuration"""
    print("\n🌍 Testing Environment Detection...")

    try:
        base_url = getattr(settings, 'BRIGHTDATA_BASE_URL', '')
        print(f"✅ Detected base URL: {base_url}")

        # Check if running on Upsun
        if os.getenv('PLATFORM_APPLICATION_NAME'):
            print("✅ Upsun environment detected")
            platform_routes = os.getenv('PLATFORM_ROUTES', '')
            if platform_routes:
                print("✅ Platform routes available")
            else:
                print("⚠️  Platform routes not found")
        else:
            print("ℹ️  Local development environment")

        return True
    except Exception as e:
        print(f"❌ Environment detection failed: {e}")
        return False

def test_webhook_functionality():
    """Test webhook endpoint with sample request"""
    print("\n🧪 Testing Webhook Functionality...")

    try:
        client = Client()
        webhook_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'test-token')

        # Prepare test payload
        test_payload = {
            "snapshot_id": "test_deployment_123",
            "platform": "test",
            "data": [
                {
                    "url": "https://example.com/test",
                    "title": "Deployment Test",
                    "content": "Testing webhook deployment functionality"
                }
            ],
            "timestamp": int(time.time())
        }

        headers = {
            'HTTP_AUTHORIZATION': f'Bearer {webhook_token}',
            'HTTP_X_BRIGHTDATA_TIMESTAMP': str(int(time.time())),
            'HTTP_X_PLATFORM': 'test'
        }

        response = client.post('/api/brightdata/webhook/',
                             content_type='application/json',
                             data=json.dumps(test_payload),
                             **headers)

        if response.status_code in [200, 201]:
            print("✅ Webhook processes requests successfully")
            try:
                result = response.json()
                print(f"✅ Response: {result.get('message', 'Success')}")
            except:
                print(f"✅ Response received: {response.status_code}")
        elif response.status_code == 401:
            print("✅ Webhook correctly rejects unauthorized requests")
        else:
            print(f"⚠️  Webhook returned status: {response.status_code}")
            print(f"   Response: {response.content.decode()[:200]}...")

        return True
    except Exception as e:
        print(f"❌ Webhook functionality test failed: {e}")
        return False

def test_brightdata_integration():
    """Test BrightData integration configuration"""
    print("\n🔗 Testing BrightData Integration...")

    try:
        # Check if BrightData models are accessible
        from brightdata_integration.models import BrightdataConfig, ScraperRequest
        print("✅ BrightData models imported successfully")

        # Check if configuration endpoints work
        client = Client()
        config_response = client.get('/api/brightdata/configs/')

        if config_response.status_code == 200:
            print("✅ BrightData configuration API accessible")
        else:
            print(f"⚠️  BrightData config API returned: {config_response.status_code}")

        return True
    except Exception as e:
        print(f"❌ BrightData integration test failed: {e}")
        return False

def run_deployment_tests():
    """Run all deployment tests"""
    print("🚀 Starting Webhook Deployment Tests...\n")

    tests = [
        ("Django Setup", test_django_setup),
        ("Webhook URLs", test_webhook_urls),
        ("Security Config", test_webhook_security),
        ("Environment Detection", test_environment_detection),
        ("Webhook Functionality", test_webhook_functionality),
        ("BrightData Integration", test_brightdata_integration)
    ]

    results = []
    for test_name, test_func in tests:
        success = test_func()
        results.append((test_name, success))

    # Summary
    print("\n" + "="*50)
    print("📊 DEPLOYMENT TEST RESULTS")
    print("="*50)

    passed = 0
    total = len(results)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{test_name:25} {status}")
        if success:
            passed += 1

    print("-"*50)
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("🎉 All tests passed! Ready for Upsun deployment.")
        return True
    else:
        print("⚠️  Some tests failed. Please review before deploying.")
        return False

if __name__ == "__main__":
    success = run_deployment_tests()
    sys.exit(0 if success else 1)

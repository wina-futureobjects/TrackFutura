#!/usr/bin/env python
"""
Test script to verify the new webhook URL configuration
"""
import os
import sys
import django
import requests

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

def test_webhook_url():
    """Test the webhook URL configuration"""
    print("🔧 Testing Webhook URL Configuration")
    print("=" * 50)
    
    # Get the configured webhook URLs
    webhook_base_url = getattr(settings, 'BRIGHTDATA_WEBHOOK_BASE_URL', 'Not set')
    brightdata_base_url = getattr(settings, 'BRIGHTDATA_BASE_URL', 'Not set')
    
    print(f"📋 Configuration:")
    print(f"   BRIGHTDATA_WEBHOOK_BASE_URL: {webhook_base_url}")
    print(f"   BRIGHTDATA_BASE_URL: {brightdata_base_url}")
    print()
    
    # Test the main API endpoint
    api_url = f"{webhook_base_url}/"
    print(f"🌐 Testing API endpoint: {api_url}")
    
    try:
        response = requests.get(api_url, timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("   ✅ API endpoint is accessible!")
        else:
            print("   ⚠️  API endpoint returned non-200 status")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error accessing API endpoint: {str(e)}")
    
    print()
    
    # Test the webhook endpoint
    webhook_url = f"{webhook_base_url}/api/brightdata/webhook/"
    print(f"🔗 Testing webhook endpoint: {webhook_url}")
    
    try:
        response = requests.get(webhook_url, timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code in [200, 405]:  # 405 is expected for GET on POST endpoint
            print("   ✅ Webhook endpoint is accessible!")
        else:
            print("   ⚠️  Webhook endpoint returned unexpected status")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error accessing webhook endpoint: {str(e)}")
    
    print()
    
    # Test the notify endpoint
    notify_url = f"{webhook_base_url}/api/brightdata/notify/"
    print(f"📢 Testing notify endpoint: {notify_url}")
    
    try:
        response = requests.get(notify_url, timeout=10)
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code in [200, 405]:  # 405 is expected for GET on POST endpoint
            print("   ✅ Notify endpoint is accessible!")
        else:
            print("   ⚠️  Notify endpoint returned unexpected status")
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error accessing notify endpoint: {str(e)}")
    
    print()
    print("🎉 Webhook URL configuration test completed!")

if __name__ == "__main__":
    test_webhook_url()

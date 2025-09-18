#!/usr/bin/env python
"""
Webhook URL Setup Script
This script helps configure the webhook URL for BrightData integration.
"""

import os
import sys
import socket
import requests
import subprocess
from pathlib import Path

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "192.168.0.17"  # Fallback

def check_ngrok_status():
    """Check if ngrok is running and get the public URL"""
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=2)
        if response.status_code == 200:
            tunnels = response.json().get('tunnels', [])
            for tunnel in tunnels:
                if tunnel.get('proto') == 'https':
                    return tunnel['public_url']
    except:
        pass
    return None

def test_webhook_endpoint(url):
    """Test if webhook endpoint is accessible"""
    try:
        response = requests.get(f"{url}/api/brightdata/webhook/", timeout=5)
        if response.status_code == 405:  # Method not allowed (POST only)
            return True, "✅ Webhook endpoint accessible"
        else:
            return False, f"⚠️ Webhook endpoint returned status {response.status_code}"
    except requests.exceptions.RequestException as e:
        return False, f"❌ Webhook endpoint not accessible: {e}"

def main():
    print("🔧 Webhook URL Setup for Track Futura")
    print("=" * 50)
    
    # Check current configuration
    current_url = os.environ.get('BRIGHTDATA_BASE_URL', 'http://localhost:8000')
    print(f"Current webhook URL: {current_url}")
    
    # Check if ngrok is running
    ngrok_url = check_ngrok_status()
    if ngrok_url:
        print(f"✅ ngrok detected: {ngrok_url}")
        recommended_url = ngrok_url
    else:
        print("❌ ngrok not running")
        local_ip = get_local_ip()
        recommended_url = f"http://{local_ip}:8000"
        print(f"💡 Recommended local URL: {recommended_url}")
    
    print()
    print("Options:")
    print("1. Use ngrok URL (if ngrok is running)")
    print("2. Use local network IP")
    print("3. Enter custom URL")
    print("4. Keep current URL")
    print("5. Test current webhook endpoint")
    
    choice = input("\nEnter your choice (1-5): ").strip()
    
    if choice == "1" and ngrok_url:
        new_url = ngrok_url
    elif choice == "2":
        local_ip = get_local_ip()
        new_url = f"http://{local_ip}:8000"
    elif choice == "3":
        new_url = input("Enter custom URL (e.g., https://your-domain.com): ").strip()
    elif choice == "5":
        # Test current webhook endpoint
        success, message = test_webhook_endpoint(current_url)
        print(f"\n{message}")
        return
    else:
        print("Keeping current URL")
        return
    
    # Set the environment variable
    os.environ['BRIGHTDATA_BASE_URL'] = new_url
    
    # Test the webhook endpoint
    webhook_url = f"{new_url}/api/brightdata/webhook/"
    print(f"\nTesting webhook endpoint: {webhook_url}")
    
    success, message = test_webhook_endpoint(new_url)
    print(message)
    
    if success:
        print(f"\n✅ Webhook URL set to: {new_url}")
        print(f"🔗 Webhook endpoint: {webhook_url}")
        
        # Instructions for permanent setup
        print("\n📝 To make this permanent, run one of these commands:")
        if os.name == 'nt':  # Windows
            print(f'   setx BRIGHTDATA_BASE_URL "{new_url}"')
        else:  # Linux/Mac
            print(f'   export BRIGHTDATA_BASE_URL="{new_url}"')
            print("   (Add to your ~/.bashrc or ~/.zshrc for permanent setup)")
        
        print("\n🚀 Next steps:")
        print("1. Restart your Django server with: python manage.py runserver 0.0.0.0:8000")
        print("2. Test webhook reception with: python manage.py test_webhook_setup")
        print("3. Monitor webhook logs in Django console")
    else:
        print(f"\n❌ Webhook URL test failed: {new_url}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure Django server is running on 0.0.0.0:8000")
        print("2. Check firewall settings")
        print("3. Try using ngrok instead")

if __name__ == "__main__":
    main() 
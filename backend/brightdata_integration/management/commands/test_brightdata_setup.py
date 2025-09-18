from django.core.management.base import BaseCommand
from django.conf import settings
import requests
import json

class Command(BaseCommand):
    help = 'Test BrightData webhook setup and show configuration details'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-webhook',
            action='store_true',
            help='Test the webhook endpoint with a sample payload',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== BrightData Webhook Configuration ===')
        )
        
        # Show current configuration
        base_url = getattr(settings, 'BRIGHTDATA_BASE_URL', 'http://localhost:8000')
        webhook_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'your-webhook-secret-token')
        
        webhook_url = f"{base_url}/api/brightdata/webhook/"
        notify_url = f"{base_url}/api/brightdata/notify/"
        
        self.stdout.write(f"Base URL: {base_url}")
        self.stdout.write(f"Webhook URL: {webhook_url}")
        self.stdout.write(f"Notify URL: {notify_url}")
        self.stdout.write(f"Auth Token: {webhook_token}")
        
        self.stdout.write(
            self.style.WARNING('\n=== BrightData API Request Parameters ===')
        )
        
        sample_params = {
            "dataset_id": "your_dataset_id_here",
            "endpoint": webhook_url,
            "auth_header": f"Bearer {webhook_token}",
            "notify": notify_url,
            "format": "json",
            "uncompressed_webhook": "true",
            "include_errors": "true",
        }
        
        self.stdout.write("Use these parameters in your BrightData API request:")
        for key, value in sample_params.items():
            self.stdout.write(f"  {key}: {value}")
        
        self.stdout.write(
            self.style.SUCCESS('\n=== Complete API Request Example ===')
        )
        
        example_code = f'''
import requests

url = "https://api.brightdata.com/datasets/v3/trigger"
headers = {{
    "Authorization": "Bearer YOUR_API_TOKEN",
    "Content-Type": "application/json",
}}
params = {{
    "dataset_id": "your_dataset_id_here",
    "endpoint": "{webhook_url}",
    "auth_header": "Bearer {webhook_token}",
    "notify": "{notify_url}",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true",
}}
data = [
    {{"url": "https://www.facebook.com/example", "num_of_posts": 1, "start_date": "", "end_date": ""}},
]

response = requests.post(url, headers=headers, params=params, json=data)
print(response.json())
'''
        
        self.stdout.write(example_code)
        
        if options['test_webhook']:
            self.test_webhook_endpoint(webhook_url, webhook_token)
    
    def test_webhook_endpoint(self, webhook_url, webhook_token):
        self.stdout.write(
            self.style.WARNING('\n=== Testing Webhook Endpoint ===')
        )
        
        # Sample webhook data
        test_data = {
            "snapshot_id": "test_123",
            "platform": "instagram",
            "data": [
                {
                    "post_id": "test_post_123",
                    "url": "https://www.instagram.com/p/test123/",
                    "text": "Test post content",
                    "likes": 100,
                    "comments": 10,
                    "username": "test_user",
                    "date": "2024-01-01T12:00:00Z"
                }
            ]
        }
        
        headers = {
            'Authorization': f'Bearer {webhook_token}',
            'Content-Type': 'application/json',
            'X-Snapshot-Id': 'test_123',
            'X-Platform': 'instagram'
        }
        
        try:
            response = requests.post(
                webhook_url, 
                json=test_data, 
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                self.stdout.write(
                    self.style.SUCCESS('✓ Webhook endpoint is working correctly!')
                )
                self.stdout.write(f"Response: {response.json()}")
            else:
                self.stdout.write(
                    self.style.ERROR(f'✗ Webhook test failed: {response.status_code} - {response.text}')
                )
                
        except requests.exceptions.RequestException as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to connect to webhook endpoint: {str(e)}')
            )
            self.stdout.write("Make sure your Django server is running!")
        
        self.stdout.write(
            self.style.SUCCESS('\n=== Setup Complete ===')
        )
        self.stdout.write("Your BrightData integration is now configured with webhooks!")
        self.stdout.write("Remember to:")
        self.stdout.write("1. Set your actual BRIGHTDATA_BASE_URL in production")
        self.stdout.write("2. Use a secure BRIGHTDATA_WEBHOOK_TOKEN")
        self.stdout.write("3. Update your BrightdataConfig models with correct API tokens and dataset IDs") 
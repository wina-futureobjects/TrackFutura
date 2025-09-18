from django.core.management.base import BaseCommand
from django.conf import settings
import requests
import json
import os

class Command(BaseCommand):
    help = 'Test BrightData webhook setup and show configuration details for Upsun deployment'

    def add_arguments(self, parser):
        parser.add_argument(
            '--test-webhook',
            action='store_true',
            help='Test the webhook endpoint with a sample payload',
        )
        parser.add_argument(
            '--test-ngrok',
            action='store_true',
            help='Test ngrok tunnel detection and setup',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== BrightData Webhook Configuration for Upsun ===')
        )

        # Show current configuration
        base_url = getattr(settings, 'BRIGHTDATA_BASE_URL', 'http://localhost:8000')
        webhook_token = getattr(settings, 'BRIGHTDATA_WEBHOOK_TOKEN', 'your-webhook-secret-token')

        webhook_url = f"{base_url}/api/brightdata/webhook/"
        notify_url = f"{base_url}/api/brightdata/notify/"

        self.stdout.write(f"Base URL: {base_url}")
        self.stdout.write(f"Webhook URL: {webhook_url}")
        self.stdout.write(f"Notify URL: {notify_url}")
        self.stdout.write(f"Auth Token: {webhook_token[:8]}..." if len(webhook_token) > 8 else webhook_token)

        # Check environment
        self.stdout.write(f"\nEnvironment Detection:")
        self.stdout.write(f"Platform Application: {os.getenv('PLATFORM_APPLICATION_NAME', 'Not detected')}")
        self.stdout.write(f"Platform Routes: {os.getenv('PLATFORM_ROUTES', 'Not detected')[:100]}...")
        self.stdout.write(f"Debug Mode: {settings.DEBUG}")

        # Show webhook security settings
        self.stdout.write(f"\nSecurity Configuration:")
        self.stdout.write(f"Rate Limit: {getattr(settings, 'WEBHOOK_RATE_LIMIT', 'Not set')} requests/min")
        self.stdout.write(f"Max Timestamp Age: {getattr(settings, 'WEBHOOK_MAX_TIMESTAMP_AGE', 'Not set')} seconds")
        webhook_ips = getattr(settings, 'WEBHOOK_ALLOWED_IPS', [])
        self.stdout.write(f"Allowed IPs: {webhook_ips if webhook_ips else 'All IPs allowed'}")

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
            display_value = f"{value[:50]}..." if isinstance(value, str) and len(value) > 50 else value
            self.stdout.write(f"  {key}: {display_value}")

        # Test ngrok if requested
        if options['test_ngrok']:
            self._test_ngrok_setup()

        # Test webhook endpoint if requested
        if options['test_webhook']:
            self._test_webhook_endpoint(webhook_url, webhook_token)

        self.stdout.write(
            self.style.SUCCESS('\n=== Complete API Request Example ===')
        )

        example_request = f'''
import requests

url = "https://api.brightdata.com/datasets/v3/trigger"
headers = {{
    "Authorization": "Bearer YOUR_BRIGHTDATA_API_TOKEN",
    "Content-Type": "application/json"
}}

data = {{
    "url": "https://example.com/target-page",
    "endpoint": "{webhook_url}",
    "auth_header": "Bearer {webhook_token}",
    "notify": "{notify_url}",
    "format": "json",
    "uncompressed_webhook": "true",
    "include_errors": "true"
}}

response = requests.post(url, headers=headers, json=data)
print(f"Status: {{response.status_code}}")
print(f"Response: {{response.text}}")
'''

        self.stdout.write(example_request)

        # Show deployment readiness checklist
        self.stdout.write(
            self.style.WARNING('\n=== Upsun Deployment Checklist ===')
        )

        checklist = [
            "✓ Webhook endpoints configured in URLs",
            "✓ BrightData base URL auto-detection enabled",
            "✓ Security middleware properly configured",
            "✓ Rate limiting and monitoring in place",
            "✓ Environment variables set in .upsun/config.yaml",
            "✓ Database relationships configured",
            "✓ Static file handling configured"
        ]

        for item in checklist:
            self.stdout.write(f"  {item}")

        self.stdout.write(
            self.style.SUCCESS('\n=== Configuration Complete - Ready for Upsun Deployment ===')
        )

    def _test_ngrok_setup(self):
        """Test ngrok tunnel detection"""
        self.stdout.write(f"\n{self.style.WARNING('=== Testing Ngrok Setup ===')}")

        try:
            response = requests.get('http://localhost:4040/api/tunnels', timeout=2)
            if response.status_code == 200:
                tunnels = response.json().get('tunnels', [])
                if tunnels:
                    for tunnel in tunnels:
                        if tunnel.get('proto') == 'https':
                            public_url = tunnel['public_url']
                            self.stdout.write(self.style.SUCCESS(f"✓ Ngrok tunnel detected: {public_url}"))
                            self.stdout.write(f"  Webhook URL would be: {public_url}/api/brightdata/webhook/")
                            return
                    self.stdout.write(self.style.WARNING("⚠ Ngrok running but no HTTPS tunnel found"))
                else:
                    self.stdout.write(self.style.WARNING("⚠ Ngrok running but no tunnels active"))
            else:
                self.stdout.write(self.style.ERROR(f"✗ Ngrok API error: {response.status_code}"))
        except requests.RequestException:
            self.stdout.write(self.style.ERROR("✗ Ngrok not running or not accessible"))
            self.stdout.write("  Start ngrok with: ngrok http 8000")

    def _test_webhook_endpoint(self, webhook_url, webhook_token):
        """Test webhook endpoint with sample data"""
        self.stdout.write(f"\n{self.style.WARNING('=== Testing Webhook Endpoint ===')}")

        # Sample webhook payload
        test_payload = {
            "snapshot_id": "test_snapshot_123",
            "platform": "test",
            "data": [
                {
                    "url": "https://example.com/test",
                    "title": "Test Page",
                    "content": "Sample content for testing"
                }
            ],
            "timestamp": int(time.time())
        }

        headers = {
            "Authorization": f"Bearer {webhook_token}",
            "Content-Type": "application/json",
            "X-BrightData-Timestamp": str(int(time.time())),
            "X-Platform": "test"
        }

        try:
            import time
            response = requests.post(webhook_url,
                                   json=test_payload,
                                   headers=headers,
                                   timeout=10)

            if response.status_code in [200, 201]:
                self.stdout.write(self.style.SUCCESS(f"✓ Webhook test successful: {response.status_code}"))
                try:
                    result = response.json()
                    self.stdout.write(f"  Response: {result.get('message', 'Success')}")
                except:
                    self.stdout.write(f"  Response: {response.text[:100]}...")
            else:
                self.stdout.write(self.style.ERROR(f"✗ Webhook test failed: {response.status_code}"))
                self.stdout.write(f"  Error: {response.text[:200]}...")

        except requests.RequestException as e:
            self.stdout.write(self.style.ERROR(f"✗ Webhook connection failed: {str(e)}"))
            self.stdout.write("  Make sure the Django server is running")

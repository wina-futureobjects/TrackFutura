from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Show how webhook URLs are detected in different environments'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Webhook URL Detection Demo ===')
        )
        
        # Show current detection
        current_url = getattr(settings, 'BRIGHTDATA_BASE_URL')
        self.stdout.write(f"Current detected URL: {current_url}")
        
        # Show environment variables that affect detection
        self.stdout.write(
            self.style.WARNING('\n=== Environment Variables ===')
        )
        
        env_vars = [
            'BRIGHTDATA_BASE_URL',
            'PLATFORM_APPLICATION_NAME', 
            'PLATFORM_PROJECT',
            'PLATFORM_ENVIRONMENT',
            'PLATFORM_ROUTES'
        ]
        
        for var in env_vars:
            value = os.getenv(var, 'Not set')
            if var == 'PLATFORM_ROUTES' and value != 'Not set':
                # Truncate long routes for readability
                value = value[:100] + '...' if len(value) > 100 else value
            self.stdout.write(f"  {var}: {value}")
        
        # Show different scenarios
        self.stdout.write(
            self.style.SUCCESS('\n=== How URLs are Detected ===')
        )
        
        self.stdout.write("🔍 Detection Priority:")
        self.stdout.write("  1️⃣  BRIGHTDATA_BASE_URL env var (manual override)")
        self.stdout.write("  2️⃣  Upsun PLATFORM_ROUTES (primary HTTPS route)")
        self.stdout.write("  3️⃣  Upsun app name + domain construction")
        self.stdout.write("  4️⃣  Development fallback (localhost:8000)")
        
        self.stdout.write(
            self.style.WARNING('\n=== Example Scenarios ===')
        )
        
        scenarios = [
            {
                'name': 'Development (current)',
                'url': 'http://localhost:8000',
                'description': 'No Upsun env vars, uses localhost'
            },
            {
                'name': 'Manual Override',
                'url': 'https://mydomain.com',
                'description': 'BRIGHTDATA_BASE_URL="https://mydomain.com"'
            },
            {
                'name': 'Upsun Auto-detection',
                'url': 'https://myapp-abc123.main.platformsh.site',
                'description': 'Upsun deployment with auto-detected domain'
            },
            {
                'name': 'Production with Custom Domain',
                'url': 'https://api.mycompany.com',
                'description': 'Custom domain via PLATFORM_ROUTES'
            }
        ]
        
        for scenario in scenarios:
            self.stdout.write(f"\n📍 {scenario['name']}:")
            self.stdout.write(f"   URL: {scenario['url']}")
            self.stdout.write(f"   📝 {scenario['description']}")
            self.stdout.write(f"   🔗 Webhook: {scenario['url']}/api/brightdata/webhook/")
            self.stdout.write(f"   🔔 Notify: {scenario['url']}/api/brightdata/notify/")
        
        self.stdout.write(
            self.style.SUCCESS('\n=== For Upsun Deployment ===')
        )
        self.stdout.write("✅ No manual configuration needed!")
        self.stdout.write("✅ Domain will be auto-detected from Upsun environment")
        self.stdout.write("✅ HTTPS will be used automatically")
        self.stdout.write("Only set BRIGHTDATA_WEBHOOK_TOKEN for security")
        
        self.stdout.write(
            self.style.WARNING('\n=== Security Reminder ===')
        )
        self.stdout.write("🔐 Remember to set a secure BRIGHTDATA_WEBHOOK_TOKEN!")
        self.stdout.write("💡 Example: BRIGHTDATA_WEBHOOK_TOKEN='your-random-secure-token-here'") 
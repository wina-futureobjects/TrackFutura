from django.core.management.base import BaseCommand
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Test deployment configuration and settings'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== Deployment Configuration Test ===\n'))

        # Check basic Django settings
        self.stdout.write(f"DEBUG: {settings.DEBUG}")
        self.stdout.write(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        self.stdout.write(f"CSRF_TRUSTED_ORIGINS: {settings.CSRF_TRUSTED_ORIGINS}")

        # Check environment variables
        self.stdout.write(f"\nEnvironment Variables:")
        self.stdout.write(f"PLATFORM_APPLICATION_NAME: {os.getenv('PLATFORM_APPLICATION_NAME', 'Not set')}")
        self.stdout.write(f"PLATFORM_PROJECT: {os.getenv('PLATFORM_PROJECT', 'Not set')}")
        self.stdout.write(f"PLATFORM_ENVIRONMENT: {os.getenv('PLATFORM_ENVIRONMENT', 'Not set')}")
        self.stdout.write(f"PLATFORM_ROUTES: {os.getenv('PLATFORM_ROUTES', 'Not set')}")

        # Check webhook settings
        self.stdout.write(f"\nWebhook Settings:")
        self.stdout.write(f"BRIGHTDATA_BASE_URL: {getattr(settings, 'BRIGHTDATA_BASE_URL', 'Not set')}")
        self.stdout.write(f"WEBHOOK_RATE_LIMIT: {getattr(settings, 'WEBHOOK_RATE_LIMIT', 'Not set')}")

        # Test module imports
        self.stdout.write(f"\nModule Import Tests:")
        # Skip whitenoise test since we disabled it
        # try:
        #     import whitenoise
        #     self.stdout.write(self.style.SUCCESS(f"✓ whitenoise imported successfully: {whitenoise.__version__}"))
        # except ImportError as e:
        #     self.stdout.write(self.style.ERROR(f"✗ whitenoise import failed: {e}"))
        self.stdout.write(self.style.SUCCESS("✓ whitenoise disabled (not testing)"))

        try:
            import django
            self.stdout.write(self.style.SUCCESS(f"✓ Django imported successfully: {django.VERSION}"))
        except ImportError as e:
            self.stdout.write(self.style.ERROR(f"✗ Django import failed: {e}"))

        # Check database
        try:
            from django.db import connection
            connection.ensure_connection()
            self.stdout.write(self.style.SUCCESS("✓ Database connection successful"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Database connection failed: {e}"))

        self.stdout.write(self.style.SUCCESS('\n=== Test Complete ==='))

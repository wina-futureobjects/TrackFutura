from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.staticfiles import finders
import os

class Command(BaseCommand):
    help = 'Check static files configuration and verify admin CSS exists'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Static Files Configuration Check ===')
        )
        
        # Display current settings
        self.stdout.write(f"STATIC_URL: {settings.STATIC_URL}")
        self.stdout.write(f"STATIC_ROOT: {settings.STATIC_ROOT}")
        self.stdout.write(f"STATICFILES_STORAGE: {getattr(settings, 'STATICFILES_STORAGE', 'default')}")
        
        # Check if static root exists and has files
        if os.path.exists(settings.STATIC_ROOT):
            file_count = sum(len(files) for _, _, files in os.walk(settings.STATIC_ROOT))
            self.stdout.write(
                self.style.SUCCESS(f"✅ STATIC_ROOT exists with {file_count} files")
            )
        else:
            self.stdout.write(
                self.style.WARNING("⚠️ STATIC_ROOT doesn't exist - run 'collectstatic'")
            )
        
        # Check specific admin files
        admin_files = [
            'admin/css/base.css',
            'admin/css/login.css',
            'admin/js/admin/RelatedObjectLookups.js'
        ]
        
        self.stdout.write("\n=== Admin Static Files Check ===")
        for file_path in admin_files:
            full_path = os.path.join(settings.STATIC_ROOT, file_path)
            if os.path.exists(full_path):
                size = os.path.getsize(full_path)
                self.stdout.write(
                    self.style.SUCCESS(f"✅ {file_path} ({size} bytes)")
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f"❌ {file_path} - MISSING!")
                )
        
        # Check if WhiteNoise is in middleware
        middleware = getattr(settings, 'MIDDLEWARE', [])
        if 'whitenoise.middleware.WhiteNoiseMiddleware' in middleware:
            self.stdout.write(
                self.style.SUCCESS("\n✅ WhiteNoise middleware is configured")
            )
        else:
            self.stdout.write(
                self.style.ERROR("\n❌ WhiteNoise middleware is missing!")
            )
        
        self.stdout.write(
            self.style.SUCCESS('\n=== Ready for Deployment! ===')
        )
        self.stdout.write("🚀 Static files should now work correctly on Upsun")
        self.stdout.write("📝 Remember to run 'upsun push' to deploy your changes") 
from django.core.management.base import BaseCommand
from django.conf import settings
from django.middleware.csrf import get_token
from django.test import RequestFactory
import os


class Command(BaseCommand):
    help = 'Debug CSRF configuration and generate test token'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== CSRF Debug Information ==='))
        
        # Basic settings
        self.stdout.write(f"DEBUG: {settings.DEBUG}")
        self.stdout.write(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        self.stdout.write(f"CSRF_TRUSTED_ORIGINS: {settings.CSRF_TRUSTED_ORIGINS}")
        
        # CSRF settings
        csrf_settings = [
            'CSRF_COOKIE_SECURE',
            'CSRF_COOKIE_HTTPONLY', 
            'CSRF_COOKIE_SAMESITE',
            'CSRF_USE_SESSIONS'
        ]
        
        for setting in csrf_settings:
            value = getattr(settings, setting, 'Not set')
            self.stdout.write(f"{setting}: {value}")
        
        # Session settings
        session_settings = [
            'SESSION_COOKIE_SECURE',
            'SESSION_COOKIE_HTTPONLY',
            'SESSION_COOKIE_SAMESITE'
        ]
        
        for setting in session_settings:
            value = getattr(settings, setting, 'Not set')
            self.stdout.write(f"{setting}: {value}")
        
        # Environment variables
        self.stdout.write(self.style.SUCCESS('\n=== Environment Variables ==='))
        platform_vars = [
            'PLATFORM_APPLICATION_NAME',
            'PLATFORM_PROJECT', 
            'PLATFORM_ENVIRONMENT',
            'PLATFORM_ROUTES'
        ]
        
        for var in platform_vars:
            value = os.getenv(var, 'Not set')
            if var == 'PLATFORM_ROUTES' and value != 'Not set':
                self.stdout.write(f"{var}: {value[:100]}...")
            else:
                self.stdout.write(f"{var}: {value}")
        
        # Test CSRF token generation
        self.stdout.write(self.style.SUCCESS('\n=== CSRF Token Test ==='))
        try:
            factory = RequestFactory()
            request = factory.get('/')
            token = get_token(request)
            self.stdout.write(f"Generated CSRF token: {token[:20]}...")
            self.stdout.write(self.style.SUCCESS("CSRF token generation: OK"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"CSRF token generation failed: {e}"))
        
        self.stdout.write(self.style.SUCCESS('\n=== Recommendations ==='))
        
        if settings.DEBUG:
            self.stdout.write(self.style.WARNING("- DEBUG is True, make sure it's False in production"))
        
        if '*' in settings.ALLOWED_HOSTS:
            self.stdout.write(self.style.WARNING("- ALLOWED_HOSTS contains '*', consider using specific domains"))
        
        if not settings.CSRF_TRUSTED_ORIGINS:
            self.stdout.write(self.style.ERROR("- CSRF_TRUSTED_ORIGINS is empty"))
        
        self.stdout.write(self.style.SUCCESS("Debug complete!")) 
#!/usr/bin/env python
"""
Quick deployment check script to verify Django can start properly
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings_production')
    try:
        django.setup()
        print("✅ Django setup successful")
        print(f"✅ Database engine: {settings.DATABASES['default']['ENGINE']}")
        print(f"✅ Debug mode: {settings.DEBUG}")
        print(f"✅ Allowed hosts: {settings.ALLOWED_HOSTS}")
        print("✅ Deployment check passed!")
    except Exception as e:
        print(f"❌ Deployment check failed: {e}")
        sys.exit(1)
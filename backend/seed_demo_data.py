#!/usr/bin/env python
"""
Simple script to seed demo data for Track Futura
Run this after setting up your Django project and running migrations.

Usage:
    python seed_demo_data.py              # Create demo data
    python seed_demo_data.py --reset      # Reset and create fresh demo data
    python seed_demo_data.py --users 10   # Create with 10 users instead of default 15
"""

import os
import sys
import django

# Setup Django environment
if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    
    from django.core.management import execute_from_command_line
    
    # Build command arguments
    args = ['manage.py', 'seed_demo_data']
    
    # Pass through command line arguments
    if len(sys.argv) > 1:
        args.extend(sys.argv[1:])
    
    print("🌱 Starting demo data seeding...")
    print("="*50)
    
    try:
        execute_from_command_line(args)
        print("\n✅ Demo data seeding completed successfully!")
        print("\n📋 You can now:")
        print("   • Login as superadmin/admin123! for full access")
        print("   • Login as tenantadmin/admin123! for organization management")
        print("   • Use any demo user with password demo123!")
        print("   • Explore the created organizations and projects")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        print("Make sure you have run migrations first: python manage.py migrate")
        sys.exit(1) 
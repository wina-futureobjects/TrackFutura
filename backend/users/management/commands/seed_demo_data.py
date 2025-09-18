from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **options):
        # Check if we already have data
        if User.objects.count() > 1:
            self.stdout.write(
                self.style.WARNING('Database already has data. Skipping seeding.')
            )
            return

        try:
            # Load the sample data
            fixture_path = 'fixtures/sample_data_export.json'
            if os.path.exists(fixture_path):
                call_command('loaddata', fixture_path)
                self.stdout.write(
                    self.style.SUCCESS('Successfully loaded demo data')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('No fixture file found. Creating basic demo data...')
                )
                # Create a basic admin user
                User.objects.create_superuser(
                    username='admin',
                    email='admin@trackfutura.com',
                    password='admin123'
                )
                self.stdout.write(
                    self.style.SUCCESS('Created basic admin user (admin/admin123)')
                )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error loading demo data: {str(e)}')
            )

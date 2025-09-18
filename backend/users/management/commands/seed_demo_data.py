from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.contrib.auth.models import User
import os

class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **options):
        # Check if we already have demo data (look for specific demo users)
        from users.models import UserProfile
        demo_profiles = UserProfile.objects.filter(user__email__icontains='demo')

        if demo_profiles.exists():
            self.stdout.write(
                self.style.WARNING('Demo data already exists. Skipping seeding.')
            )
            return

        self.stdout.write('Loading demo data for TrackFutura...')

        try:
            # Try multiple possible paths for the fixture file
            possible_paths = [
                'fixtures/sample_data_export.json',
                'backend/fixtures/sample_data_export.json',
                '/app/backend/fixtures/sample_data_export.json',
                os.path.join(os.path.dirname(__file__), '..', '..', '..', 'fixtures', 'sample_data_export.json'),
            ]

            fixture_path = None
            for path in possible_paths:
                if os.path.exists(path):
                    fixture_path = path
                    break

            if fixture_path:
                self.stdout.write(f'Loading fixture from: {fixture_path}')
                call_command('loaddata', fixture_path)
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully loaded demo data from {fixture_path}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'No fixture file found in any of these paths: {possible_paths}')
                )
                self.stdout.write(
                    self.style.WARNING('Creating basic demo data instead...')
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

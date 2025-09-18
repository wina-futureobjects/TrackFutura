from django.core.management.base import BaseCommand
from track_accounts.models import TrackSource
from users.models import Project

class Command(BaseCommand):
    help = 'Create test TrackSource data for debugging'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            default=1,
            help='Project ID to associate the test sources with'
        )

    def handle(self, *args, **options):
        project_id = options['project_id']
        
        # Get or create project
        project, created = Project.objects.get_or_create(
            id=project_id,
            defaults={
                'name': f'Test Project {project_id}',
                'description': 'Test project for debugging'
            }
        )
        
        if created:
            self.stdout.write(f'Created project: {project.name}')
        else:
            self.stdout.write(f'Using existing project: {project.name}')

        # Create test TrackSource entries
        test_sources = [
            {
                'name': 'Test Company 1',
                'facebook_link': 'https://www.facebook.com/testcompany1',
                'instagram_link': 'https://www.instagram.com/testcompany1',
                'linkedin_link': 'https://www.linkedin.com/company/testcompany1',
                'tiktok_link': 'https://www.tiktok.com/@testcompany1',
                'other_social_media': 'https://twitter.com/testcompany1'
            },
            {
                'name': 'Test Company 2',
                'facebook_link': 'https://www.facebook.com/testcompany2',
                'instagram_link': None,
                'linkedin_link': 'https://www.linkedin.com/company/testcompany2',
                'tiktok_link': None,
                'other_social_media': None
            },
            {
                'name': 'Test Company 3',
                'facebook_link': None,
                'instagram_link': 'https://www.instagram.com/testcompany3',
                'linkedin_link': None,
                'tiktok_link': 'https://www.tiktok.com/@testcompany3',
                'other_social_media': None
            }
        ]

        created_count = 0
        for source_data in test_sources:
            source, created = TrackSource.objects.get_or_create(
                name=source_data['name'],
                project=project,
                defaults=source_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'Created source: {source.name}')
            else:
                self.stdout.write(f'Source already exists: {source.name}')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} new test sources for project {project_id}'
            )
        )
        
        # Show total count
        total_sources = TrackSource.objects.filter(project=project).count()
        self.stdout.write(f'Total sources in project {project_id}: {total_sources}') 
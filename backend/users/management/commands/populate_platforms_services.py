from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import Platform, Service, PlatformService

class Command(BaseCommand):
    help = 'Populate initial platforms and services data'

    def handle(self, *args, **options):
        self.stdout.write('Creating platforms and services...')
        
        # Get or create superuser for created_by field
        superuser = User.objects.filter(is_superuser=True).first()
        if not superuser:
            self.stdout.write(self.style.ERROR('No superuser found. Please create a superuser first.'))
            return
        
        # Create Services
        services_data = [
            {
                'name': 'posts',
                'display_name': 'Posts',
                'description': 'Regular posts and content',
                'icon_name': 'article'
            },
            {
                'name': 'reels',
                'display_name': 'Reels',
                'description': 'Short-form video content',
                'icon_name': 'video_library'
            },
            {
                'name': 'comments',
                'display_name': 'Comments',
                'description': 'Comments on posts and content',
                'icon_name': 'comment'
            },
            {
                'name': 'profiles',
                'display_name': 'Profiles',
                'description': 'User profile information',
                'icon_name': 'person'
            }
        ]
        
        services = {}
        for service_data in services_data:
            service, created = Service.objects.get_or_create(
                name=service_data['name'],
                defaults=service_data
            )
            services[service.name] = service
            if created:
                self.stdout.write(f'Created service: {service.display_name}')
            else:
                self.stdout.write(f'Service already exists: {service.display_name}')
        
        # Create Platforms
        platforms_data = [
            {
                'name': 'instagram',
                'display_name': 'Instagram',
                'description': 'Instagram social media platform',
                'icon_name': 'camera_alt',
                'color': '#E4405F'
            },
            {
                'name': 'facebook',
                'display_name': 'Facebook',
                'description': 'Facebook social media platform',
                'icon_name': 'facebook',
                'color': '#1877F2'
            },
            {
                'name': 'linkedin',
                'display_name': 'LinkedIn',
                'description': 'LinkedIn professional network',
                'icon_name': 'work',
                'color': '#0A66C2'
            },
            {
                'name': 'tiktok',
                'display_name': 'TikTok',
                'description': 'TikTok short-form video platform',
                'icon_name': 'music_video',
                'color': '#000000'
            }
        ]
        
        platforms = {}
        for platform_data in platforms_data:
            platform, created = Platform.objects.get_or_create(
                name=platform_data['name'],
                defaults={**platform_data, 'created_by': superuser}
            )
            platforms[platform.name] = platform
            if created:
                self.stdout.write(f'Created platform: {platform.display_name}')
            else:
                self.stdout.write(f'Platform already exists: {platform.display_name}')
        
        # Create Platform-Service combinations
        platform_services_data = [
            # Instagram supports all services
            ('instagram', ['posts', 'reels', 'comments', 'profiles']),
            # Facebook supports posts, reels, and comments
            ('facebook', ['posts', 'reels', 'comments']),
            # LinkedIn supports posts and profiles
            ('linkedin', ['posts', 'profiles']),
            # TikTok supports posts and comments
            ('tiktok', ['posts', 'comments'])
        ]
        
        for platform_name, service_names in platform_services_data:
            platform = platforms.get(platform_name)
            if not platform:
                self.stdout.write(self.style.WARNING(f'Platform {platform_name} not found'))
                continue
                
            for service_name in service_names:
                service = services.get(service_name)
                if not service:
                    self.stdout.write(self.style.WARNING(f'Service {service_name} not found'))
                    continue
                
                platform_service, created = PlatformService.objects.get_or_create(
                    platform=platform,
                    service=service,
                    defaults={
                        'is_enabled': True,
                        'description': f'{platform.display_name} {service.display_name}',
                        'created_by': superuser
                    }
                )
                
                if created:
                    self.stdout.write(f'Created platform-service: {platform.display_name} - {service.display_name}')
                else:
                    self.stdout.write(f'Platform-service already exists: {platform.display_name} - {service.display_name}')
        
        self.stdout.write(self.style.SUCCESS('Successfully populated platforms and services!'))
        
        # Display summary
        self.stdout.write('\nSummary:')
        self.stdout.write(f'Platforms: {Platform.objects.count()}')
        self.stdout.write(f'Services: {Service.objects.count()}')
        self.stdout.write(f'Platform-Service combinations: {PlatformService.objects.count()}')
        self.stdout.write(f'Enabled platform-service combinations: {PlatformService.objects.filter(is_enabled=True, platform__is_enabled=True).count()}') 
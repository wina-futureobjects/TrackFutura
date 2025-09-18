from django.core.management.base import BaseCommand
from django.db import transaction
from track_accounts.models import UnifiedRunFolder, ServiceFolderIndex


class Command(BaseCommand):
    help = "Reparent service folders under platform folders and populate ServiceFolderIndex"

    def handle(self, *args, **options):
        with transaction.atomic():
            runs = UnifiedRunFolder.objects.filter(folder_type='run')
            total_platform_created = 0
            total_reparented = 0
            for run in runs:
                # Collect platforms used by existing service folders
                service_qs = UnifiedRunFolder.objects.filter(parent_folder=run, folder_type='service')
                platforms = set(service_qs.values_list('platform_code', flat=True))
                # Create platform folders if missing
                platform_map = {}
                for platform in sorted(filter(None, platforms)):
                    platform_folder, created = UnifiedRunFolder.objects.get_or_create(
                        parent_folder=run,
                        folder_type='platform',
                        platform_code=platform,
                        defaults={
                            'name': platform.title(),
                            'description': f'Platform folder for {platform}',
                            'project': run.project,
                            'scraping_run': run.scraping_run,
                            'category': 'posts',
                        }
                    )
                    platform_map[platform] = platform_folder
                    if created:
                        total_platform_created += 1

                # Reparent each service under its platform folder and index it
                for service in service_qs:
                    parent_platform = platform_map.get(service.platform_code)
                    if parent_platform and service.parent_folder_id != parent_platform.id:
                        service.parent_folder = parent_platform
                        service.save(update_fields=['parent_folder'])
                        total_reparented += 1
                    # Upsert index
                    if service.platform_code and service.service_code:
                        ServiceFolderIndex.objects.update_or_create(
                            scraping_run=run.scraping_run,
                            platform_code=service.platform_code,
                            service_code=service.service_code,
                            defaults={'folder': service}
                        )
            self.stdout.write(self.style.SUCCESS(
                f"Done. Platform created: {total_platform_created}, services reparented: {total_reparented}"
            ))



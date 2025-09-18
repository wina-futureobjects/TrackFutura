from django.core.management.base import BaseCommand
from django.utils import timezone
from brightdata_integration.models import ScraperRequest, BrightdataConfig
from instagram_data.models import Folder
import time

class Command(BaseCommand):
    help = 'Create emergency ScraperRequest for latest Instagram folder'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder-id',
            type=int,
            help='Specific folder ID to create ScraperRequest for',
        )
        parser.add_argument(
            '--request-id',
            type=str,
            help='Specific request ID to use',
        )

    def handle(self, *args, **options):
        self.stdout.write("🔧 Creating Emergency ScraperRequest...")

        try:
            # Get or create BrightData config
            config, created = BrightdataConfig.objects.get_or_create(
                name='Emergency Config',
                defaults={
                    'config_id': 'emergency_config',
                    'platform': 'instagram',
                    'dataset_id': 'gd_l7q7dkf244hwl2a9e',  # Default Instagram dataset
                    'api_token': 'your-api-token-here'
                }
            )

            if created:
                self.stdout.write(f"✅ Created new BrightData config: {config.name}")
            else:
                self.stdout.write(f"✅ Using existing config: {config.name}")

            # Get folder
            if options['folder_id']:
                folder = Folder.objects.get(id=options['folder_id'])
                self.stdout.write(f"📁 Using specified folder: {folder.name} (ID: {folder.id})")
            else:
                folder = Folder.objects.order_by('-id').first()
                if not folder:
                    self.stdout.write(self.style.ERROR("❌ No folders found!"))
                    return
                self.stdout.write(f"📁 Using latest folder: {folder.name} (ID: {folder.id})")

            # Generate request_id
            if options['request_id']:
                request_id = options['request_id']
            else:
                request_id = f"emergency_fix_{int(time.time())}"

            # Check if ScraperRequest already exists
            existing = ScraperRequest.objects.filter(folder=folder, platform='instagram').first()
            if existing:
                self.stdout.write(f"⚠️  ScraperRequest already exists for this folder:")
                self.stdout.write(f"   ID: {existing.id}")
                self.stdout.write(f"   Request ID: {existing.request_id}")
                self.stdout.write(f"   Status: {existing.status}")

                # Update the existing one
                existing.request_id = request_id
                existing.status = 'pending'
                existing.save()
                self.stdout.write(f"✅ Updated existing ScraperRequest with new request_id")
                scraper_request = existing
            else:
                # Create new ScraperRequest
                scraper_request = ScraperRequest.objects.create(
                    config=config,
                    folder=folder,
                    request_id=request_id,
                    platform='instagram',
                    status='pending'
                )
                self.stdout.write(f"✅ Created new ScraperRequest")

            # Display results
            self.stdout.write(f"\n📊 SCRAPER REQUEST DETAILS:")
            self.stdout.write(f"   ID: {scraper_request.id}")
            self.stdout.write(f"   Request ID: {scraper_request.request_id}")
            self.stdout.write(f"   Folder: {scraper_request.folder.name}")
            self.stdout.write(f"   Platform: {scraper_request.platform}")
            self.stdout.write(f"   Status: {scraper_request.status}")

            self.stdout.write(f"\n🎯 BRIGHTDATA CONFIGURATION:")
            self.stdout.write(f"   Update your BrightData webhook settings:")
            self.stdout.write(f"   - Webhook URL: https://api.upsun-deployment-xiwfmii-inhoolfrqniuu.eu-5.platformsh.site/api/brightdata/webhook/")
            self.stdout.write(f"   - X-Platform: instagram")
            self.stdout.write(f"   - X-Snapshot-Id: {scraper_request.request_id}")

            self.stdout.write(f"\n✅ Emergency ScraperRequest created successfully!")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            import traceback
            self.stdout.write(traceback.format_exc())

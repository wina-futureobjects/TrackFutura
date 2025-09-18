from django.core.management.base import BaseCommand
from brightdata_integration.models import BrightdataConfig

class Command(BaseCommand):
    help = 'Check BrightData configurations and available platform choices'

    def handle(self, *args, **options):
        self.stdout.write("=== Current BrightData Configurations ===")
        configs = BrightdataConfig.objects.all()
        
        if configs.exists():
            for config in configs:
                active_status = "✓ Active" if config.is_active else "  Inactive"
                self.stdout.write(f"  {active_status} | {config.platform}: {config.name}")
        else:
            self.stdout.write("  No configurations found.")

        self.stdout.write("\n=== Available Platform Choices ===")
        for choice_value, choice_display in BrightdataConfig.PLATFORM_CHOICES:
            # Check if this platform has a configuration
            has_config = configs.filter(platform=choice_value).exists()
            status = "✓" if has_config else "✗"
            self.stdout.write(f"  {status} {choice_value}: {choice_display}")

        self.stdout.write(f"\nSummary:")
        self.stdout.write(f"  - Configurations in database: {configs.count()}")
        self.stdout.write(f"  - Available platform choices: {len(BrightdataConfig.PLATFORM_CHOICES)}")
        
        missing_platforms = []
        for choice_value, choice_display in BrightdataConfig.PLATFORM_CHOICES:
            if not configs.filter(platform=choice_value).exists():
                missing_platforms.append(f"{choice_value} ({choice_display})")
        
        if missing_platforms:
            self.stdout.write(f"\nMissing configurations for:")
            for platform in missing_platforms:
                self.stdout.write(f"  - {platform}")
            self.stdout.write("\nYou can create these through the Django admin interface.")
        else:
            self.stdout.write("\n✓ All platform types have configurations!") 
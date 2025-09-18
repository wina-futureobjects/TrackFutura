from django.core.management.base import BaseCommand
from brightdata_integration.models import BrightdataConfig

class Command(BaseCommand):
    help = 'Migrate old BrightData configurations to new content-specific format and create missing ones'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write("=== DRY RUN MODE ===")
        
        self.stdout.write("=== Migrating BrightData Configurations ===")
        
        # Check for old configurations that need to be migrated
        old_configs = {
            'facebook': 'facebook_posts',
            'instagram': 'instagram_posts', 
            'linkedin': 'linkedin',  # linkedin stays the same
            'tiktok': 'tiktok',      # tiktok stays the same
        }
        
        migrated_count = 0
        for old_platform, new_platform in old_configs.items():
            old_config = BrightdataConfig.objects.filter(platform=old_platform).first()
            if old_config and old_platform != new_platform:
                self.stdout.write(f"  Found old config: {old_platform} -> {new_platform}")
                if not dry_run:
                    # Update the platform name
                    old_config.platform = new_platform
                    old_config.save()
                    migrated_count += 1
                    self.stdout.write(f"    ✓ Migrated {old_platform} to {new_platform}")
                else:
                    self.stdout.write(f"    Would migrate {old_platform} to {new_platform}")
        
        # Create missing configurations based on existing ones
        self.stdout.write("\n=== Creating Missing Configurations ===")
        created_count = 0
        
        # Mapping of which configs to create based on existing ones
        creation_mapping = {
            'facebook_posts': ['facebook_reels', 'facebook_comments'],
            'instagram_posts': ['instagram_reels', 'instagram_comments'],
        }
        
        for base_platform, variants in creation_mapping.items():
            base_config = BrightdataConfig.objects.filter(platform=base_platform).first()
            if base_config:
                for variant_platform in variants:
                    if not BrightdataConfig.objects.filter(platform=variant_platform).exists():
                        if not dry_run:
                            new_config = BrightdataConfig.objects.create(
                                name=f"{base_config.name} - {variant_platform.split('_')[1].title()}",
                                platform=variant_platform,
                                api_token=base_config.api_token,
                                dataset_id=base_config.dataset_id,
                                is_active=False,  # Create as inactive by default
                                description=f"Auto-created from {base_platform} configuration"
                            )
                            created_count += 1
                            self.stdout.write(f"    ✓ Created {variant_platform} configuration")
                        else:
                            self.stdout.write(f"    Would create {variant_platform} configuration")
                    else:
                        self.stdout.write(f"    {variant_platform} already exists")
            else:
                self.stdout.write(f"    No base config found for {base_platform}, skipping variants")
        
        # Show final status
        self.stdout.write(f"\n=== Summary ===")
        if not dry_run:
            self.stdout.write(f"  - Migrated configurations: {migrated_count}")
            self.stdout.write(f"  - Created new configurations: {created_count}")
            self.stdout.write(f"\nRun 'python manage.py check_brightdata_configs' to see the updated status.")
        else:
            self.stdout.write(f"  - Would migrate: {migrated_count} configurations")
            self.stdout.write(f"  - Would create: varies based on existing configs")
            self.stdout.write(f"\nRun without --dry-run to apply changes.") 
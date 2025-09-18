from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import Project
from instagram_data.models import Folder as InstagramFolder
from facebook_data.models import Folder as FacebookFolder
from tiktok_data.models import Folder as TikTokFolder
from linkedin_data.models import Folder as LinkedInFolder

class Command(BaseCommand):
    help = 'Fix folders that are missing project associations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes',
        )
        parser.add_argument(
            '--project-id',
            type=int,
            help='Specific project ID to assign orphaned folders to',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_project_id = options['project_id']
        
        self.stdout.write("=== FIXING ORPHANED FOLDERS ===\n")
        
        # Get target project
        if specific_project_id:
            try:
                target_project = Project.objects.get(id=specific_project_id)
                self.stdout.write(f"Using specified project: {target_project.name} (ID: {target_project.id})")
            except Project.DoesNotExist:
                self.stderr.write(f"Project with ID {specific_project_id} does not exist!")
                return
        else:
            projects = Project.objects.all()
            if not projects.exists():
                if dry_run:
                    self.stdout.write("Would create a default project (dry-run mode)")
                    return
                else:
                    self.stdout.write("No projects found! Creating a default project...")
                    target_project = Project.objects.create(
                        name="Default Project",
                        description="Automatically created project for orphaned folders"
                    )
                    self.stdout.write(f"Created default project: {target_project.name} (ID: {target_project.id})")
            else:
                target_project = projects.first()
                self.stdout.write(f"Using first available project: {target_project.name} (ID: {target_project.id})")
        
        fixed_count = 0
        
        # Count all orphaned folders first
        orphaned_counts = {
            'instagram': InstagramFolder.objects.filter(project_id__isnull=True).count(),
            'facebook': FacebookFolder.objects.filter(project_id__isnull=True).count(),
            'tiktok': TikTokFolder.objects.filter(project_id__isnull=True).count(),
            'linkedin': LinkedInFolder.objects.filter(project_id__isnull=True).count(),
        }
        
        total_orphaned = sum(orphaned_counts.values())
        
        if total_orphaned == 0:
            self.stdout.write(self.style.SUCCESS("No orphaned folders found. All folders have proper project associations."))
            return
        
        self.stdout.write(f"\nFound orphaned folders:")
        for platform, count in orphaned_counts.items():
            if count > 0:
                self.stdout.write(f"  - {platform.title()}: {count}")
        
        if dry_run:
            self.stdout.write(f"\nDRY RUN: Would fix {total_orphaned} orphaned folders")
            return
        
        # Fix folders with transaction for safety
        with transaction.atomic():
            # Fix Instagram folders
            if orphaned_counts['instagram'] > 0:
                self.stdout.write(f"\nFixing {orphaned_counts['instagram']} Instagram folders...")
                for folder in InstagramFolder.objects.filter(project_id__isnull=True):
                    folder.project = target_project
                    folder.save()
                    self.stdout.write(f"  ✓ Fixed: {folder.name}")
                    fixed_count += 1
            
            # Fix Facebook folders
            if orphaned_counts['facebook'] > 0:
                self.stdout.write(f"\nFixing {orphaned_counts['facebook']} Facebook folders...")
                for folder in FacebookFolder.objects.filter(project_id__isnull=True):
                    folder.project = target_project
                    folder.save()
                    self.stdout.write(f"  ✓ Fixed: {folder.name}")
                    fixed_count += 1
            
            # Fix TikTok folders
            if orphaned_counts['tiktok'] > 0:
                self.stdout.write(f"\nFixing {orphaned_counts['tiktok']} TikTok folders...")
                for folder in TikTokFolder.objects.filter(project_id__isnull=True):
                    folder.project = target_project
                    folder.save()
                    self.stdout.write(f"  ✓ Fixed: {folder.name}")
                    fixed_count += 1
            
            # Fix LinkedIn folders
            if orphaned_counts['linkedin'] > 0:
                self.stdout.write(f"\nFixing {orphaned_counts['linkedin']} LinkedIn folders...")
                for folder in LinkedInFolder.objects.filter(project_id__isnull=True):
                    folder.project = target_project
                    folder.save()
                    self.stdout.write(f"  ✓ Fixed: {folder.name}")
                    fixed_count += 1
        
        self.stdout.write(f"\n=== SUMMARY ===")
        self.stdout.write(self.style.SUCCESS(f"Successfully fixed {fixed_count} orphaned folders!"))
        self.stdout.write("All folders now have proper project associations.")
        
        # Verify the fix
        remaining_orphaned = (
            InstagramFolder.objects.filter(project_id__isnull=True).count() +
            FacebookFolder.objects.filter(project_id__isnull=True).count() +
            TikTokFolder.objects.filter(project_id__isnull=True).count() +
            LinkedInFolder.objects.filter(project_id__isnull=True).count()
        )
        
        if remaining_orphaned > 0:
            self.stderr.write(f"Warning: {remaining_orphaned} folders still remain orphaned!")
        else:
            self.stdout.write(self.style.SUCCESS("✅ All folders now have project associations!")) 
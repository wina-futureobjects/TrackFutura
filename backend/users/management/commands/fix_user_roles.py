from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserRole

class Command(BaseCommand):
    help = 'Fix users who do not have a UserRole record by creating default roles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--default-role',
            type=str,
            default='user',
            help='Default role to assign to users without a UserRole (default: user)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes'
        )

    def handle(self, *args, **options):
        default_role = options['default_role']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get all users
        users = User.objects.all()
        fixed_count = 0
        skipped_count = 0

        for user in users:
            try:
                # Check if user has a UserRole
                user_role = user.global_role
                self.stdout.write(f'✓ User {user.username} already has role: {user_role.role}')
                skipped_count += 1
            except UserRole.DoesNotExist:
                if dry_run:
                    self.stdout.write(f'Would create UserRole for {user.username} with role: {default_role}')
                else:
                    # Create UserRole for this user
                    UserRole.objects.create(user=user, role=default_role)
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Created UserRole for {user.username} with role: {default_role}')
                    )
                fixed_count += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'\nDRY RUN SUMMARY:')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nFIX SUMMARY:')
            )
        
        self.stdout.write(f'Users with existing roles: {skipped_count}')
        self.stdout.write(f'Users fixed: {fixed_count}')
        self.stdout.write(f'Total users processed: {len(users)}') 
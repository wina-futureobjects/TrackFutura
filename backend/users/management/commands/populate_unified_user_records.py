from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserRole, UserProfile, UnifiedUserRecord, Company
from django.db import models


class Command(BaseCommand):
    help = 'Populate UnifiedUserRecord model with existing user data from User, UserRole, and UserProfile models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing unified records',
        )

    def handle(self, *args, **options):
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS('Starting to populate UnifiedUserRecord model...'))
        
        # Get all users
        users = User.objects.all()
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            try:
                # Check if unified record already exists
                existing_record = UnifiedUserRecord.objects.filter(user=user).first()
                
                if existing_record and not force:
                    self.stdout.write(f'Skipping {user.username} - unified record already exists')
                    skipped_count += 1
                    continue
                
                # Get user role
                try:
                    user_role = user.global_role
                    role = user_role.role
                except UserRole.DoesNotExist:
                    role = 'user'
                    self.stdout.write(f'No UserRole found for {user.username}, using default role: user')
                
                # Get user profile and company
                try:
                    user_profile = user.profile
                    company = user_profile.company
                except UserProfile.DoesNotExist:
                    company = None
                    self.stdout.write(f'No UserProfile found for {user.username}')
                
                # Create name from first_name and last_name
                first_name = user.first_name or ""
                last_name = user.last_name or ""
                name = f"{first_name} {last_name}".strip() or user.username
                
                # Determine status
                status = 'active' if user.is_active else 'inactive'
                
                if existing_record and force:
                    # Update existing record
                    existing_record.name = name
                    existing_record.email = user.email
                    existing_record.company = company
                    existing_record.role = role
                    existing_record.status = status
                    existing_record.save()
                    updated_count += 1
                    self.stdout.write(f'Updated unified record for {user.username}')
                else:
                    # Create new record
                    UnifiedUserRecord.objects.create(
                        user=user,
                        name=name,
                        email=user.email,
                        company=company,
                        role=role,
                        status=status
                    )
                    created_count += 1
                    self.stdout.write(f'Created unified record for {user.username}')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error processing user {user.username}: {str(e)}')
                )
        
        self.stdout.write(self.style.SUCCESS(
            f'Completed! Created: {created_count}, Updated: {updated_count}, Skipped: {skipped_count}'
        ))
        
        # Display summary
        total_records = UnifiedUserRecord.objects.count()
        self.stdout.write(f'Total UnifiedUserRecord entries: {total_records}')
        
        # Show some statistics
        role_stats = UnifiedUserRecord.objects.values('role').annotate(
            count=models.Count('id')
        )
        self.stdout.write('\nRole distribution:')
        for stat in role_stats:
            self.stdout.write(f'  {stat["role"]}: {stat["count"]}')
        
        status_stats = UnifiedUserRecord.objects.values('status').annotate(
            count=models.Count('id')
        )
        self.stdout.write('\nStatus distribution:')
        for stat in status_stats:
            self.stdout.write(f'  {stat["status"]}: {stat["count"]}') 
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from users.models import UnifiedUserRecord, UserRole, UserProfile, Organization, OrganizationMembership, Project
from reports.models import GeneratedReport
from chat.models import ChatThread
from workflow.models import InputCollection
from django.db import transaction


class Command(BaseCommand):
    help = 'Safely delete a user and all related records'

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            type=str,
            help='Username of the user to delete'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force deletion without confirmation'
        )

    def handle(self, *args, **options):
        username = options['username']
        force = options['force']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist')
        
        # Show user information
        self.stdout.write(f'User to delete: {user.username}')
        self.stdout.write(f'Email: {user.email}')
        self.stdout.write(f'Full name: {user.get_full_name()}')
        self.stdout.write(f'Date joined: {user.date_joined}')
        self.stdout.write(f'Is active: {user.is_active}')
        
        # Check for related records
        related_records = []
        
        # Check UnifiedUserRecord
        try:
            unified_record = UnifiedUserRecord.objects.get(user=user)
            related_records.append(f'UnifiedUserRecord (ID: {unified_record.id})')
        except UnifiedUserRecord.DoesNotExist:
            pass
        
        # Check UserRole
        try:
            user_role = UserRole.objects.get(user=user)
            related_records.append(f'UserRole (Role: {user_role.get_role_display()})')
        except UserRole.DoesNotExist:
            pass
        
        # Check UserProfile
        try:
            user_profile = UserProfile.objects.get(user=user)
            related_records.append(f'UserProfile (Company: {user_profile.company.name if user_profile.company else "None"})')
        except UserProfile.DoesNotExist:
            pass
        
        # Check ChatThreads
        chat_threads_count = ChatThread.objects.filter(user=user).count()
        if chat_threads_count > 0:
            related_records.append(f'Chat Threads ({chat_threads_count} threads)')
        
        # Check GeneratedReports
        reports_count = GeneratedReport.objects.filter(user=user).count()
        if reports_count > 0:
            related_records.append(f'Generated Reports ({reports_count} reports)')
        
        # Check Workflow InputCollections
        input_collections_count = InputCollection.objects.filter(created_by=user).count()
        if input_collections_count > 0:
            related_records.append(f'Workflow Input Collections ({input_collections_count} collections)')
        
        # Check Organization Memberships
        org_memberships_count = OrganizationMembership.objects.filter(user=user).count()
        if org_memberships_count > 0:
            related_records.append(f'Organization Memberships ({org_memberships_count} memberships)')
        
        # Check Owned Organizations
        owned_orgs_count = Organization.objects.filter(owner=user).count()
        if owned_orgs_count > 0:
            related_records.append(f'Owned Organizations ({owned_orgs_count} organizations)')
        
        # Check Owned Projects
        owned_projects_count = Project.objects.filter(owner=user).count()
        if owned_projects_count > 0:
            related_records.append(f'Owned Projects ({owned_projects_count} projects)')
        
        # Check Authorized Projects
        authorized_projects_count = Project.objects.filter(authorized_users=user).count()
        if authorized_projects_count > 0:
            related_records.append(f'Authorized Projects ({authorized_projects_count} projects)')
        
        # Check other potential relationships
        if user.projects.exists():
            related_records.append(f'Projects ({user.projects.count()} projects)')
        
        if user.owned_organizations.exists():
            related_records.append(f'Owned Organizations ({user.owned_organizations.count()} organizations)')
        
        if user.organizations.exists():
            related_records.append(f'Organization Memberships ({user.organizations.count()} memberships)')
        
        if user.created_platforms.exists():
            related_records.append(f'Created Platforms ({user.created_platforms.count()} platforms)')
        
        if user.created_platform_services.exists():
            related_records.append(f'Created Platform Services ({user.created_platform_services.count()} services)')
        
        if user.accessible_projects.exists():
            related_records.append(f'Accessible Projects ({user.accessible_projects.count()} projects)')
        
        # Display related records
        if related_records:
            self.stdout.write('\nRelated records that will be deleted:')
            for record in related_records:
                self.stdout.write(f'  - {record}')
        else:
            self.stdout.write('\nNo related records found.')
        
        # Confirmation
        if not force:
            confirm = input('\nAre you sure you want to delete this user? (yes/no): ')
            if confirm.lower() not in ['yes', 'y']:
                self.stdout.write(self.style.WARNING('User deletion cancelled.'))
                return
        
        # Delete user with transaction
        try:
            with transaction.atomic():
                # The pre_delete signal will handle all the cleanup automatically
                # Just delete the user and let the signal do the work
                user.delete()
                
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully deleted user "{username}" and all related records.')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error deleting user: {str(e)}')
            )
            raise CommandError(f'Failed to delete user: {str(e)}') 
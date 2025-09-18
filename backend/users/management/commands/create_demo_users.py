from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserRole, UserProfile, Organization, OrganizationMembership

class Command(BaseCommand):
    help = 'Creates three demo users with different roles for testing purposes'

    def handle(self, *args, **options):
        # Create Super Admin
        superadmin_user, created = User.objects.get_or_create(
            username='superadmin',
            email='superadmin@example.com',
            defaults={
                'is_active': True
            }
        )
        
        if created:
            superadmin_user.set_password('superadmin123')
            superadmin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created Super Admin user: {superadmin_user.username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Super Admin user already exists: {superadmin_user.username}'))
        
        # Ensure UserProfile exists
        UserProfile.objects.get_or_create(user=superadmin_user)
        
        # Set or update user role
        role, created = UserRole.objects.update_or_create(
            user=superadmin_user,
            defaults={'role': 'super_admin'}
        )
        
        self.stdout.write(self.style.SUCCESS(f'Assigned role {role.role} to {superadmin_user.username}'))
        
        # Create Tenant Admin
        tenantadmin_user, created = User.objects.get_or_create(
            username='tenantadmin',
            email='tenantadmin@example.com',
            defaults={
                'is_active': True
            }
        )
        
        if created:
            tenantadmin_user.set_password('tenantadmin123')
            tenantadmin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created Tenant Admin user: {tenantadmin_user.username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Tenant Admin user already exists: {tenantadmin_user.username}'))
        
        # Ensure UserProfile exists
        UserProfile.objects.get_or_create(user=tenantadmin_user)
        
        # Set or update user role
        role, created = UserRole.objects.update_or_create(
            user=tenantadmin_user,
            defaults={'role': 'tenant_admin'}
        )
        
        self.stdout.write(self.style.SUCCESS(f'Assigned role {role.role} to {tenantadmin_user.username}'))
        
        # Create Regular User
        regular_user, created = User.objects.get_or_create(
            username='user',
            email='user@example.com',
            defaults={
                'is_active': True
            }
        )
        
        if created:
            regular_user.set_password('user123')
            regular_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created Regular user: {regular_user.username}'))
        else:
            self.stdout.write(self.style.WARNING(f'Regular user already exists: {regular_user.username}'))
        
        # Ensure UserProfile exists
        UserProfile.objects.get_or_create(user=regular_user)
        
        # Set or update user role
        role, created = UserRole.objects.update_or_create(
            user=regular_user,
            defaults={'role': 'user'}
        )
        
        self.stdout.write(self.style.SUCCESS(f'Assigned role {role.role} to {regular_user.username}'))
        
        # Create a demo organization owned by the tenant admin
        org, created = Organization.objects.get_or_create(
            name='Demo Organization',
            defaults={
                'description': 'A demo organization for testing purposes',
                'owner': tenantadmin_user
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created demo organization: {org.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Demo organization already exists: {org.name}'))
            
        # Add users to the organization
        # Tenant Admin as admin
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=org,
            user=tenantadmin_user,
            defaults={'role': 'admin'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {tenantadmin_user.username} as admin to {org.name}'))
        
        # Regular user as member
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=org,
            user=regular_user,
            defaults={'role': 'member'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {regular_user.username} as member to {org.name}'))
            
        # Super admin as viewer (for demo purposes)
        membership, created = OrganizationMembership.objects.get_or_create(
            organization=org,
            user=superadmin_user,
            defaults={'role': 'viewer'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Added {superadmin_user.username} as viewer to {org.name}'))
            
        self.stdout.write(self.style.SUCCESS('Successfully created demo users and organization')) 
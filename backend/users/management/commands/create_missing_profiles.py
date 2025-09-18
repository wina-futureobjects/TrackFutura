from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile, UserRole

class Command(BaseCommand):
    help = 'Create missing UserProfile and UserRole instances for existing users'

    def handle(self, *args, **options):
        users = User.objects.all()
        profiles_created = 0
        roles_created = 0
        
        for user in users:
            # Create profile if it doesn't exist
            profile, profile_created = UserProfile.objects.get_or_create(user=user)
            if profile_created:
                profiles_created += 1
                self.stdout.write(f"Created profile for user: {user.username}")
            
            # Create role if it doesn't exist
            role, role_created = UserRole.objects.get_or_create(user=user, defaults={'role': 'user'})
            if role_created:
                roles_created += 1
                self.stdout.write(f"Created role for user: {user.username}")
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {profiles_created} profiles and {roles_created} roles'
            )
        ) 
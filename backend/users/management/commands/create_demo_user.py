from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile, UserRole


class Command(BaseCommand):
    help = 'Create a demo user for testing login functionality'

    def handle(self, *args, **options):
        # Create or update demo user
        username = 'demo'
        password = 'demo123'
        email = 'demo@trackfutura.com'

        try:
            user = User.objects.get(username=username)
            user.set_password(password)
            user.email = email
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'Updated existing demo user: {username}')
            )
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email
            )
            self.stdout.write(
                self.style.SUCCESS(f'Created new demo user: {username}')
            )

        # Ensure user profile exists
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created user profile for {username}')
            )

        # Ensure user role exists
        role, created = UserRole.objects.get_or_create(
            user=user,
            defaults={'role': 'user'}
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Created user role for {username}')
            )

        # Also update admin user password to known value
        try:
            admin = User.objects.get(username='admin')
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(
                self.style.SUCCESS('Updated admin user password to: admin123')
            )
        except User.DoesNotExist:
            pass

        self.stdout.write(
            self.style.SUCCESS('\n=== Demo Login Credentials ===')
        )
        self.stdout.write(f'Username: {username}')
        self.stdout.write(f'Password: {password}')
        self.stdout.write(f'Email: {email}')
        self.stdout.write('\n=== Admin Login Credentials ===')
        self.stdout.write('Username: admin')
        self.stdout.write('Password: admin123')

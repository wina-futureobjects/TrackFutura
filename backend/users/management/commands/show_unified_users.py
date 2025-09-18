from django.core.management.base import BaseCommand
from django.db import models
from users.models import UnifiedUserRecord


class Command(BaseCommand):
    help = 'Display all unified user records'

    def handle(self, *args, **options):
        records = UnifiedUserRecord.objects.select_related('user', 'company').all()
        
        self.stdout.write(self.style.SUCCESS(f'Found {records.count()} unified user records:'))
        self.stdout.write('')
        
        # Header
        self.stdout.write(f"{'ID':<4} {'Username':<15} {'Name':<20} {'Email':<25} {'Role':<12} {'Status':<8}")
        self.stdout.write('-' * 85)
        
        # Records
        for record in records:
            self.stdout.write(
                f"{record.id:<4} {record.user.username:<15} {record.name:<20} "
                f"{record.email:<25} {record.get_role_display():<12} "
                f"{record.get_status_display():<8}"
            )
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Summary:'))
        self.stdout.write(f"  Total records: {records.count()}")
        
        # Role distribution
        role_stats = records.values('role').annotate(count=models.Count('id'))
        self.stdout.write('  Role distribution:')
        for stat in role_stats:
            role_display = dict(UnifiedUserRecord.ROLE_CHOICES)[stat['role']]
            self.stdout.write(f"    {role_display}: {stat['count']}")
        
        # Status distribution
        status_stats = records.values('status').annotate(count=models.Count('id'))
        self.stdout.write('  Status distribution:')
        for stat in status_stats:
            status_display = dict(UnifiedUserRecord.STATUS_CHOICES)[stat['status']]
            self.stdout.write(f"    {status_display}: {stat['count']}") 
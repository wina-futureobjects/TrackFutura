from django.core.management.base import BaseCommand
from users.models import Organization, OrganizationMembership, User


class Command(BaseCommand):
    help = 'Check organization members and debug membership issues'

    def add_arguments(self, parser):
        parser.add_argument('--organization-id', type=int, help='Organization ID to check')
        parser.add_argument('--list-all', action='store_true', help='List all organizations')

    def handle(self, *args, **options):
        if options['list_all']:
            self.list_all_organizations()
        elif options['organization_id']:
            self.check_organization(options['organization_id'])
        else:
            self.stdout.write(self.style.ERROR('Please provide --organization-id or --list-all'))

    def list_all_organizations(self):
        """List all organizations with their member counts"""
        organizations = Organization.objects.all()
        self.stdout.write(f"Found {organizations.count()} organizations:")
        
        for org in organizations:
            member_count = OrganizationMembership.objects.filter(organization=org).count()
            self.stdout.write(f"  Organization {org.id}: {org.name} - {member_count} members")

    def check_organization(self, org_id):
        """Check a specific organization's members"""
        try:
            organization = Organization.objects.get(id=org_id)
            self.stdout.write(f"Organization: {organization.name} (ID: {org_id})")
            self.stdout.write(f"Owner: {organization.owner.username} (ID: {organization.owner.id})")
            
            # Get all memberships
            memberships = OrganizationMembership.objects.filter(organization=organization)
            self.stdout.write(f"\nFound {memberships.count()} memberships:")
            
            for membership in memberships:
                user = membership.user
                self.stdout.write(f"  - User: {user.username} (ID: {user.id})")
                self.stdout.write(f"    Email: {user.email}")
                self.stdout.write(f"    Role: {membership.role}")
                self.stdout.write(f"    Date Joined: {membership.date_joined}")
                
                # Check if user has profile and company
                try:
                    if hasattr(user, 'profile') and user.profile:
                        company_name = user.profile.company.name if user.profile.company else "No company"
                        self.stdout.write(f"    Company: {company_name}")
                    else:
                        self.stdout.write(f"    Company: No profile")
                except Exception as e:
                    self.stdout.write(f"    Company: Error - {str(e)}")
                
                self.stdout.write("")
            
            # Check if there are any users in the organization's members M2M field
            m2m_members = organization.members.all()
            self.stdout.write(f"Organization.members M2M field has {m2m_members.count()} users:")
            for user in m2m_members:
                self.stdout.write(f"  - {user.username} (ID: {user.id})")
                
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Organization with ID {org_id} not found"))

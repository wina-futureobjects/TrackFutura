from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

# Platform and Service Management Models
class Platform(models.Model):
    """Model for managing available social media platforms"""
    name = models.CharField(max_length=50, unique=True, help_text="Internal platform name (e.g., 'instagram', 'facebook')")
    display_name = models.CharField(max_length=100, help_text="User-friendly display name (e.g., 'Instagram', 'Facebook')")
    is_enabled = models.BooleanField(default=True, help_text="Whether this platform is available for use")
    description = models.TextField(blank=True, null=True, help_text="Description of the platform")
    icon_name = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name for UI display")
    color = models.CharField(max_length=7, blank=True, null=True, help_text="Hex color code for UI display")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_platforms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']
        verbose_name = "Platform"
        verbose_name_plural = "Platforms"

    def __str__(self):
        return self.display_name

    def get_available_services(self):
        """Get all enabled services for this platform"""
        return self.platform_services.filter(is_enabled=True).select_related('service')

class Service(models.Model):
    """Model for managing available content services"""
    name = models.CharField(max_length=50, unique=True, help_text="Internal service name (e.g., 'posts', 'reels', 'comments')")
    display_name = models.CharField(max_length=100, help_text="User-friendly display name (e.g., 'Posts', 'Reels', 'Comments')")
    description = models.TextField(blank=True, null=True, help_text="Description of the service")
    icon_name = models.CharField(max_length=50, blank=True, null=True, help_text="Icon name for UI display")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_name']
        verbose_name = "Service"
        verbose_name_plural = "Services"

    def __str__(self):
        return self.display_name

class PlatformService(models.Model):
    """Model for managing platform-service combinations"""
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE, related_name='platform_services')
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='platform_services')
    is_enabled = models.BooleanField(default=True, help_text="Whether this platform-service combination is available")
    description = models.TextField(blank=True, null=True, help_text="Description of this platform-service combination")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_platform_services')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['platform', 'service']
        verbose_name = "Platform Service"
        verbose_name_plural = "Platform Services"

    def __str__(self):
        return f"{self.platform.display_name} - {self.service.display_name}"

    @property
    def is_available(self):
        """Check if both platform and service are enabled"""
        return self.is_enabled and self.platform.is_enabled

# Create your models here.

class UserRole(models.Model):
    """
    Global role for users across the entire application
    """
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('tenant_admin', 'Tenant Admin'),
        ('user', 'User'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='global_role')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.CharField(max_length=255, blank=True, null=True)
    company = models.ForeignKey('Company', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username

class Organization(models.Model):
    """
    Organization model to group projects and manage user access
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # The owner of the organization
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_organizations')
    
    # Members of the organization through the membership model
    members = models.ManyToManyField(User, through='OrganizationMembership', related_name='organizations')

    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']

class OrganizationMembership(models.Model):
    """
    Membership model to associate users with organizations and define their roles
    """
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    display_name = models.CharField(max_length=255, blank=True, null=True, help_text="Display name for this user in this organization")
    date_joined = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'organization')
        
    def __str__(self):
        return f"{self.user.username} - {self.organization.name} ({self.role})"

class Project(models.Model):
    """
    Model for organizing data into separate projects
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Change from direct user ownership to organization ownership
    # Make it nullable initially to allow for migration
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='projects', null=True, blank=True)
    
    # Keep the owner field for tracking who created the project
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    
    # Access control
    is_public = models.BooleanField(default=False, help_text="If true, all organization members can access")
    
    # M2M relationship for specific users who have access (in addition to admins and owner)
    authorized_users = models.ManyToManyField(User, related_name='accessible_projects', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['-created_at']


class Company(models.Model):
    """
    Company model for managing company information
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    name = models.CharField(max_length=200, help_text="Company name")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    description = models.TextField(blank=True, null=True, help_text="Company description")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.status})"
    
    @property
    def is_active(self):
        return self.status == 'active'


class UnifiedUserRecord(models.Model):
    """
    Unified user record model that consolidates data from User, UserRole, and UserProfile models.
    This model provides a single view of user information without changing existing models.
    """
    # Core user information from Django User model
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='unified_record')
    
    # Name fields (from User model)
    name = models.CharField(max_length=255, blank=True, help_text="Full name of the user")
    
    # Email (from User model)
    email = models.EmailField(blank=True, help_text="User's email address")
    
    # Company (from UserProfile model)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='unified_users')
    
    # Role (from UserRole model)
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('tenant_admin', 'Tenant Admin'),
        ('user', 'User'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user', help_text="User's role in the system")
    
    # Status (derived from User.is_active)
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', help_text="User's status")
    
    # Timestamps
    created_date = models.DateTimeField(auto_now_add=True, help_text="When the user was created")
    updated_date = models.DateTimeField(auto_now=True, help_text="When the user record was last updated")
    
    class Meta:
        verbose_name = "Unified User Record"
        verbose_name_plural = "Unified User Records"
        ordering = ['-created_date']
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['status']),
            models.Index(fields=['company']),
            models.Index(fields=['created_date']),
        ]
    
    def __str__(self):
        return f"{self.name or self.user.username} ({self.get_role_display()})"
    
    def save(self, *args, **kwargs):
        # Auto-populate fields from related models if not set
        if not self.name and self.user:
            first_name = self.user.first_name or ""
            last_name = self.user.last_name or ""
            self.name = f"{first_name} {last_name}".strip() or self.user.username
        
        if not self.email and self.user:
            self.email = self.user.email
        
        if not self.status:
            self.status = 'active' if self.user.is_active else 'inactive'
        
        super().save(*args, **kwargs)
    
    @property
    def is_active(self):
        """Check if user is active"""
        return self.status == 'active'
    
    @property
    def display_name(self):
        """Get display name for the user"""
        return self.name or self.user.username
    
    @property
    def role_display(self):
        """Get human-readable role name"""
        return self.get_role_display()
    
    @property
    def company_name(self):
        """Get company name if available"""
        return self.company.name if self.company else None

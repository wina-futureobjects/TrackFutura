from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User

from .models import (
    UserProfile, 
    UserRole, 
    Organization, 
    OrganizationMembership, 
    Project,
    Platform,
    Service,
    PlatformService,
    Company,
    UnifiedUserRecord
)

# UserRole Admin
@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'created_at', 'updated_at')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email')
    ordering = ('user__username',)
    raw_id_fields = ('user',)

# UserProfile Admin
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'avatar', 'created_at', 'updated_at')
    search_fields = ('user__username', 'user__email')
    raw_id_fields = ('user',)

# Organization Admin
@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'get_member_count', 'created_at', 'updated_at')
    search_fields = ('name', 'owner__username', 'description')
    list_filter = ('created_at',)
    raw_id_fields = ('owner',)
    
    def get_member_count(self, obj):
        return obj.members.count()
    get_member_count.short_description = 'Members'

# OrganizationMembership Admin
@admin.register(OrganizationMembership)
class OrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'organization', 'role', 'date_joined')
    list_filter = ('role', 'date_joined')
    search_fields = ('user__username', 'organization__name')
    raw_id_fields = ('user', 'organization')

# Project Admin
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization', 'owner', 'is_public', 'created_at')
    list_filter = ('is_public', 'created_at')
    search_fields = ('name', 'description', 'owner__username')
    raw_id_fields = ('owner', 'organization')
    filter_horizontal = ('authorized_users',)

# Extend the User admin
class UserRoleInline(admin.StackedInline):
    model = UserRole
    can_delete = False
    verbose_name_plural = 'User Role'

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'User Profile'

# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserRoleInline, UserProfileInline,)
    list_display = BaseUserAdmin.list_display + ('get_role',)
    
    def get_role(self, obj):
        try:
            return obj.global_role.get_role_display()
        except UserRole.DoesNotExist:
            return "-"
    get_role.short_description = 'Role'

# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'is_enabled', 'created_by', 'created_at']
    list_filter = ['is_enabled', 'created_at']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['display_name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description')
        }),
        ('UI Configuration', {
            'fields': ('icon_name', 'color')
        }),
        ('Status', {
            'fields': ('is_enabled',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'icon_name', 'created_at']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['display_name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description')
        }),
        ('UI Configuration', {
            'fields': ('icon_name',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(PlatformService)
class PlatformServiceAdmin(admin.ModelAdmin):
    list_display = ['platform', 'service', 'is_enabled', 'is_available', 'created_by', 'created_at']
    list_filter = ['is_enabled', 'platform', 'service', 'created_at']
    search_fields = ['platform__name', 'platform__display_name', 'service__name', 'service__display_name']
    readonly_fields = ['created_at', 'updated_at', 'is_available']
    ordering = ['platform__display_name', 'service__display_name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('platform', 'service', 'is_enabled')
        }),
        ('Configuration', {
            'fields': ('config', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_available(self, obj):
        return obj.is_enabled and obj.platform.is_enabled
    is_available.boolean = True
    is_available.short_description = 'Available'

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'description', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'status', 'description')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UnifiedUserRecord)
class UnifiedUserRecordAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email', 'company', 'role', 'status', 'created_date', 'updated_date']
    list_filter = ['role', 'status', 'company', 'created_date']
    search_fields = ['name', 'email', 'user__username', 'company__name']
    readonly_fields = ['created_date', 'updated_date']
    ordering = ['-created_date']
    raw_id_fields = ['user', 'company']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'name', 'email')
        }),
        ('Organization', {
            'fields': ('company',)
        }),
        ('Access Control', {
            'fields': ('role', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_date', 'updated_date'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queryset with select_related for better performance"""
        return super().get_queryset(request).select_related('user', 'company')
    
    def save_model(self, request, obj, form, change):
        """Auto-sync with related models when saving"""
        super().save_model(request, obj, form, change)
        
        # Update related models if needed
        if obj.user:
            # Update User model if name/email changed
            if obj.name and (obj.user.first_name != obj.name.split()[0] if obj.name.split() else ''):
                name_parts = obj.name.split()
                obj.user.first_name = name_parts[0] if name_parts else ''
                obj.user.last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
                obj.user.save()
            
            if obj.email and obj.user.email != obj.email:
                obj.user.email = obj.email
                obj.user.save()
            
            # Update UserRole if role changed
            try:
                user_role = obj.user.global_role
                if user_role.role != obj.role:
                    user_role.role = obj.role
                    user_role.save()
            except UserRole.DoesNotExist:
                UserRole.objects.create(user=obj.user, role=obj.role)
            
            # Update UserProfile if company changed
            try:
                user_profile = obj.user.profile
                if user_profile.company != obj.company:
                    user_profile.company = obj.company
                    user_profile.save()
            except UserProfile.DoesNotExist:
                UserProfile.objects.create(user=obj.user, company=obj.company)
    
    def delete_model(self, request, obj):
        """Handle deletion of unified record"""
        try:
            # Delete the unified record
            obj.delete()
            self.message_user(request, f'Successfully deleted unified record for user: {obj.user.username}')
        except Exception as e:
            self.message_user(request, f'Error deleting unified record: {str(e)}', level='ERROR')
    
    def delete_queryset(self, request, queryset):
        """Handle bulk deletion of unified records"""
        deleted_count = 0
        for obj in queryset:
            try:
                obj.delete()
                deleted_count += 1
            except Exception as e:
                self.message_user(request, f'Error deleting unified record for {obj.user.username}: {str(e)}', level='ERROR')
        
        if deleted_count > 0:
            self.message_user(request, f'Successfully deleted {deleted_count} unified record(s)')
    
    actions = ['delete_selected']
    
    def get_actions(self, request):
        """Customize available actions"""
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            actions['delete_selected'] = self.get_action('delete_selected')
        return actions

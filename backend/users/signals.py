from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UnifiedUserRecord, UserRole, UserProfile, Organization, OrganizationMembership, Project
from reports.models import GeneratedReport
from chat.models import ChatThread
from workflow.models import InputCollection


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create UserProfile and UserRole when a User is created"""
    if created:
        UserProfile.objects.get_or_create(user=instance)
        UserRole.objects.get_or_create(user=instance, defaults={'role': 'user'})


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Save UserProfile when User is saved"""
    if hasattr(instance, 'profile'):
        instance.profile.save()
    else:
        # Create profile if it doesn't exist
        UserProfile.objects.get_or_create(user=instance)
    
    if hasattr(instance, 'global_role'):
        instance.global_role.save()
    else:
        # Create role if it doesn't exist
        UserRole.objects.get_or_create(user=instance, defaults={'role': 'user'})


# Unified User Record Signals
@receiver(post_save, sender=User)
def create_unified_user_record(sender, instance, created, **kwargs):
    """
    Signal to automatically create UnifiedUserRecord when a new User is created
    """
    if created:
        # Create name from first_name and last_name
        first_name = instance.first_name or ""
        last_name = instance.last_name or ""
        name = f"{first_name} {last_name}".strip() or instance.username
        
        # Determine status
        status = 'active' if instance.is_active else 'inactive'
        
        # Create unified record using get_or_create to avoid duplicates
        unified_record, created = UnifiedUserRecord.objects.get_or_create(
            user=instance,
            defaults={
                'name': name,
                'email': instance.email,
                'company': None,  # Will be set when UserProfile is created
                'role': 'user',   # Default role, will be updated when UserRole is created
                'status': status
            }
        )
        
        if created:
            print(f"Created unified record for new user: {instance.username}")


@receiver(post_save, sender=UserRole)
def update_unified_user_record_role(sender, instance, created, **kwargs):
    """
    Signal to update UnifiedUserRecord when UserRole is created or updated
    """
    try:
        unified_record = UnifiedUserRecord.objects.get(user=instance.user)
        if unified_record.role != instance.role:
            unified_record.role = instance.role
            unified_record.save(update_fields=['role'])
    except UnifiedUserRecord.DoesNotExist:
        # If unified record doesn't exist, create it
        first_name = instance.user.first_name or ""
        last_name = instance.user.last_name or ""
        name = f"{first_name} {last_name}".strip() or instance.user.username
        status = 'active' if instance.user.is_active else 'inactive'
        
        UnifiedUserRecord.objects.create(
            user=instance.user,
            name=name,
            email=instance.user.email,
            company=None,
            role=instance.role,
            status=status
        )


@receiver(post_save, sender=UserProfile)
def update_unified_user_record_profile(sender, instance, created, **kwargs):
    """
    Signal to update UnifiedUserRecord when UserProfile is created or updated
    """
    try:
        unified_record = UnifiedUserRecord.objects.get(user=instance.user)
        if unified_record.company != instance.company:
            unified_record.company = instance.company
            unified_record.save(update_fields=['company'])
    except UnifiedUserRecord.DoesNotExist:
        # If unified record doesn't exist, create it
        first_name = instance.user.first_name or ""
        last_name = instance.user.last_name or ""
        name = f"{first_name} {last_name}".strip() or instance.user.username
        status = 'active' if instance.user.is_active else 'inactive'
        
        # Get role if it exists
        try:
            role = instance.user.global_role.role
        except UserRole.DoesNotExist:
            role = 'user'
        
        UnifiedUserRecord.objects.create(
            user=instance.user,
            name=name,
            email=instance.user.email,
            company=instance.company,
            role=role,
            status=status
        )


@receiver(post_save, sender=User)
def update_unified_user_record_on_user_change(sender, instance, created, **kwargs):
    """
    Signal to update UnifiedUserRecord when User fields are updated
    """
    if not created:  # Only update existing records
        try:
            unified_record = UnifiedUserRecord.objects.get(user=instance)
            
            # Update name if it changed
            first_name = instance.first_name or ""
            last_name = instance.last_name or ""
            new_name = f"{first_name} {last_name}".strip() or instance.username
            if unified_record.name != new_name:
                unified_record.name = new_name
            
            # Update email if it changed
            if unified_record.email != instance.email:
                unified_record.email = instance.email
            
            # Update status if it changed
            new_status = 'active' if instance.is_active else 'inactive'
            if unified_record.status != new_status:
                unified_record.status = new_status
            
            unified_record.save()
            
        except UnifiedUserRecord.DoesNotExist:
            # If unified record doesn't exist, create it
            first_name = instance.first_name or ""
            last_name = instance.last_name or ""
            name = f"{first_name} {last_name}".strip() or instance.username
            status = 'active' if instance.is_active else 'inactive'
            
            # Get company if it exists
            try:
                company = instance.profile.company
            except UserProfile.DoesNotExist:
                company = None
            
            # Get role if it exists
            try:
                role = instance.global_role.role
            except UserRole.DoesNotExist:
                role = 'user'
            
            UnifiedUserRecord.objects.create(
                user=instance,
                name=name,
                email=instance.email,
                company=company,
                role=role,
                status=status
            )


@receiver(pre_delete, sender=User)
def cleanup_user_records(sender, instance, **kwargs):
    """
    Signal to clean up ALL related records before user deletion
    This handles all foreign key relationships that could prevent user deletion
    """
    username = instance.username
    
    try:
        # Delete unified record if it exists
        UnifiedUserRecord.objects.filter(user=instance).delete()
        print(f"Cleaned up unified record for user: {username}")
    except Exception as e:
        print(f"Error cleaning up unified record for user {username}: {e}")
    
    try:
        # Delete user role if it exists
        UserRole.objects.filter(user=instance).delete()
        print(f"Cleaned up user role for user: {username}")
    except Exception as e:
        print(f"Error cleaning up user role for user {username}: {e}")
    
    try:
        # Delete user profile if it exists
        UserProfile.objects.filter(user=instance).delete()
        print(f"Cleaned up user profile for user: {username}")
    except Exception as e:
        print(f"Error cleaning up user profile for user {username}: {e}")
    
    try:
        # Delete chat threads if they exist
        ChatThread.objects.filter(user=instance).delete()
        print(f"Cleaned up chat threads for user: {username}")
    except Exception as e:
        print(f"Error cleaning up chat threads for user {username}: {e}")
    
    try:
        # Delete generated reports if they exist
        GeneratedReport.objects.filter(user=instance).delete()
        print(f"Cleaned up generated reports for user: {username}")
    except Exception as e:
        print(f"Error cleaning up generated reports for user {username}: {e}")
    
    try:
        # Delete workflow input collections if they exist
        InputCollection.objects.filter(created_by=instance).delete()
        print(f"Cleaned up workflow input collections for user: {username}")
    except Exception as e:
        print(f"Error cleaning up workflow input collections for user {username}: {e}")
    
    try:
        # Delete organization memberships if they exist
        OrganizationMembership.objects.filter(user=instance).delete()
        print(f"Cleaned up organization memberships for user: {username}")
    except Exception as e:
        print(f"Error cleaning up organization memberships for user {username}: {e}")
    
    try:
        # Delete owned organizations if they exist
        Organization.objects.filter(owner=instance).delete()
        print(f"Cleaned up owned organizations for user: {username}")
    except Exception as e:
        print(f"Error cleaning up owned organizations for user {username}: {e}")
    
    try:
        # Delete owned projects if they exist
        Project.objects.filter(owner=instance).delete()
        print(f"Cleaned up owned projects for user: {username}")
    except Exception as e:
        print(f"Error cleaning up owned projects for user {username}: {e}")
    
    try:
        # Remove user from authorized projects
        for project in Project.objects.filter(authorized_users=instance):
            project.authorized_users.remove(instance)
        print(f"Removed user from authorized projects: {username}")
    except Exception as e:
        print(f"Error removing user from authorized projects {username}: {e}")
    
    try:
        # Handle SET_NULL relationships by setting them to None
        from .models import Platform, PlatformService
        Platform.objects.filter(created_by=instance).update(created_by=None)
        PlatformService.objects.filter(created_by=instance).update(created_by=None)
        print(f"Updated SET_NULL relationships for user: {username}")
    except Exception as e:
        print(f"Error updating SET_NULL relationships for user {username}: {e}") 
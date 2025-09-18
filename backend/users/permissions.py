from rest_framework import permissions
from .models import UserRole

class IsSuperAdmin(permissions.BasePermission):
    """
    Custom permission to only allow superadmin users.
    """
    
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # First try to check the custom UserRole
        try:
            user_role = request.user.global_role
            if user_role and user_role.role == 'super_admin':
                return True
        except (UserRole.DoesNotExist, AttributeError):
            pass
        
        # Fallback to Django's built-in superuser check
        return request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # First try to check the custom UserRole
        try:
            user_role = request.user.global_role
            if user_role and user_role.role == 'super_admin':
                return True
        except (UserRole.DoesNotExist, AttributeError):
            pass
        
        # Fallback to Django's built-in superuser check
        return request.user.is_superuser 
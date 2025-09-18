from typing import List, Dict, Optional, Tuple
from django.core.exceptions import ValidationError
from .models import Platform, Service, PlatformService

class PlatformServiceManager:
    """Service class for managing platform and service configurations"""
    
    @staticmethod
    def get_available_platforms() -> List[Platform]:
        """Get all enabled platforms"""
        return Platform.objects.filter(is_enabled=True)
    
    @staticmethod
    def get_available_services() -> List[Service]:
        """Get all services"""
        return Service.objects.all()
    
    @staticmethod
    def get_available_platform_services() -> List[PlatformService]:
        """Get all enabled platform-service combinations"""
        return PlatformService.objects.filter(
            is_enabled=True, 
            platform__is_enabled=True
        ).select_related('platform', 'service')
    
    @staticmethod
    def get_platform_services(platform_name: str) -> List[PlatformService]:
        """Get available services for a specific platform"""
        return PlatformService.objects.filter(
            platform__name=platform_name,
            platform__is_enabled=True,
            is_enabled=True
        ).select_related('platform', 'service')
    
    @staticmethod
    def validate_platform_service(platform_name: str, service_name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate if a platform-service combination is available
        
        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        try:
            platform_service = PlatformService.objects.get(
                platform__name=platform_name,
                service__name=service_name,
                platform__is_enabled=True,
                is_enabled=True
            )
            return True, None
        except PlatformService.DoesNotExist:
            # Check if platform exists but is disabled
            try:
                platform = Platform.objects.get(name=platform_name)
                if not platform.is_enabled:
                    return False, f"Platform '{platform.display_name}' is not available"
            except Platform.DoesNotExist:
                return False, f"Platform '{platform_name}' does not exist"
            
            # Check if service exists
            try:
                service = Service.objects.get(name=service_name)
            except Service.DoesNotExist:
                return False, f"Service '{service_name}' does not exist"
            
            # Check if platform-service combination exists but is disabled
            try:
                platform_service = PlatformService.objects.get(
                    platform__name=platform_name,
                    service__name=service_name
                )
                if not platform_service.is_enabled:
                    return False, f"Service '{service.display_name}' is not available for '{platform.display_name}'"
            except PlatformService.DoesNotExist:
                return False, f"Service '{service.display_name}' is not available for '{platform.display_name}'"
            
            return False, "Platform-service combination is not available"
    
    @staticmethod
    def get_platform_service_display_name(platform_name: str, service_name: str) -> Optional[str]:
        """Get display name for a platform-service combination"""
        try:
            platform_service = PlatformService.objects.get(
                platform__name=platform_name,
                service__name=service_name
            )
            return f"{platform_service.platform.display_name} {platform_service.service.display_name}"
        except PlatformService.DoesNotExist:
            return None
    
    @staticmethod
    def get_available_platforms_for_user(user) -> List[Dict]:
        """
        Get available platforms and their services for a user
        
        Returns:
            List of dictionaries with platform and service information
        """
        platforms = Platform.objects.filter(is_enabled=True)
        result = []
        
        for platform in platforms:
            platform_services = PlatformService.objects.filter(
                platform=platform,
                is_enabled=True
            ).select_related('service')
            
            services = []
            for ps in platform_services:
                services.append({
                    'id': ps.service.id,
                    'name': ps.service.name,
                    'display_name': ps.service.display_name,
                    'description': ps.service.description,
                    'icon_name': ps.service.icon_name
                })
            
            result.append({
                'id': platform.id,
                'name': platform.name,
                'display_name': platform.display_name,
                'description': platform.description,
                'icon_name': platform.icon_name,
                'color': platform.color,
                'services': services
            })
        
        return result
    
    @staticmethod
    def create_platform_service(platform_name: str, service_name: str, created_by, **kwargs) -> PlatformService:
        """Create a new platform-service combination"""
        try:
            platform = Platform.objects.get(name=platform_name)
            service = Service.objects.get(name=service_name)
            
            platform_service = PlatformService.objects.create(
                platform=platform,
                service=service,
                created_by=created_by,
                **kwargs
            )
            return platform_service
        except Platform.DoesNotExist:
            raise ValidationError(f"Platform '{platform_name}' does not exist")
        except Service.DoesNotExist:
            raise ValidationError(f"Service '{service_name}' does not exist")
    
    @staticmethod
    def update_platform_service(platform_name: str, service_name: str, **kwargs) -> PlatformService:
        """Update a platform-service combination"""
        try:
            platform_service = PlatformService.objects.get(
                platform__name=platform_name,
                service__name=service_name
            )
            
            for key, value in kwargs.items():
                setattr(platform_service, key, value)
            
            platform_service.save()
            return platform_service
        except PlatformService.DoesNotExist:
            raise ValidationError(f"Platform-service combination '{platform_name}-{service_name}' does not exist")
    
    @staticmethod
    def disable_platform_service(platform_name: str, service_name: str) -> bool:
        """Disable a platform-service combination"""
        try:
            platform_service = PlatformService.objects.get(
                platform__name=platform_name,
                service__name=service_name
            )
            platform_service.is_enabled = False
            platform_service.save()
            return True
        except PlatformService.DoesNotExist:
            return False
    
    @staticmethod
    def enable_platform_service(platform_name: str, service_name: str) -> bool:
        """Enable a platform-service combination"""
        try:
            platform_service = PlatformService.objects.get(
                platform__name=platform_name,
                service__name=service_name
            )
            platform_service.is_enabled = True
            platform_service.save()
            return True
        except PlatformService.DoesNotExist:
            return False 
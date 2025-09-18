# Platform and Service Management Implementation

## Overview

This document outlines the implementation of a comprehensive platform and service management system for Track-Futura, allowing superadmins to configure available platforms and services, while regular users can only access enabled platform-service combinations.

## Business Rules Implemented

### 1. Platform Management Rules
- **BR-001**: A platform is a social media platform (e.g., Instagram, Facebook, LinkedIn, TikTok)
- **BR-002**: Each platform can provide one or more services
- **BR-003**: Only superadmin can configure (add/remove/enable/disable) platforms
- **BR-004**: Platforms can be enabled or disabled globally
- **BR-005**: Disabled platforms are not available for data scraping or folder creation

### 2. Service Management Rules
- **BR-006**: A service is a type of content that can be scraped (e.g., Posts, Reels, Comments, Profiles)
- **BR-007**: Each platform provides one or more services
- **BR-008**: Only superadmin can configure which services are available for each platform
- **BR-009**: Services can be enabled or disabled per platform
- **BR-010**: Disabled services are not available for data scraping or folder creation

### 3. User Permission Rules
- **BR-011**: Regular users can only see and use platforms that are configured and enabled by superadmin
- **BR-012**: Regular users can only see and use services that are configured and enabled for each platform
- **BR-013**: Users cannot create folders for platforms or services that are not available

### 4. Folder Creation Rules
- **BR-014**: Creating a data storage folder requires selecting an available platform
- **BR-015**: After selecting a platform, users must choose from available services for that platform
- **BR-016**: Folder creation is restricted to only configured and enabled platform-service combinations
- **BR-017**: Folder categories must match the selected service type

## Database Schema

### Models Created

#### 1. Platform Model
```python
class Platform(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., 'instagram', 'facebook'
    display_name = models.CharField(max_length=100)  # e.g., 'Instagram', 'Facebook'
    is_enabled = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    icon_name = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 2. Service Model
```python
class Service(models.Model):
    name = models.CharField(max_length=50, unique=True)  # e.g., 'posts', 'reels', 'comments'
    display_name = models.CharField(max_length=100)  # e.g., 'Posts', 'Reels', 'Comments'
    description = models.TextField(blank=True, null=True)
    icon_name = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 3. PlatformService Model
```python
class PlatformService(models.Model):
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    is_enabled = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['platform', 'service']
```

## API Endpoints

### Superadmin Endpoints (Require Superadmin Permission)

#### Platform Management
- `GET /api/users/platforms/` - List all platforms
- `POST /api/users/platforms/` - Create new platform
- `PUT /api/users/platforms/{id}/` - Update platform
- `DELETE /api/users/platforms/{id}/` - Delete platform

#### Service Management
- `GET /api/users/services/` - List all services
- `POST /api/users/services/` - Create new service
- `PUT /api/users/services/{id}/` - Update service
- `DELETE /api/users/services/{id}/` - Delete service

#### Platform-Service Management
- `GET /api/users/platform-services/` - List all platform-service combinations
- `POST /api/users/platform-services/` - Create new platform-service combination
- `PUT /api/users/platform-services/{id}/` - Update platform-service combination
- `DELETE /api/users/platform-services/{id}/` - Delete platform-service combination

### User Endpoints (Available to All Authenticated Users)

#### Available Platforms and Services
- `GET /api/users/available-platforms/` - Get enabled platforms with their services
- `GET /api/users/available-platforms/{id}/services/` - Get services for specific platform
- `GET /api/users/available-platforms/all_available/` - Get all available platform-service combinations

## Initial Data

The system comes pre-populated with the following data:

### Platforms
1. **Instagram** - Instagram social media platform
2. **Facebook** - Facebook social media platform
3. **LinkedIn** - LinkedIn professional network
4. **TikTok** - TikTok short-form video platform

### Services
1. **Posts** - Regular posts and content
2. **Reels** - Short-form video content
3. **Comments** - Comments on posts and content
4. **Profiles** - User profile information

### Platform-Service Combinations
- **Instagram**: Posts, Reels, Comments, Profiles
- **Facebook**: Posts, Reels, Comments
- **LinkedIn**: Posts, Profiles
- **TikTok**: Posts, Comments

## Management Commands

### Populate Initial Data
```bash
python manage.py populate_platforms_services
```

This command:
- Creates the initial platforms and services
- Sets up the platform-service combinations
- Associates all data with the first superuser found

## Frontend Integration

### API Service
Created `frontend/src/services/platformService.ts` with:
- TypeScript interfaces for all models
- API methods for all endpoints
- Utility functions for validation and data retrieval
- Error handling and type safety

### Key Features
- **Platform Validation**: Ensures only enabled platforms are available
- **Service Validation**: Ensures only enabled services for each platform are available
- **Dynamic UI**: Platform and service selection based on configuration
- **Permission-Based Access**: Different endpoints for superadmin vs regular users

## Usage Examples

### For Superadmins

#### Adding a New Platform
```python
# Via Django Admin
# Or via API
POST /api/users/platforms/
{
    "name": "twitter",
    "display_name": "Twitter",
    "description": "Twitter social media platform",
    "icon_name": "twitter",
    "color": "#1DA1F2"
}
```

#### Adding a New Service
```python
# Via Django Admin
# Or via API
POST /api/users/services/
{
    "name": "tweets",
    "display_name": "Tweets",
    "description": "Twitter posts and content",
    "icon_name": "article"
}
```

#### Creating Platform-Service Combination
```python
# Via Django Admin
# Or via API
POST /api/users/platform-services/
{
    "platform": 5,  # Twitter platform ID
    "service": 5,   # Tweets service ID
    "is_enabled": true,
    "description": "Twitter Tweets"
}
```

### For Regular Users

#### Getting Available Platforms
```javascript
import { platformServiceAPI } from '../services/platformService';

const platforms = await platformServiceAPI.getAvailablePlatforms();
// Returns only enabled platforms with their available services
```

#### Validating Platform-Service Combination
```javascript
const isValid = await platformServiceAPI.validatePlatformService('instagram', 'posts');
// Returns true if Instagram Posts is available
```

## Security and Permissions

### Permission Classes
- **IsSuperAdmin**: Custom permission class for superadmin-only endpoints
- **IsAuthenticated**: Standard DRF permission for user endpoints

### Data Filtering
- Regular users only see enabled platforms and services
- Superadmins can see all data but are restricted by permission classes
- Platform-service combinations are filtered by both platform and service enabled status

## Integration Points

### Data Storage Integration
The platform-service system integrates with the existing data storage system:
- Folder creation now requires valid platform-service combinations
- Folder categories must match the selected service type
- Data scraping jobs are restricted to available platform-service combinations

### BrightData Integration
The system works with the existing BrightData configuration:
- Platform names match the existing platform choices
- Service names correspond to content types
- Platform-service combinations determine available scraping options

## Future Enhancements

### Planned Features
1. **Platform-Specific Configuration**: Additional settings per platform
2. **Service Templates**: Predefined service configurations
3. **Usage Analytics**: Track platform and service usage
4. **Bulk Operations**: Mass enable/disable platform-service combinations
5. **Audit Logging**: Track configuration changes
6. **API Rate Limiting**: Platform-specific rate limits
7. **Cost Management**: Platform-specific pricing and quotas

### Migration Path
The system is designed to be backward compatible:
- Existing hardcoded platform choices are preserved
- Existing folder structures remain intact
- Gradual migration from hardcoded to configurable system

## Testing

### Test Coverage
- Model validation and relationships
- API endpoint permissions and responses
- Business rule enforcement
- Data integrity constraints
- Frontend integration

### Test Commands
```bash
# Run all tests
python manage.py test users.tests

# Run specific test
python manage.py test users.tests.PlatformServiceTestCase
```

## Deployment Notes

### Database Migration
```bash
python manage.py makemigrations users
python manage.py migrate
```

### Initial Setup
```bash
# Create superuser first
python manage.py createsuperuser

# Populate initial data
python manage.py populate_platforms_services
```

### Environment Variables
No additional environment variables required. The system uses existing Django settings.

## Conclusion

This implementation provides a robust, scalable platform and service management system that:
- Enforces business rules through database constraints and API permissions
- Provides flexible configuration for superadmins
- Ensures data integrity and security
- Maintains backward compatibility
- Supports future enhancements and scalability

The system is now ready for integration with the existing data storage and scraping workflows.

---

## 🚀 **Phase 1 Implementation Changes - Core Features**

This section documents the enhancements and new features required for Phase 1 implementation to fulfill the Track Futura core requirements.

### **1.1 Super Admin Core Features (CRITICAL MISSING)**

#### **New Models to Create:**

##### **Customer Management Model**
```python
# backend/users/models.py - Add to existing models

class Customer(models.Model):
    """Model for managing tenant admin customers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('suspended', 'Suspended'), 
        ('deleted', 'Deleted')
    ], default='active')
    access_config = models.JSONField(default=dict, help_text="Platform-service access configuration")
    usage_analytics = models.JSONField(default=dict, help_text="Usage tracking and analytics")
    billing_info = models.JSONField(default=dict, help_text="Billing and subscription information")
    assigned_super_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_customers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
    
    def __str__(self):
        return f"{self.user.username} - {self.status}"
```

##### **Developer Mode Session Model**
```python
class DeveloperModeSession(models.Model):
    """Model for managing super admin developer mode sessions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='developer_sessions')
    is_active = models.BooleanField(default=False)
    current_organization = models.ForeignKey('Organization', on_delete=models.SET_NULL, null=True, blank=True)
    current_project = models.ForeignKey('Project', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Developer Mode Session"
        verbose_name_plural = "Developer Mode Sessions"
    
    def __str__(self):
        return f"{self.user.username} - {'Active' if self.is_active else 'Inactive'}"
```

##### **Dataset Configuration Model**
```python
class DatasetConfiguration(models.Model):
    """Model for super admin dataset ID configuration"""
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    dataset_id = models.CharField(max_length=100, help_text="BrightData dataset ID")
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['platform', 'service']
        verbose_name = "Dataset Configuration"
        verbose_name_plural = "Dataset Configurations"
    
    def __str__(self):
        return f"{self.platform.display_name} - {self.service.display_name} ({self.dataset_id})"
```

#### **Enhanced Service Model**
```python
# Update existing Service model in backend/users/models.py

class Service(models.Model):
    # ... existing fields ...
    template_config = models.JSONField(default=dict, help_text="Service template configuration")
    export_fields = models.JSONField(default=list, help_text="CSV export fields for this service")
    display_fields = models.JSONField(default=list, help_text="Display fields for this service")
    validation_rules = models.JSONField(default=dict, help_text="Validation rules for this service")
```

---

## 🚀 **Phase 1 Implementation Changes - Core Features**

This section documents the enhancements and new features required for Phase 1 implementation to fulfill the Track Futura core requirements.

### **1.1 Super Admin Core Features (CRITICAL MISSING)**

#### **New Models to Create:**

##### **Customer Management Model**
```python
# backend/users/models.py - Add to existing models

class Customer(models.Model):
    """Model for managing tenant admin customers"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('suspended', 'Suspended'), 
        ('deleted', 'Deleted')
    ], default='active')
    access_config = models.JSONField(default=dict, help_text="Platform-service access configuration")
    usage_analytics = models.JSONField(default=dict, help_text="Usage tracking and analytics")
    billing_info = models.JSONField(default=dict, help_text="Billing and subscription information")
    assigned_super_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_customers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
    
    def __str__(self):
        return f"{self.user.username} - {self.status}"
```

##### **Developer Mode Session Model**
```python
class DeveloperModeSession(models.Model):
    """Model for managing super admin developer mode sessions"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='developer_sessions')
    is_active = models.BooleanField(default=False)
    current_organization = models.ForeignKey('Organization', on_delete=models.SET_NULL, null=True, blank=True)
    current_project = models.ForeignKey('Project', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Developer Mode Session"
        verbose_name_plural = "Developer Mode Sessions"
    
    def __str__(self):
        return f"{self.user.username} - {'Active' if self.is_active else 'Inactive'}"
```

##### **Dataset Configuration Model**
```python
class DatasetConfiguration(models.Model):
    """Model for super admin dataset ID configuration"""
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    dataset_id = models.CharField(max_length=100, help_text="BrightData dataset ID")
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['platform', 'service']
        verbose_name = "Dataset Configuration"
        verbose_name_plural = "Dataset Configurations"
    
    def __str__(self):
        return f"{self.platform.display_name} - {self.service.display_name} ({self.dataset_id})"
```

#### **Enhanced Service Model**
```python
# Update existing Service model in backend/users/models.py

class Service(models.Model):
    # ... existing fields ...
    template_config = models.JSONField(default=dict, help_text="Service template configuration")
    export_fields = models.JSONField(default=list, help_text="CSV export fields for this service")
    display_fields = models.JSONField(default=list, help_text="Display fields for this service")
    validation_rules = models.JSONField(default=dict, help_text="Validation rules for this service")
```

#### **New API Endpoints:**

##### **Customer Management Endpoints**
```python
# backend/users/views.py - Add new ViewSets

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer management - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = CustomerSerializer
    
    def get_queryset(self):
        return Customer.objects.filter(assigned_super_admin=self.request.user)
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Send email invitation to customer"""
        customer = self.get_object()
        # Email invitation logic
        return Response({'message': 'Invitation sent successfully'})

class DeveloperModeViewSet(viewsets.ViewSet):
    """ViewSet for Developer Mode management - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle developer mode for super admin"""
        user = request.user
        session, created = DeveloperModeSession.objects.get_or_create(user=user)
        session.is_active = not session.is_active
        session.save()
        return Response({'is_active': session.is_active})
    
    @action(detail=False, methods=['get'])
    def organizations(self, request):
        """Get organizations for developer mode navigation"""
        organizations = Organization.objects.all()
        serializer = OrganizationSerializer(organizations, many=True)
        return Response(serializer.data)

class DatasetConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for Dataset Configuration - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = DatasetConfigurationSerializer
    queryset = DatasetConfiguration.objects.all()
```

#### **New Serializers:**
```python
# backend/users/serializers.py - Add new serializers

class CustomerSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

class DeveloperModeSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperModeSession
        fields = '__all__'

class DatasetConfigurationSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source='platform.display_name', read_only=True)
    service_name = serializers.CharField(source='service.display_name', read_only=True)
    
    class Meta:
        model = DatasetConfiguration
        fields = '__all__'
```
```python
# backend/users/views.py - Add new ViewSets

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet for Customer management - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = CustomerSerializer
    
    def get_queryset(self):
        return Customer.objects.filter(assigned_super_admin=self.request.user)
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Send email invitation to customer"""
        customer = self.get_object()
        # Email invitation logic
        return Response({'message': 'Invitation sent successfully'})

class DeveloperModeViewSet(viewsets.ViewSet):
    """ViewSet for Developer Mode management - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """Toggle developer mode for super admin"""
        user = request.user
        session, created = DeveloperModeSession.objects.get_or_create(user=user)
        session.is_active = not session.is_active
        session.save()
        return Response({'is_active': session.is_active})
    
    @action(detail=False, methods=['get'])
    def organizations(self, request):
        """Get organizations for developer mode navigation"""
        organizations = Organization.objects.all()
        serializer = OrganizationSerializer(organizations, many=True)
        return Response(serializer.data)

class DatasetConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for Dataset Configuration - Superadmin only"""
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = DatasetConfigurationSerializer
    queryset = DatasetConfiguration.objects.all()
```

#### **New Serializers:**
```python
# backend/users/serializers.py - Add new serializers

class CustomerSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

class DeveloperModeSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeveloperModeSession
        fields = '__all__'

class DatasetConfigurationSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(source='platform.display_name', read_only=True)
    service_name = serializers.CharField(source='service.display_name', read_only=True)
    
    class Meta:
        model = DatasetConfiguration
        fields = '__all__'
```

### **1.2 Core Workflow Management (CRITICAL MISSING)**

#### **New Workflow App:**
```bash
python manage.py startapp workflow
```

#### **Workflow Models:**
```python
# backend/workflow/models.py

from django.db import models
from users.models import Project, Platform, Service, DatasetConfiguration

class InputCollection(models.Model):
    """Model for input collection workflow"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    urls = models.JSONField(help_text="List of URLs for scraping")
    folder = models.ForeignKey('Folder', on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Input Collection"
        verbose_name_plural = "Input Collections"
    
    def __str__(self):
        return f"{self.platform.display_name} - {self.service.display_name} ({self.project.name})"

class ScraperTask(models.Model):
    """Model for scraper task management"""
    input_collection = models.ForeignKey(InputCollection, on_delete=models.CASCADE)
    dataset_config = models.ForeignKey(DatasetConfiguration, on_delete=models.CASCADE)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    auto_update = models.BooleanField(default=False)
    auto_update_frequency = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly')
    ], blank=True, null=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    brightdata_job_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Scraper Task"
        verbose_name_plural = "Scraper Tasks"
    
    def __str__(self):
        return f"Task {self.id} - {self.input_collection.platform.display_name}"
```

#### **Workflow API Endpoints:**
```python
# backend/workflow/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import InputCollection, ScraperTask
from .serializers import InputCollectionSerializer, ScraperTaskSerializer

class WorkflowViewSet(viewsets.ViewSet):
    """ViewSet for workflow management"""
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def platforms(self, request):
        """Get available platforms based on super admin configuration"""
        platforms = Platform.objects.filter(is_enabled=True)
        serializer = PlatformSerializer(platforms, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def services(self, request, platform):
        """Get available services for platform"""
        services = Service.objects.filter(
            platform_services__platform__name=platform,
            platform_services__is_enabled=True
        )
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def input_collection(self, request):
        """Create input collection"""
        serializer = InputCollectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def scraper_tasks(self, request):
        """Create scraper task"""
        serializer = ScraperTaskSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def tasks(self, request):
        """Get task list with status"""
        tasks = ScraperTask.objects.filter(
            input_collection__project__organization__members=request.user
        )
        serializer = ScraperTaskSerializer(tasks, many=True)
        return Response(serializer.data)
```

### **1.3 Service-Based Architecture (ENHANCEMENT NEEDED)**

#### **Service Templates App:**
```bash
python manage.py startapp templates
```

#### **Service Template Models:**
```python
# backend/templates/models.py

from django.db import models
from users.models import Service, Platform

class ServiceTemplate(models.Model):
    """Model for service-based templates"""
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE, null=True, blank=True)
    template_name = models.CharField(max_length=100)
    template_config = models.JSONField(help_text="Template configuration")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['service', 'platform', 'template_name']
        verbose_name = "Service Template"
        verbose_name_plural = "Service Templates"
    
    def __str__(self):
        platform_name = self.platform.display_name if self.platform else "All Platforms"
        return f"{self.service.display_name} - {platform_name} - {self.template_name}"
```

### **1.4 Frontend Implementation**

#### **New Pages to Create:**

##### **Super Admin Customer Management**
```typescript
// frontend/src/pages/admin/SuperAdminCustomerManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Email as EmailIcon } from '@mui/icons-material';

interface Customer {
  id: number;
  user: {
    username: string;
    email: string;
  };
  status: 'active' | 'suspended' | 'deleted';
  access_config: Record<string, any>;
  usage_analytics: Record<string, any>;
  billing_info: Record<string, any>;
}

const SuperAdminCustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Implementation for customer management interface
  // - Customer list with filtering and search
  // - Customer creation/editing forms
  // - Email invitation system
  // - Customer access configuration interface
  // - Customer status management
  // - Customer analytics dashboard

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customer Management
      </Typography>
      {/* Implementation details */}
    </Box>
  );
};

export default SuperAdminCustomerManagement;
```

##### **Super Admin Dataset Configuration**
```typescript
// frontend/src/pages/admin/SuperAdminDatasetConfiguration.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';

interface DatasetConfig {
  id: number;
  platform: {
    id: number;
    display_name: string;
  };
  service: {
    id: number;
    display_name: string;
  };
  dataset_id: string;
  is_active: boolean;
  description: string;
}

const SuperAdminDatasetConfiguration: React.FC = () => {
  const [configs, setConfigs] = useState<DatasetConfig[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<DatasetConfig | null>(null);

  // Implementation for dataset configuration interface
  // - Platform management with dataset ID configuration
  // - Service management with BrightData integration
  // - Platform-service mapping interface
  // - Dataset validation and testing tools
  // - Service template configuration

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dataset Configuration
      </Typography>
      {/* Implementation details */}
    </Box>
  );
};

export default SuperAdminDatasetConfiguration;
```

##### **Workflow Pages**
```typescript
// frontend/src/pages/InputCollectionWorkflow.tsx
// frontend/src/pages/DataScraperWorkflow.tsx
// frontend/src/pages/DataStorageWorkflow.tsx
// Implementation for core workflow management
```

### **1.5 Database Migrations**

#### **Create New Migrations:**
```bash
# Create migrations for new models
python manage.py makemigrations users --name add_customer_management
python manage.py makemigrations users --name add_developer_mode
python manage.py makemigrations users --name add_dataset_configuration
python manage.py makemigrations users --name enhance_service_model
python manage.py makemigrations workflow --name create_workflow_models
python manage.py makemigrations templates --name create_service_templates

# Apply migrations
python manage.py migrate
```

### **1.6 URL Configuration**

#### **Update URL Patterns:**
```python
# backend/config/urls.py - Add new URL patterns

urlpatterns = [
    # ... existing patterns ...
    path('api/super-admin/', include('users.urls_super_admin')),
    path('api/workflow/', include('workflow.urls')),
    path('api/templates/', include('templates.urls')),
]
```

#### **Create New URL Files:**
```python
# backend/users/urls_super_admin.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, DeveloperModeViewSet, DatasetConfigurationViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'developer-mode', DeveloperModeViewSet, basename='developer-mode')
router.register(r'dataset-configs', DatasetConfigurationViewSet, basename='dataset-config')

urlpatterns = [
    path('', include(router.urls)),
]
```

```python
# backend/workflow/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet

router = DefaultRouter()
router.register(r'', WorkflowViewSet, basename='workflow')

urlpatterns = [
    path('', include(router.urls)),
]
```

### **1.7 Environment Configuration**

#### **Add Environment Variables:**
```bash
# .env - Add new environment variables
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEVELOPER_MODE_ENABLED=true
CROSS_ORGANIZATION_ACCESS=true
```

### **1.8 Implementation Timeline**

#### **Week 1-2: Super Admin Core Features**
1. Create Customer, DeveloperModeSession, DatasetConfiguration models
2. Implement Customer management API endpoints
3. Implement Developer mode API endpoints
4. Create SuperAdminCustomerManagement page
5. Create SuperAdminDatasetConfiguration page

#### **Week 3-4: Core Workflow Management**
1. Create workflow app with InputCollection and ScraperTask models
2. Implement workflow API endpoints
3. Create InputCollectionWorkflow page
4. Create DataScraperWorkflow page
5. Create DataStorageWorkflow page

#### **Week 5-6: Service-Based Architecture**
1. Enhance Service model with template configuration
2. Create ServiceTemplate model
3. Enhance UniversalDataDisplay component
4. Create PlatformServiceSelector component
5. Implement cross-platform template sharing

#### **Week 7-8: Integration & Testing**
1. Integrate all components
2. Implement email invitation system
3. Add comprehensive error handling
4. Add validation and testing
5. Documentation and deployment preparation

### **1.9 Success Criteria for Phase 1**

- ✅ Super admin can create and manage tenant admin customers
- ✅ Super admin can configure dataset IDs for platform-service combinations
- ✅ Super admin can use developer mode to access tenant features
- ✅ Users can follow Input Collection → Data Scraper → Data Storage workflow
- ✅ Service-based templates work across platforms
- ✅ All core features are functional for super admin users

This Phase 1 implementation plan ensures that the core functionality required by Track Futura is delivered, focusing on the super admin features and workflow management that are currently missing from the implementation. 
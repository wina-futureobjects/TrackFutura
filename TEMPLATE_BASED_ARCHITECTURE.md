# Template-Based Architecture for Track Futura

## Overview

This document outlines the template-based architecture design to replace the current platform-specific models approach in Track Futura. This system will allow super admins to dynamically add new social media platforms and services without requiring code changes.

## Current System Problems

### Platform-Specific Models (Current Approach)
- **Facebook**: `FacebookPost` (170+ lines), `FacebookComment`, `Folder`
- **Instagram**: `InstagramPost` (100+ lines), `Folder` 
- **LinkedIn**: `LinkedInPost` (50+ lines), `Folder`
- **TikTok**: `TikTokPost` (80+ lines), `Folder`

### The Problem
- Each new platform requires creating a completely new model
- Each new service type (posts, comments, profiles, etc.) needs platform-specific models
- Massive code duplication across platforms
- Adding Twitter would require: `TwitterPost`, `TwitterComment`, `TwitterProfile`, etc.
- Adding YouTube would require: `YouTubeVideo`, `YouTubeComment`, `YouTubeChannel`, etc.

### Current Work Required for New Platform
- Create new Django app (`youtube_data/`)
- Create models (`YouTubeVideo`, `YouTubeComment`, etc.)
- Create serializers
- Create views and ViewSets
- Create migrations
- Update admin interface
- Update API endpoints
- Update frontend components
- Test everything

## Template-Based Solution

### 1. Universal Data Models

```python
class UniversalPost(models.Model):
    """Universal model for all platform posts"""
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    template = models.ForeignKey(ServiceTemplate, on_delete=models.CASCADE)
    
    # Dynamic data storage
    raw_data = models.JSONField()  # Original Brightdata response
    processed_data = models.JSONField()  # Template-processed data
    metadata = models.JSONField()  # Platform-specific metadata
    
    # Common fields that exist across all platforms
    url = models.URLField(max_length=500)
    post_id = models.CharField(max_length=100)
    user_posted = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    date_posted = models.DateTimeField(null=True, blank=True)
    likes = models.IntegerField(default=0)
    
    # Folder relationship
    folder = models.ForeignKey('UniversalFolder', on_delete=models.CASCADE, related_name='posts')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class UniversalComment(models.Model):
    """Universal model for all platform comments"""
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    template = models.ForeignKey(ServiceTemplate, on_delete=models.CASCADE)
    
    # Dynamic data storage
    raw_data = models.JSONField()
    processed_data = models.JSONField()
    metadata = models.JSONField()
    
    # Common fields
    comment_id = models.CharField(max_length=255, unique=True)
    post_id = models.CharField(max_length=100)
    user_name = models.CharField(max_length=255, null=True, blank=True)
    comment_text = models.TextField(null=True, blank=True)
    date_created = models.DateTimeField(null=True, blank=True)
    num_likes = models.IntegerField(default=0)
    
    # Relationships
    post = models.ForeignKey(UniversalPost, on_delete=models.CASCADE, related_name='comments')
    folder = models.ForeignKey('UniversalFolder', on_delete=models.CASCADE, related_name='comments')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class UniversalFolder(models.Model):
    """Universal model for organizing data across all platforms"""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='universal_folders')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 2. Template System

```python
class ServiceTemplate(models.Model):
    """Template for processing Brightdata service responses"""
    service = models.OneToOneField(Service, on_delete=models.CASCADE)
    template_config = models.JSONField()  # Template structure
    version = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-version']

class TemplateFieldMapping(models.Model):
    """Field mappings for specific platforms"""
    template = models.ForeignKey(ServiceTemplate, on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    brightdata_field = models.CharField(max_length=100)
    internal_field = models.CharField(max_length=100)
    transformation_rule = models.CharField(max_length=100, blank=True)
    
    class Meta:
        unique_together = ['template', 'platform', 'brightdata_field']
```

### 3. Template Configuration Example

```json
{
  "id": "profile_scraping_v1",
  "name": "Profile Scraping",
  "description": "Extract user profile information",
  "brightdata_service": "profile_scraper",
  "version": "1.0",
  "output_schema": {
    "required_fields": ["username", "display_name"],
    "optional_fields": ["bio", "follower_count", "following_count", "profile_image"],
    "field_types": {
      "username": {"type": "string", "max_length": 100},
      "display_name": {"type": "string", "max_length": 200},
      "bio": {"type": "text", "max_length": 1000},
      "follower_count": {"type": "integer", "min_value": 0},
      "following_count": {"type": "integer", "min_value": 0},
      "profile_image": {"type": "url", "validation": "image_url"}
    }
  },
  "platform_mappings": {
    "facebook": {
      "username": "username",
      "display_name": "name",
      "bio": "about",
      "follower_count": "fan_count",
      "following_count": "follows_count",
      "profile_image": "profile_pic"
    },
    "twitter": {
      "username": "screen_name",
      "display_name": "name",
      "bio": "description",
      "follower_count": "followers_count",
      "following_count": "friends_count",
      "profile_image": "profile_image_url"
    },
    "instagram": {
      "username": "username",
      "display_name": "full_name",
      "bio": "biography",
      "follower_count": "edge_followed_by.count",
      "following_count": "edge_follow.count",
      "profile_image": "profile_pic_url_hd"
    }
  },
  "data_transformations": {
    "follower_count": "parse_integer",
    "following_count": "parse_integer",
    "profile_image": "validate_image_url"
  }
}
```

### 4. Template Processing Engine

```python
class TemplateProcessor:
    def __init__(self, template_config):
        self.template = template_config
        self.schema = template_config['output_schema']
        self.mappings = template_config['platform_mappings']
    
    def process_brightdata_response(self, raw_data, platform_name):
        """Process Brightdata response using template"""
        platform_mapping = self.mappings.get(platform_name, {})
        processed_data = {}
        
        for internal_field, brightdata_field in platform_mapping.items():
            if brightdata_field in raw_data:
                value = raw_data[brightdata_field]
                # Apply transformations
                processed_value = self.apply_transformations(
                    value, internal_field, platform_name
                )
                processed_data[internal_field] = processed_value
        
        # Validate against schema
        self.validate_processed_data(processed_data)
        return processed_data
    
    def apply_transformations(self, value, field_name, platform):
        """Apply field-specific transformations"""
        transformations = self.template.get('data_transformations', {})
        if field_name in transformations:
            transform_rule = transformations[field_name]
            return self.execute_transformation(value, transform_rule)
        return value
```

### 5. Super Admin Interface Features

#### Template Management Dashboard
- **Template Builder**: Visual interface to create/edit templates
- **Field Mapping Editor**: Drag-and-drop interface for mapping Brightdata fields to internal fields
- **Schema Validator**: Real-time validation of template structure
- **Preview Mode**: Test templates with sample Brightdata responses
- **Version Control**: Track template changes and rollback capabilities

#### Platform-Service Configuration
- **Dynamic Platform Addition**: Add new platforms with template selection
- **Service Template Assignment**: Assign existing templates to new platform-service combinations
- **Custom Field Mapping**: Override default mappings for specific platforms
- **Validation Testing**: Test configurations before activation

### 6. API Architecture

#### Template Management Endpoints
```
GET    /api/templates/                    # List all templates
POST   /api/templates/                    # Create new template
GET    /api/templates/{id}/               # Get template details
PUT    /api/templates/{id}/               # Update template
DELETE /api/templates/{id}/               # Delete template
POST   /api/templates/{id}/validate/      # Validate template
POST   /api/templates/{id}/test/          # Test with sample data
```

#### Dynamic Processing Endpoints
```
POST   /api/process/{platform}/{service}/ # Process Brightdata data
GET    /api/platforms/{id}/templates/     # Get available templates for platform
POST   /api/platforms/{id}/configure/     # Configure platform with templates
```

### 7. Migration Strategy

#### Phase 1: Template Infrastructure
- Create template models and API endpoints
- Build template management interface
- Implement basic template processor

#### Phase 2: Platform Migration
- Convert existing platforms to use templates
- Create templates for current services (profile scraping, post scraping, etc.)
- Test with existing Brightdata integrations

#### Phase 3: Dynamic Expansion
- Enable super admin template creation
- Add new platforms through interface
- Implement template versioning and rollback

#### Phase 4: Cleanup
- Remove old platform-specific models
- Update all references to use universal models
- Optimize database queries

### 8. Benefits

#### For Super Admins
- Add new social media platforms without developer intervention
- Customize data processing for specific business needs
- Maintain consistent data quality across platforms

#### For Developers
- Reduced maintenance burden for platform-specific code
- Centralized data processing logic
- Easier testing and validation

#### For Users
- Faster platform additions
- Consistent data format across all platforms
- More reliable data processing

### 9. Example: Adding Twitter

#### Current Approach (Requires Coding)
1. Create `twitter_data/` Django app
2. Create `TwitterPost`, `TwitterComment`, `TwitterProfile` models
3. Create serializers and ViewSets
4. Create migrations
5. Update admin interface
6. Update API endpoints
7. Update frontend components
8. Test everything

#### Template Approach (No Coding)
1. Super admin clicks "Add New Platform"
2. Enters: Platform Name = "Twitter", Display Name = "Twitter"
3. Selects available services: "Posts", "Comments", "Profiles"
4. For each service, selects existing templates or creates new ones
5. System automatically creates necessary database relationships
6. **Ready to use immediately!**

### 10. Technical Considerations

#### Database Schema Extensions
- Extend `Service` model to include template configuration
- Add template validation and versioning
- Store field mappings and transformation rules

#### API Enhancements
- Template CRUD operations
- Template validation endpoints
- Dynamic data processing based on templates

#### Brightdata Integration
- Route responses through template processors
- Handle platform-specific data transformations
- Maintain backward compatibility with existing platforms

## Conclusion

This template-based approach would transform Track Futura from a hardcoded multi-platform system into a truly dynamic, extensible platform where super admins can add new social media platforms and services without any development work.

The system maintains all existing functionality while providing unprecedented flexibility for future expansion. Adding new platforms becomes a simple configuration task rather than a major development effort.

**Implementation Priority**: High - This would significantly reduce development overhead and enable rapid platform expansion. 
from rest_framework import serializers
from .models import TrackSource, ReportFolder, ReportEntry, UnifiedRunFolder
from users.models import Project

class TrackSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrackSource
        fields = [
            'id', 'name',
            'platform', 'service_name',
            'facebook_link', 'instagram_link', 'linkedin_link', 'tiktok_link', 
            'other_social_media',
            'url_count',
            'project', 'created_at', 'updated_at'
        ]
    
    def _normalize_service_name(self, service_name):
        """
        Normalize service name from frontend format to backend format
        Frontend sends: instagram_posts, facebook_pages_posts, linkedin_posts, tiktok_posts
        Backend expects: posts, reels, comments
        """
        if not service_name:
            return service_name
            
        # Remove platform prefix and normalize
        if service_name.startswith('instagram_'):
            return service_name.replace('instagram_', '')
        elif service_name.startswith('facebook_'):
            # Handle facebook_pages_posts -> posts
            if service_name == 'facebook_pages_posts':
                return 'posts'
            elif service_name == 'facebook_reels_profile':
                return 'reels'
            else:
                return service_name.replace('facebook_', '')
        elif service_name.startswith('linkedin_'):
            return service_name.replace('linkedin_', '')
        elif service_name.startswith('tiktok_'):
            return service_name.replace('tiktok_', '')
        else:
            return service_name
    
    def create(self, validated_data):
        """
        Custom create method to ensure project ID is properly handled and service_name is normalized
        """
        # Normalize service_name if provided
        if 'service_name' in validated_data:
            validated_data['service_name'] = self._normalize_service_name(validated_data['service_name'])
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Custom update method to handle project ID updates and service_name normalization
        """
        # Normalize service_name if provided
        if 'service_name' in validated_data:
            validated_data['service_name'] = self._normalize_service_name(validated_data['service_name'])
        
        return super().update(instance, validated_data)

# Keep backward compatibility alias
TrackAccountSerializer = TrackSourceSerializer

class ReportEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEntry
        fields = [
            'id', 'name', 'entity', 'posting_date',
            'platform_type', 'post_url', 'username', 'account_type', 'keywords',
            'content', 'post_id', 'track_source_id', 'created_at'
        ]

class ReportFolderSerializer(serializers.ModelSerializer):
    match_percentage = serializers.SerializerMethodField()
    entry_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ReportFolder
        fields = [
            'id', 'name', 'description', 'start_date', 'end_date', 
            'total_posts', 'matched_posts', 'match_percentage', 
            'entry_count', 'source_folders', 'project', 'created_at', 'updated_at'
        ]
    
    def get_match_percentage(self, obj):
        if obj.total_posts > 0:
            return round((obj.matched_posts / obj.total_posts) * 100)
        return 0
    
    def get_entry_count(self, obj):
        return obj.entries.count()

class ReportFolderDetailSerializer(ReportFolderSerializer):
    entries = ReportEntrySerializer(many=True, read_only=True)
    
    class Meta(ReportFolderSerializer.Meta):
        fields = ReportFolderSerializer.Meta.fields + ['entries']

class UnifiedRunFolderSerializer(serializers.ModelSerializer):
    platform = serializers.SerializerMethodField()
    category_display = serializers.SerializerMethodField()
    subfolders = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    
    class Meta:
        model = UnifiedRunFolder
        fields = [
            'id', 'name', 'description', 'folder_type', 'category', 'category_display',
            'platform_code', 'service_code', 'project', 'scraping_run', 'parent_folder', 
            'platform', 'subfolders', 'post_count', 'created_at', 'updated_at'
        ]
    
    def get_platform(self, obj):
        # Return the actual platform code if available, otherwise 'unified'
        return obj.platform_code or 'unified'
    
    def get_category_display(self, obj):
        # Return a human-readable category name
        category_display_map = {
            'posts': 'Posts',
            'reels': 'Reels', 
            'comments': 'Comments'
        }
        return category_display_map.get(obj.category, obj.category.title())
    
    def get_subfolders(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'subfolders' in obj._prefetched_objects_cache:
            return UnifiedRunFolderSerializer(obj.subfolders.all(), many=True).data
        return []
    
    def get_post_count(self, obj):
        return obj.get_content_count() 
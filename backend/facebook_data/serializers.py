from rest_framework import serializers
from .models import FacebookPost, Folder, FacebookComment, CommentScrapingJob

class FolderSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    reel_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    category_display = serializers.ReadOnlyField()
    platform = serializers.SerializerMethodField()
    subfolders = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'description', 'category', 'category_display', 'project', 
            'created_at', 'updated_at', 'post_count', 'reel_count', 'comment_count',
            'parent_folder', 'folder_type', 'scraping_run', 'platform', 'subfolders'
        ]
    
    def create(self, validated_data):
        """
        Custom create method to ensure project ID is properly handled
        """
        # Extract project from validated data
        project = validated_data.get('project')
        
        # If no project is provided but it's required, try to get from context
        if not project:
            request = self.context.get('request')
            if request and hasattr(request, 'data'):
                project_id = request.data.get('project')
                if project_id:
                    from users.models import Project
                    try:
                        project = Project.objects.get(id=project_id)
                        validated_data['project'] = project
                    except Project.DoesNotExist:
                        pass
        
        # Create the folder
        folder = Folder.objects.create(**validated_data)
        
        # Double-check project assignment (failsafe)
        if not folder.project_id and project:
            folder.project = project
            folder.save()
        
        return folder
    
    def update(self, instance, validated_data):
        """
        Custom update method to ensure project ID is preserved
        """
        # If project is not in validated_data, preserve the existing one
        if 'project' not in validated_data and instance.project:
            validated_data['project'] = instance.project
        
        # Update the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance
    
    def get_post_count(self, obj):
        return obj.posts.filter(content_type='post').count()
    
    def get_reel_count(self, obj):
        return obj.posts.filter(content_type='reel').count()
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_platform(self, obj):
        return 'facebook'
    
    def get_subfolders(self, obj):
        # Only include subfolders if they exist and are prefetched
        if hasattr(obj, '_prefetched_objects_cache') and 'subfolders' in obj._prefetched_objects_cache:
            return FolderSerializer(obj.subfolders.all(), many=True).data
        return []

class FacebookPostSerializer(serializers.ModelSerializer):
    # Map fields to match frontend expectations
    user = serializers.CharField(source='user_username_raw', read_only=True)
    date = serializers.DateTimeField(source='date_posted', read_only=True)
    comments = serializers.IntegerField(source='num_comments', read_only=True)
    
    # Additional fields that the frontend might be using
    user_posted = serializers.CharField(source='user_username_raw', read_only=True)
    
    class Meta:
        model = FacebookPost
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class FacebookCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacebookComment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class CommentScrapingJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentScrapingJob
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'started_at', 'completed_at') 
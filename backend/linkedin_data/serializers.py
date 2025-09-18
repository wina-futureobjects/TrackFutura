from rest_framework import serializers
from .models import LinkedInPost, Folder

class LinkedInPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = LinkedInPost
        fields = '__all__'

class FolderSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    category_display = serializers.ReadOnlyField()
    platform = serializers.SerializerMethodField()
    subfolders = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'description', 'category', 'category_display', 'project', 
            'created_at', 'updated_at', 'post_count', 'parent_folder', 'folder_type', 
            'scraping_run', 'platform', 'subfolders'
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
        return obj.posts.count()
    
    def get_platform(self, obj):
        return 'linkedin'
    
    def get_subfolders(self, obj):
        # Only include subfolders if they exist and are prefetched
        if hasattr(obj, '_prefetched_objects_cache') and 'subfolders' in obj._prefetched_objects_cache:
            return FolderSerializer(obj.subfolders.all(), many=True).data
        return [] 
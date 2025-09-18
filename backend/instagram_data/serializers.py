from rest_framework import serializers
from .models import InstagramPost, Folder, InstagramComment, CommentScrapingJob

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
        
        # Multi-layer project ID protection
        if not project:
            request = self.context.get('request')
            if request:
                # Try to get project ID from request data
                project_id = request.data.get('project')
                if project_id:
                    try:
                        # Import here to avoid circular imports
                        from users.models import Project
                        project = Project.objects.get(id=project_id)
                        validated_data['project'] = project
                        print(f"=== SERIALIZER DEBUG: Found project from request data: {project_id} ===")
                    except (Project.DoesNotExist, ValueError, TypeError) as e:
                        print(f"=== SERIALIZER DEBUG: Project lookup failed: {e} ===")
                        pass
                
                # Fallback: try to get from query parameters
                if not project and hasattr(request, 'query_params'):
                    project_id = request.query_params.get('project')
                    if project_id:
                        try:
                            from users.models import Project
                            project = Project.objects.get(id=project_id)
                            validated_data['project'] = project
                            print(f"=== SERIALIZER DEBUG: Found project from query params: {project_id} ===")
                        except (Project.DoesNotExist, ValueError, TypeError) as e:
                            print(f"=== SERIALIZER DEBUG: Project lookup from query params failed: {e} ===")
                            pass
        
        print(f"=== SERIALIZER DEBUG: Creating folder with validated_data: {validated_data} ===")
        
        # Create the folder
        folder = Folder.objects.create(**validated_data)
        
        # Double-check project assignment (failsafe)
        if not folder.project_id and project:
            folder.project = project
            folder.save()
            print(f"=== SERIALIZER DEBUG: Applied project failsafe, folder.project_id: {folder.project_id} ===")
        
        # Final verification
        folder.refresh_from_db()
        print(f"=== SERIALIZER DEBUG: Final folder state - ID: {folder.id}, Project ID: {folder.project_id} ===")
        
        return folder
    
    def update(self, instance, validated_data):
        """
        Custom update method to ensure project ID is preserved
        """
        # Multi-layer project preservation
        original_project = instance.project
        
        # If project is not in validated_data, preserve the existing one
        if 'project' not in validated_data and original_project:
            validated_data['project'] = original_project
        
        # Additional safety check: if project is None but instance had one, restore it
        if validated_data.get('project') is None and original_project:
            validated_data['project'] = original_project
        
        # Try to get project from request if it's missing
        if not validated_data.get('project'):
            request = self.context.get('request')
            if request:
                project_id = request.data.get('project')
                if project_id:
                    try:
                        from users.models import Project
                        project = Project.objects.get(id=project_id)
                        validated_data['project'] = project
                    except (Project.DoesNotExist, ValueError, TypeError):
                        # If lookup fails, preserve original
                        if original_project:
                            validated_data['project'] = original_project
        
        # Update the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Verification: ensure project wasn't lost
        if not instance.project_id and original_project:
            instance.project = original_project
            instance.save()
        
        return instance
    
    def get_post_count(self, obj):
        # Fix: exclude reels instead of filtering for non-existent 'post' content_type
        # Posts are content_type='Image' or 'Carousel', reels are content_type='reel'
        return obj.posts.exclude(content_type='reel').count()
    
    def get_reel_count(self, obj):
        return obj.posts.filter(content_type='reel').count()
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_platform(self, obj):
        return 'instagram'
    
    def get_subfolders(self, obj):
        # Only include subfolders if they exist and are prefetched
        if hasattr(obj, '_prefetched_objects_cache') and 'subfolders' in obj._prefetched_objects_cache:
            return FolderSerializer(obj.subfolders.all(), many=True).data
        return []

class InstagramPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstagramPost
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class InstagramCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstagramComment
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

class CommentScrapingJobSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    result_folder_name = serializers.CharField(source='result_folder.name', read_only=True)
    
    class Meta:
        model = CommentScrapingJob
        fields = [
            'id', 'name', 'project', 'selected_folders', 'status', 'status_display',
            'total_posts', 'processed_posts', 'successful_requests', 'failed_requests',
            'total_comments_scraped', 'brightdata_job_id', 'error_log',
            'result_folder', 'result_folder_name', 'created_at', 'updated_at',
            'started_at', 'completed_at'
        ]
        read_only_fields = (
            'created_at', 'updated_at', 'started_at', 'completed_at',
            'status', 'total_posts', 'processed_posts', 'successful_requests',
            'failed_requests', 'total_comments_scraped', 'brightdata_job_id',
            'error_log'
        ) 
from rest_framework import serializers
from .models import InputCollection, WorkflowTask, ScheduledScrapingTask, ScrapingRun, ScrapingJob
from users.serializers import PlatformSerializer, ServiceSerializer, ProjectSerializer

class InputCollectionSerializer(serializers.ModelSerializer):
    platform_name = serializers.CharField(read_only=True)
    service_name = serializers.CharField(read_only=True)
    url_count = serializers.IntegerField(read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    platform_service_details = serializers.SerializerMethodField()
    
    class Meta:
        model = InputCollection
        fields = [
            'id', 'project', 'project_name', 'platform_service', 'platform_service_details',
            'platform_name', 'service_name', 'urls', 'url_count', 'status', 
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'platform_name', 'service_name', 'url_count']
    
    def get_platform_service_details(self, obj):
        if obj.platform_service:
            return {
                'platform': PlatformSerializer(obj.platform_service.platform).data,
                'service': ServiceSerializer(obj.platform_service.service).data,
                'is_enabled': obj.platform_service.is_enabled
            }
        return None
    
    def validate_urls(self, value):
        """Validate that URLs is a list and not empty"""
        if not isinstance(value, list):
            raise serializers.ValidationError("URLs must be a list")
        if len(value) == 0:
            raise serializers.ValidationError("At least one URL is required")
        return value

class ScrapingJobSerializer(serializers.ModelSerializer):
    input_collection_name = serializers.CharField(source='input_collection.__str__', read_only=True)
    batch_job_name = serializers.CharField(source='batch_job.name', read_only=True)
    batch_job_status = serializers.CharField(source='batch_job.status', read_only=True)
    
    class Meta:
        model = ScrapingJob
        fields = [
            'id', 'scraping_run', 'input_collection', 'input_collection_name',
            'batch_job', 'batch_job_name', 'batch_job_status', 'status',
            'dataset_id', 'platform', 'service_type', 'url', 'error_message',
            'retry_count', 'created_at', 'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'started_at', 'completed_at', 
                           'input_collection_name', 'batch_job_name', 'batch_job_status']

class ScrapingRunSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    scraping_jobs = ScrapingJobSerializer(many=True, read_only=True)
    
    class Meta:
        model = ScrapingRun
        fields = [
            'id', 'project', 'project_name', 'name', 'configuration', 'status',
            'total_jobs', 'completed_jobs', 'successful_jobs', 'failed_jobs',
            'progress_percentage', 'created_by', 'created_by_name',
            'created_at', 'started_at', 'completed_at', 'scraping_jobs'
        ]
        read_only_fields = ['id', 'created_at', 'started_at', 'completed_at',
                           'project_name', 'created_by_name', 'progress_percentage',
                           'total_jobs', 'completed_jobs', 'successful_jobs', 'failed_jobs']
    
    def validate(self, data):
        """Validate that start_date and end_date are provided in configuration"""
        configuration = data.get('configuration', {})
        
        # Validate that start_date and end_date are provided
        if not configuration.get('start_date'):
            raise serializers.ValidationError("Start date is required in configuration")
        
        if not configuration.get('end_date'):
            raise serializers.ValidationError("End date is required in configuration")
        
        # Validate that end_date is not before start_date
        try:
            from datetime import datetime
            start_date = datetime.fromisoformat(configuration['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(configuration['end_date'].replace('Z', '+00:00'))
            
            if end_date < start_date:
                raise serializers.ValidationError("End date cannot be before start date")
        except (ValueError, AttributeError):
            raise serializers.ValidationError("Invalid date format in configuration")
        
        return data

class WorkflowTaskSerializer(serializers.ModelSerializer):
    input_collection_details = InputCollectionSerializer(source='input_collection', read_only=True)
    batch_job_name = serializers.CharField(source='batch_job.name', read_only=True)
    batch_job_status = serializers.CharField(source='batch_job.status', read_only=True)
    
    class Meta:
        model = WorkflowTask
        fields = [
            'id', 'input_collection', 'input_collection_details', 'batch_job', 
            'batch_job_name', 'batch_job_status', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'batch_job_name', 'batch_job_status']

class ScheduledScrapingTaskSerializer(serializers.ModelSerializer):
    track_source_name = serializers.CharField(source='track_source.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    platform_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduledScrapingTask
        fields = [
            'id', 'name', 'project', 'project_name', 'track_source', 'track_source_name',
            'platform', 'service_type', 'is_active', 'schedule_type', 'schedule_interval',
            'last_run', 'next_run', 'num_of_posts', 'start_date', 'end_date', 'auto_create_folders',
            'brightdata_dataset_id', 'brightdata_api_key', 'status', 'total_runs',
            'successful_runs', 'failed_runs', 'platform_url', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_run', 'next_run', 
                           'total_runs', 'successful_runs', 'failed_runs', 'platform_url']
    
    def get_platform_url(self, obj):
        """Get the platform URL from the TrackSource"""
        return obj.get_platform_url()
    
    def validate(self, data):
        """Validate that the TrackSource has a URL for the specified platform and dates are provided"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Validating scheduled task data: {data}")
        
        track_source = data.get('track_source')
        platform = data.get('platform')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        logger.info(f"Track source: {track_source}")
        logger.info(f"Platform: {platform}")
        logger.info(f"Start date: {start_date}")
        logger.info(f"End date: {end_date}")
        
        # Validate that start_date and end_date are provided
        if not start_date:
            raise serializers.ValidationError("Start date is required")
        
        if not end_date:
            raise serializers.ValidationError("End date is required")
        
        # Validate that end_date is not before start_date
        if end_date < start_date:
            raise serializers.ValidationError("End date cannot be before start date")
        
        if track_source and platform:
            # Check if the TrackSource has a URL for the specified platform
            platform_field_map = {
                'instagram': 'instagram_link',
                'facebook': 'facebook_link',
                'linkedin': 'linkedin_link',
                'tiktok': 'tiktok_link'
            }
            field_name = platform_field_map.get(platform)
            logger.info(f"Field name for platform {platform}: {field_name}")
            
            if field_name:
                platform_url = getattr(track_source, field_name, None)
                logger.info(f"Platform URL: {platform_url}")
                if not platform_url:
                    raise serializers.ValidationError(
                        f"TrackSource '{track_source.name}' does not have a {platform} URL"
                    )
        
        logger.info("Validation passed")
        return data

class InputCollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating input collections with automatic workflow task creation"""
    
    class Meta:
        model = InputCollection
        fields = ['project', 'platform_service', 'urls']
    
    def create(self, validated_data):
        # Set the created_by user
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data) 
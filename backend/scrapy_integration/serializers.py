from rest_framework import serializers
from .models import ScrapyConfig, ScrapyJob, ScrapyResult


class ScrapyConfigSerializer(serializers.ModelSerializer):
    """Serializer for ScrapyConfig model"""
    
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    
    class Meta:
        model = ScrapyConfig
        fields = [
            'id', 'name', 'platform', 'platform_display', 'content_type', 
            'content_type_display', 'is_active', 'description', 'delay_range',
            'user_agent_rotation', 'use_proxy', 'proxy_list', 'headless',
            'viewport_width', 'viewport_height', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class ScrapyJobSerializer(serializers.ModelSerializer):
    """Serializer for ScrapyJob model"""
    
    config_details = ScrapyConfigSerializer(source='config', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = ScrapyJob
        fields = [
            'id', 'name', 'project', 'config', 'config_details', 'target_urls',
            'source_names', 'num_of_posts', 'start_date', 'end_date',
            'output_folder_id', 'auto_create_folders', 'status', 'status_display',
            'total_urls', 'processed_urls', 'successful_scrapes', 'failed_scrapes',
            'progress_percentage', 'job_metadata', 'error_log', 'scrapy_process_id',
            'created_at', 'updated_at', 'started_at', 'completed_at'
        ]
        read_only_fields = [
            'total_urls', 'processed_urls', 'successful_scrapes', 'failed_scrapes',
            'job_metadata', 'error_log', 'scrapy_process_id', 'created_at',
            'updated_at', 'started_at', 'completed_at'
        ]
    
    def get_progress_percentage(self, obj):
        """Calculate progress percentage"""
        if obj.total_urls > 0:
            return round((obj.processed_urls / obj.total_urls) * 100, 2)
        return 0.0


class ScrapyResultSerializer(serializers.ModelSerializer):
    """Serializer for ScrapyResult model"""
    
    job_name = serializers.CharField(source='job.name', read_only=True)
    platform = serializers.CharField(source='job.config.platform', read_only=True)
    
    class Meta:
        model = ScrapyResult
        fields = [
            'id', 'job', 'job_name', 'platform', 'source_url', 'source_name',
            'scraped_data', 'processed_data', 'scrape_timestamp', 'success',
            'error_message', 'imported_to_platform', 'folder_id'
        ]
        read_only_fields = [
            'scrape_timestamp', 'success', 'error_message', 'imported_to_platform'
        ]


class ScrapingJobCreateSerializer(serializers.Serializer):
    """Serializer for creating new scraping jobs"""
    
    name = serializers.CharField(max_length=255)
    project_id = serializers.IntegerField()
    platform = serializers.ChoiceField(choices=ScrapyConfig.PLATFORM_CHOICES)
    content_type = serializers.ChoiceField(
        choices=ScrapyConfig.CONTENT_TYPE_CHOICES, 
        default='posts'
    )
    target_urls = serializers.ListField(
        child=serializers.URLField(),
        min_length=1,
        help_text="List of URLs to scrape"
    )
    source_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        help_text="List of source names corresponding to URLs"
    )
    num_of_posts = serializers.IntegerField(default=10, min_value=1, max_value=100)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    output_folder_id = serializers.IntegerField(required=False)
    auto_create_folders = serializers.BooleanField(default=True)
    
    def validate(self, data):
        """Validate the scraping job data"""
        
        # Check if start_date is before end_date
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError(
                    "Start date must be before end date"
                )
        
        # Ensure source_names list matches target_urls list if provided
        if data.get('source_names'):
            if len(data['source_names']) != len(data['target_urls']):
                raise serializers.ValidationError(
                    "Number of source names must match number of target URLs"
                )
        
        return data


class ScrapingJobStatusSerializer(serializers.Serializer):
    """Serializer for job status response"""
    
    id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.DictField()
    timestamps = serializers.DictField()
    error_log = serializers.CharField(allow_null=True)
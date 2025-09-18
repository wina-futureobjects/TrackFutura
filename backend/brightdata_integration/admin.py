from django.contrib import admin
from .models import BrightdataConfig, ScraperRequest, BatchScraperJob, BrightdataNotification, WebhookEvent

@admin.register(BrightdataConfig)
class BrightdataConfigAdmin(admin.ModelAdmin):
    list_display = ('name', 'platform', 'dataset_id', 'is_active', 'created_at', 'updated_at')
    list_filter = ('platform', 'is_active')
    search_fields = ('name', 'dataset_id', 'platform')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('platform', 'name')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'platform', 'description', 'is_active')
        }),
        ('API Configuration', {
            'fields': ('api_token', 'dataset_id')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(BatchScraperJob)
class BatchScraperJobAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'get_platforms_display', 'status', 'total_sources', 'processed_sources', 'created_at', 'completed_at')
    list_filter = ('status', 'auto_create_folders', 'created_at')
    search_fields = ('name', 'project__name')
    readonly_fields = ('created_at', 'updated_at', 'started_at', 'completed_at', 'total_sources', 'processed_sources', 'successful_requests', 'failed_requests')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Job Information', {
            'fields': ('name', 'project', 'status')
        }),
        ('Source Configuration', {
            'fields': ('source_folder_ids', 'platforms_to_scrape', 'content_types_to_scrape')
        }),
        ('Scraping Parameters', {
            'fields': ('num_of_posts', 'start_date', 'end_date')
        }),
        ('Output Configuration', {
            'fields': ('auto_create_folders', 'output_folder_pattern')
        }),
        ('Job Statistics', {
            'fields': ('total_sources', 'processed_sources', 'successful_requests', 'failed_requests'),
            'classes': ('collapse',)
        }),
        ('Job Details', {
            'fields': ('job_metadata', 'error_log'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ScraperRequest)
class ScraperRequestAdmin(admin.ModelAdmin):
    list_display = ('source_name', 'platform', 'content_type', 'target_url', 'status', 'batch_job', 'created_at', 'completed_at')
    list_filter = ('platform', 'content_type', 'status', 'batch_job')
    search_fields = ('target_url', 'request_id', 'source_name')
    readonly_fields = ('created_at', 'updated_at', 'completed_at', 'request_payload', 'response_metadata')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Request Info', {
            'fields': ('config', 'batch_job', 'platform', 'content_type', 'target_url', 'source_name', 'num_of_posts', 
                       'posts_to_not_include', 'start_date', 'end_date', 'folder_id')
        }),
        ('Response Info', {
            'fields': ('status', 'request_id', 'error_message', 'completed_at')
        }),
        ('Raw Data', {
            'classes': ('collapse',),
            'fields': ('request_payload', 'response_metadata'),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('id', 'platform', 'snapshot_id', 'status', 'received_at', 'processed_at')
    list_filter = ('platform', 'status', 'received_at')
    search_fields = ('snapshot_id', 'platform')
    readonly_fields = ('received_at', 'processed_at')
    ordering = ('-received_at',)
    
    fieldsets = (
        ('Event Information', {
            'fields': ('platform', 'snapshot_id', 'status')
        }),
        ('Timestamps', {
            'fields': ('received_at', 'processed_at')
        }),
        ('Raw Payload', {
            'classes': ('collapse',),
            'fields': ('raw_payload',)
        }),
        ('Error Information', {
            'classes': ('collapse',),
            'fields': ('error_message',)
        }),
    )
    
    def has_add_permission(self, request):
        return False  # Webhook events should only be created by webhooks

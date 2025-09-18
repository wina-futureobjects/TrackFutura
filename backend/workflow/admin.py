from django.contrib import admin
from .models import InputCollection, WorkflowTask, ScrapingRun, ScrapingJob, ScheduledScrapingTask

@admin.register(InputCollection)
class InputCollectionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'project', 'platform_name', 'service_name', 
        'url_count', 'status', 'created_by', 'created_at'
    ]
    list_filter = ['status', 'created_at', 'platform_service__platform', 'platform_service__service']
    search_fields = ['project__name', 'platform_service__platform__display_name', 'platform_service__service__display_name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'platform_name', 'service_name', 'url_count']
    date_hierarchy = 'created_at'
    
    def platform_name(self, obj):
        return obj.platform_name
    platform_name.short_description = 'Platform'
    
    def service_name(self, obj):
        return obj.service_name
    service_name.short_description = 'Service'
    
    def url_count(self, obj):
        return obj.url_count
    url_count.short_description = 'URL Count'

@admin.register(WorkflowTask)
class WorkflowTaskAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'input_collection', 'batch_job', 'status', 'created_at'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['input_collection__project__name', 'batch_job__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'


class ScrapingJobInline(admin.TabularInline):
    model = ScrapingJob
    extra = 0
    fields = ('id', 'batch_job', 'platform', 'service_type', 'status', 'url', 'created_at')
    readonly_fields = ('id', 'created_at')


@admin.register(ScrapingRun)
class ScrapingRunAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'project', 'name', 'status', 'total_jobs', 'completed_jobs', 'successful_jobs', 'failed_jobs',
        'created_at', 'started_at', 'completed_at'
    )
    list_filter = ('status', 'project', 'created_at')
    search_fields = ('name', 'project__name')
    readonly_fields = ('id', 'created_at', 'started_at', 'completed_at')
    date_hierarchy = 'created_at'
    inlines = [ScrapingJobInline]


@admin.register(ScrapingJob)
class ScrapingJobAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'scraping_run', 'batch_job', 'platform', 'service_type', 'status', 'created_at'
    )
    list_filter = ('status', 'platform', 'service_type', 'created_at')
    search_fields = ('scraping_run__project__name', 'batch_job__name', 'url')
    readonly_fields = ('id', 'created_at', 'started_at', 'completed_at')
    date_hierarchy = 'created_at'


@admin.register(ScheduledScrapingTask)
class ScheduledScrapingTaskAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'name', 'project', 'track_source', 'platform', 'service_type', 'status', 'is_active',
        'schedule_type', 'schedule_interval', 'last_run', 'next_run', 'created_at'
    )
    list_filter = ('status', 'is_active', 'platform', 'service_type', 'schedule_type', 'created_at')
    search_fields = ('name', 'project__name', 'track_source__name')
    readonly_fields = ('id', 'created_at', 'updated_at', 'last_run', 'next_run')
    date_hierarchy = 'created_at'

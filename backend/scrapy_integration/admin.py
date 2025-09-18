from django.contrib import admin
from django.utils.html import format_html
from .models import ScrapyConfig, ScrapyJob, ScrapyResult


@admin.register(ScrapyConfig)
class ScrapyConfigAdmin(admin.ModelAdmin):
    list_display = ['name', 'platform', 'content_type', 'is_active', 'created_at']
    list_filter = ['platform', 'content_type', 'is_active']
    search_fields = ['name', 'platform']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'platform', 'content_type', 'is_active', 'description')
        }),
        ('Scraping Settings', {
            'fields': ('delay_range', 'user_agent_rotation', 'use_proxy', 'proxy_list')
        }),
        ('Browser Settings', {
            'fields': ('headless', 'viewport_width', 'viewport_height')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ScrapyJob)
class ScrapyJobAdmin(admin.ModelAdmin):
    list_display = ['name', 'platform_display', 'status', 'progress_display', 'created_at']
    list_filter = ['status', 'config__platform', 'created_at']
    search_fields = ['name', 'config__platform']
    readonly_fields = [
        'total_urls', 'processed_urls', 'successful_scrapes', 'failed_scrapes',
        'job_metadata', 'scrapy_process_id', 'created_at', 'updated_at',
        'started_at', 'completed_at'
    ]
    
    def platform_display(self, obj):
        return obj.config.get_platform_display()
    platform_display.short_description = 'Platform'
    
    def progress_display(self, obj):
        if obj.total_urls > 0:
            percentage = (obj.processed_urls / obj.total_urls) * 100
            if obj.status == 'completed':
                color = 'green'
            elif obj.status == 'failed':
                color = 'red'
            elif obj.status == 'running':
                color = 'orange'
            else:
                color = 'gray'
            
            return format_html(
                '<span style="color: {};">{:.1f}% ({}/{})</span>',
                color,
                percentage,
                obj.processed_urls,
                obj.total_urls
            )
        return 'N/A'
    progress_display.short_description = 'Progress'
    
    fieldsets = (
        ('Job Information', {
            'fields': ('name', 'project', 'config')
        }),
        ('Source Configuration', {
            'fields': ('target_urls', 'source_names', 'num_of_posts', 'start_date', 'end_date')
        }),
        ('Output Configuration', {
            'fields': ('output_folder_id', 'auto_create_folders')
        }),
        ('Job Status', {
            'fields': ('status', 'total_urls', 'processed_urls', 'successful_scrapes', 'failed_scrapes')
        }),
        ('Execution Details', {
            'fields': ('job_metadata', 'error_log', 'scrapy_process_id'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ScrapyResult)
class ScrapyResultAdmin(admin.ModelAdmin):
    list_display = ['job_name', 'platform_display', 'source_name', 'success', 'scrape_timestamp']
    list_filter = ['success', 'job__config__platform', 'imported_to_platform', 'scrape_timestamp']
    search_fields = ['job__name', 'source_name', 'source_url']
    readonly_fields = ['scrape_timestamp']
    
    def job_name(self, obj):
        return obj.job.name
    job_name.short_description = 'Job Name'
    
    def platform_display(self, obj):
        return obj.job.config.get_platform_display()
    platform_display.short_description = 'Platform'
    
    fieldsets = (
        ('Result Information', {
            'fields': ('job', 'source_url', 'source_name')
        }),
        ('Scraped Data', {
            'fields': ('scraped_data', 'processed_data')
        }),
        ('Status', {
            'fields': ('success', 'error_message', 'imported_to_platform', 'folder_id')
        }),
        ('Timestamps', {
            'fields': ('scrape_timestamp',)
        })
    )

from django.contrib import admin
from .models import TrackSource, TrackAccount, ReportFolder, ReportEntry, UnifiedRunFolder, ServiceFolderIndex

@admin.register(TrackSource)
class TrackSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'platform', 'service_name', 'facebook_link', 'instagram_link', 'linkedin_link', 'tiktok_link', 'project')
    list_filter = ('project', 'platform', 'service_name')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('created_at',)
    raw_id_fields = ('project',)
    list_select_related = ('project',)

# Keep backward compatibility alias
TrackAccountAdmin = TrackSourceAdmin

@admin.register(ReportFolder)
class ReportFolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'total_posts', 'matched_posts', 'get_match_percentage', 'project', 'created_at')
    list_filter = ('project', 'start_date', 'end_date')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'total_posts', 'matched_posts')
    ordering = ('-created_at',)
    raw_id_fields = ('project',)
    list_select_related = ('project',)
    
    def get_match_percentage(self, obj):
        if obj.total_posts > 0:
            return f"{round((obj.matched_posts / obj.total_posts) * 100)}%"
        return "0%"
    get_match_percentage.short_description = 'Match Percentage'

@admin.register(ReportEntry)
class ReportEntryAdmin(admin.ModelAdmin):
    list_display = ('username', 'name', 'platform_type', 'posting_date', 'track_source_id')
    list_filter = ('platform_type', 'report')
    search_fields = ('name', 'username', 'content')
    readonly_fields = ('created_at',)
    ordering = ('-posting_date',)

@admin.register(UnifiedRunFolder)
class UnifiedRunFolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'folder_type', 'category', 'platform_code', 'service_code', 'project', 'scraping_run', 'created_at')
    list_filter = ('folder_type', 'category', 'platform_code', 'service_code', 'project', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    raw_id_fields = ('project', 'scraping_run', 'parent_folder')
    list_select_related = ('project', 'scraping_run')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'folder_type', 'category')
        }),
        ('Platform & Service', {
            'fields': ('platform_code', 'service_code')
        }),
        ('Relationships', {
            'fields': ('project', 'scraping_run', 'parent_folder')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ServiceFolderIndex)
class ServiceFolderIndexAdmin(admin.ModelAdmin):
    list_display = ('scraping_run', 'platform_code', 'service_code', 'folder')
    list_filter = ('platform_code', 'service_code')
    search_fields = ('scraping_run__name', 'folder__name')
    raw_id_fields = ('scraping_run', 'folder')
    list_select_related = ('scraping_run', 'folder')

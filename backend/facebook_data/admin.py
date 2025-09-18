from django.contrib import admin
from .models import FacebookPost, Folder, FacebookComment, CommentScrapingJob

@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(FacebookPost)
class FacebookPostAdmin(admin.ModelAdmin):
    list_display = ('user_posted', 'post_id', 'content_type', 'likes', 'folder', 'date_posted')
    list_filter = ('content_type', 'is_verified', 'is_paid_partnership', 'folder')
    search_fields = ('user_posted', 'description', 'hashtags')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date_posted'
    ordering = ('-date_posted',)
    raw_id_fields = ('folder',)
    list_select_related = ('folder',)

@admin.register(FacebookComment)
class FacebookCommentAdmin(admin.ModelAdmin):
    list_display = ('user_name', 'post_id', 'comment_text_preview', 'num_likes', 'num_replies', 'date_created')
    list_filter = ('source_type', 'type', 'date_created')
    search_fields = ('user_name', 'comment_text', 'post_id', 'user_id')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date_created'
    ordering = ('-date_created',)
    raw_id_fields = ('facebook_post',)
    list_select_related = ('facebook_post',)
    
    def comment_text_preview(self, obj):
        """Show a preview of the comment text"""
        if obj.comment_text:
            return obj.comment_text[:100] + '...' if len(obj.comment_text) > 100 else obj.comment_text
        return '-'
    comment_text_preview.short_description = 'Comment Preview'

@admin.register(CommentScrapingJob)
class CommentScrapingJobAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'result_folder', 'total_posts', 'processed_posts', 'total_comments_scraped', 'created_at')
    list_filter = ('status', 'get_all_replies', 'created_at')
    search_fields = ('name', 'brightdata_job_id')
    readonly_fields = ('created_at', 'updated_at', 'started_at', 'completed_at', 'brightdata_response')
    raw_id_fields = ('project', 'result_folder')
    list_select_related = ('project', 'result_folder')
    ordering = ('-created_at',)
    
    def get_readonly_fields(self, request, obj=None):
        """Make certain fields readonly after creation"""
        readonly = list(self.readonly_fields)
        if obj:  # Editing existing object
            readonly.extend(['selected_folders', 'comment_limit', 'get_all_replies', 'result_folder'])
        return readonly 
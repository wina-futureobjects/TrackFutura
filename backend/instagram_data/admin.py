from django.contrib import admin
from .models import InstagramPost, Folder, InstagramComment, CommentScrapingJob

@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'category', 'get_post_count', 'get_comment_count', 'created_at', 'updated_at')
    list_filter = ('category',)
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    def get_post_count(self, obj):
        return obj.posts.count()
    get_post_count.short_description = 'Post Count'
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    get_comment_count.short_description = 'Comment Count'

@admin.register(InstagramPost)
class InstagramPostAdmin(admin.ModelAdmin):
    list_display = ('user_posted', 'post_id', 'get_content_type', 'product_type', 'likes', 'video_play_count', 'folder', 'date_posted')
    list_filter = ('content_type', 'product_type', 'is_verified', 'is_paid_partnership', 'folder')
    search_fields = ('user_posted', 'description', 'post_id', 'shortcode')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'date_posted'
    ordering = ('-date_posted',)
    raw_id_fields = ('folder',)
    list_select_related = ('folder',)
    
    def get_content_type(self, obj):
        """Display the content type with reel detection"""
        if obj.product_type == 'clips':
            return 'Reel'
        elif obj.content_type:
            return obj.content_type
        elif obj.video_play_count and obj.video_play_count > 0:
            return 'Video/Reel'
        elif obj.photos:
            return 'Photo(s)'
        return 'Unknown'
    get_content_type.short_description = 'Type'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('url', 'post_id', 'shortcode', 'content_id', 'instagram_pk', 'folder')
        }),
        ('User Information', {
            'fields': ('user_posted', 'user_posted_id', 'user_profile_url', 'profile_url', 'is_verified')
        }),
        ('Content', {
            'fields': ('description', 'hashtags', 'content_type', 'product_type', 'alt_text')
        }),
        ('Media', {
            'fields': ('photos', 'videos', 'images', 'thumbnail', 'photos_number')
        }),
        ('Video/Reel Specific', {
            'fields': ('video_url', 'audio_url', 'length', 'audio', 'videos_duration'),
            'classes': ('collapse',)
        }),
        ('Engagement Metrics', {
            'fields': ('likes', 'num_comments', 'views', 'video_play_count', 'video_view_count', 'engagement_score', 'engagement_score_view')
        }),
        ('Comments', {
            'fields': ('latest_comments', 'top_comments'),
            'classes': ('collapse',)
        }),
        ('Profile Data', {
            'fields': ('followers', 'posts_count', 'following', 'profile_image_link'),
            'classes': ('collapse',)
        }),
        ('Partnership & Collaboration', {
            'fields': ('is_paid_partnership', 'partnership_details', 'coauthor_producers'),
            'classes': ('collapse',)
        }),
        ('Additional Data', {
            'fields': ('tagged_users', 'post_content', 'location', 'discovery_input', 'has_handshake'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('date_posted', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(InstagramComment)
class InstagramCommentAdmin(admin.ModelAdmin):
    list_display = ('comment_user', 'comment_id', 'post_id', 'likes_number', 'replies_number', 'folder', 'comment_date')
    list_filter = ('folder', 'comment_date')
    search_fields = ('comment_user', 'comment', 'post_id', 'comment_id')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'comment_date'
    ordering = ('-comment_date',)
    raw_id_fields = ('folder', 'instagram_post')
    list_select_related = ('folder', 'instagram_post')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('comment_id', 'folder', 'instagram_post')
        }),
        ('Post Information', {
            'fields': ('post_id', 'post_url', 'post_user')
        }),
        ('Comment Details', {
            'fields': ('comment', 'comment_date', 'hashtag_comment')
        }),
        ('User Information', {
            'fields': ('comment_user', 'comment_user_url')
        }),
        ('Engagement', {
            'fields': ('likes_number', 'replies_number', 'replies', 'tagged_users_in_comment')
        }),
        ('Metadata', {
            'fields': ('url', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CommentScrapingJob)
class CommentScrapingJobAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'project', 'status', 'total_posts', 'processed_posts',
        'total_comments_scraped', 'result_folder', 'created_at', 'completed_at'
    ]
    list_filter = ['status', 'project', 'created_at']
    search_fields = ['name', 'project__name', 'result_folder__name']
    readonly_fields = [
        'status', 'total_posts', 'processed_posts', 'successful_requests',
        'failed_requests', 'total_comments_scraped', 'brightdata_job_id',
        'brightdata_response', 'error_log', 'created_at', 'updated_at',
        'started_at', 'completed_at'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'project', 'selected_folders', 'result_folder')
        }),
        ('Status and Progress', {
            'fields': (
                'status', 'total_posts', 'processed_posts', 
                'successful_requests', 'failed_requests', 'total_comments_scraped'
            )
        }),
        ('BrightData Information', {
            'fields': ('brightdata_job_id', 'brightdata_response'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
        ('Error Information', {
            'fields': ('error_log',),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ('name', 'project', 'selected_folders')
        return self.readonly_fields

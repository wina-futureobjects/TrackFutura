from django.db import models
from users.models import Project

# Create your models here.

class Folder(models.Model):
    """
    Model for organizing Instagram data into folders
    """
    CATEGORY_CHOICES = (
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
    )
    
    FOLDER_TYPE_CHOICES = (
        ('run', 'Scraping Run'),
        ('service', 'Platform Service'),
        ('content', 'Content Folder'),
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='posts')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='instagram_folders', null=True)
    
    # Hierarchical folder structure
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, related_name='subfolders', null=True, blank=True, help_text="Parent folder in the hierarchy")
    folder_type = models.CharField(max_length=20, choices=FOLDER_TYPE_CHOICES, default='content', help_text="Type of folder in the hierarchy")
    scraping_run = models.ForeignKey('workflow.ScrapingRun', on_delete=models.CASCADE, related_name='instagram_folders', null=True, blank=True, help_text="Associated scraping run")
    # Link back to unified job folder (nullable, for reliable joins from webhooks)
    unified_job_folder = models.ForeignKey('track_accounts.UnifiedRunFolder', on_delete=models.SET_NULL, null=True, blank=True, related_name='instagram_platform_folders', help_text="Linked unified job folder")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    @property
    def category_display(self):
        return dict(self.CATEGORY_CHOICES)[self.category]
    
    def get_content_count(self):
        """Get the count of content items in this folder based on category"""
        if self.folder_type == 'run':
            # For run folders, count all content in subfolders
            total_count = 0
            for subfolder in self.subfolders.all():
                total_count += subfolder.get_content_count()
            return total_count
        elif self.folder_type == 'service':
            # For service folders, count all content in subfolders
            total_count = 0
            for subfolder in self.subfolders.all():
                total_count += subfolder.get_content_count()
            return total_count
        else:
            # For content folders, count based on category
            if self.category == 'posts':
                # Posts should exclude reels (content_type='reel')
                return self.posts.exclude(content_type='reel').count()
            elif self.category == 'reels':
                # Reels have content_type='reel'
                return self.posts.filter(content_type='reel').count()
            elif self.category == 'comments':
                return self.comments.count()
        return 0
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['unified_job_folder']),
        ]

class InstagramPost(models.Model):
    """
    Model for storing Instagram post data (including reels)
    """
    # Add folder relationship
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='posts', null=True, blank=True)
    
    # Basic fields
    url = models.URLField(max_length=500)
    user_posted = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    hashtags = models.JSONField(null=True, blank=True)  # Changed to JSONField to store array
    num_comments = models.IntegerField(default=0)
    date_posted = models.DateTimeField(null=True, blank=True)
    likes = models.IntegerField(default=0)
    post_id = models.CharField(max_length=100)
    
    # Media content fields
    photos = models.JSONField(null=True, blank=True)  # Changed to JSONField for array
    videos = models.JSONField(null=True, blank=True)  # Changed to JSONField for array
    thumbnail = models.URLField(max_length=500, null=True, blank=True)
    
    # Video-specific fields (mainly for reels)
    views = models.IntegerField(null=True, blank=True)
    video_play_count = models.IntegerField(null=True, blank=True)
    video_view_count = models.IntegerField(null=True, blank=True)
    length = models.CharField(max_length=20, null=True, blank=True)  # String format like "22.293"
    video_url = models.URLField(max_length=1000, null=True, blank=True)
    audio_url = models.URLField(max_length=1000, null=True, blank=True)
    
    # Instagram-specific identifiers
    shortcode = models.CharField(max_length=255, null=True, blank=True)
    content_id = models.CharField(max_length=255, null=True, blank=True)
    instagram_pk = models.CharField(max_length=255, null=True, blank=True)  # Instagram's internal ID
    
    # Content classification
    content_type = models.CharField(max_length=50, null=True, blank=True)
    platform_type = models.CharField(max_length=50, null=True, blank=True)
    product_type = models.CharField(max_length=50, null=True, blank=True)  # "clips" for reels
    
    # User profile information
    user_posted_id = models.CharField(max_length=255, null=True, blank=True)
    followers = models.IntegerField(null=True, blank=True)
    posts_count = models.IntegerField(null=True, blank=True)
    following = models.IntegerField(null=True, blank=True)
    profile_image_link = models.URLField(max_length=500, null=True, blank=True)
    user_profile_url = models.URLField(max_length=500, null=True, blank=True)
    profile_url = models.URLField(max_length=500, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    
    # Partnership and collaboration
    is_paid_partnership = models.BooleanField(default=False)
    partnership_details = models.JSONField(null=True, blank=True)
    coauthor_producers = models.JSONField(null=True, blank=True)
    
    # Comments and engagement
    location = models.CharField(max_length=255, null=True, blank=True)
    latest_comments = models.JSONField(null=True, blank=True)  # Changed to JSONField
    top_comments = models.JSONField(null=True, blank=True)  # For reels
    engagement_score = models.FloatField(default=0.0)
    engagement_score_view = models.IntegerField(null=True, blank=True)
    
    # Tagged users and content
    tagged_users = models.JSONField(null=True, blank=True)  # Changed to JSONField
    
    # Audio information (mainly for reels)
    audio = models.JSONField(null=True, blank=True)
    
    # Post content structure (for carousel posts)
    post_content = models.JSONField(null=True, blank=True)
    
    # Video duration details
    videos_duration = models.JSONField(null=True, blank=True)
    
    # Image-specific fields
    images = models.JSONField(null=True, blank=True)
    photos_number = models.IntegerField(null=True, blank=True)
    alt_text = models.TextField(null=True, blank=True)
    
    # Legacy fields (keep for backward compatibility)
    discovery_input = models.CharField(max_length=255, null=True, blank=True)
    has_handshake = models.BooleanField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Post by {self.user_posted}"
    
    class Meta:
        ordering = ['-date_posted']
        verbose_name = "Instagram Post"
        verbose_name_plural = "Instagram Posts"
        unique_together = [['post_id', 'folder']]
        indexes = [
            models.Index(fields=['user_posted']),
            models.Index(fields=['post_id']),
            models.Index(fields=['date_posted']),
            models.Index(fields=['content_type']),
            models.Index(fields=['product_type']),
        ]

class InstagramComment(models.Model):
    """
    Model for storing Instagram comment data
    """
    # Basic identifiers
    comment_id = models.CharField(max_length=255, unique=False)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    instagram_post = models.ForeignKey(InstagramPost, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    
    # Post information
    post_id = models.CharField(max_length=255)
    post_url = models.URLField(max_length=500)
    post_user = models.CharField(max_length=255, null=True, blank=True)
    
    # Comment information
    comment = models.TextField()  # The actual comment text
    comment_date = models.DateTimeField(null=True, blank=True)
    
    # User information
    comment_user = models.CharField(max_length=255)
    comment_user_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Engagement metrics
    likes_number = models.IntegerField(default=0)
    replies_number = models.IntegerField(default=0)
    replies = models.JSONField(null=True, blank=True)  # Store replies as JSON
    
    # Additional fields from Instagram API
    hashtag_comment = models.TextField(null=True, blank=True)
    tagged_users_in_comment = models.JSONField(null=True, blank=True)
    
    # API source URL
    url = models.URLField(max_length=500, null=True, blank=True)  # Original profile URL that was scraped
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Comment by {self.comment_user} on {self.post_id}"
    
    class Meta:
        ordering = ['-comment_date']
        verbose_name = "Instagram Comment"
        verbose_name_plural = "Instagram Comments"
        unique_together = [['comment_id', 'folder']]
        indexes = [
            models.Index(fields=['comment_user']),
            models.Index(fields=['comment_id']),
            models.Index(fields=['post_id']),
            models.Index(fields=['comment_date']),
        ]

class CommentScrapingJob(models.Model):
    """
    Model for tracking Instagram comment scraping jobs
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    
    # Job identification
    name = models.CharField(max_length=255, help_text="Name for this comment scraping job")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='instagram_comment_scraping_jobs', null=True)
    
    # Result storage
    result_folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, related_name='instagram_scraping_jobs', null=True, blank=True, help_text="Folder to store scraped comments")
    
    # Source configuration
    selected_folders = models.JSONField(help_text="List of folder IDs to scrape comments from")
    
    # Job status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_posts = models.IntegerField(default=0, help_text="Total number of posts to process")
    processed_posts = models.IntegerField(default=0, help_text="Number of posts processed")
    successful_requests = models.IntegerField(default=0, help_text="Number of successful API requests")
    failed_requests = models.IntegerField(default=0, help_text="Number of failed API requests")
    total_comments_scraped = models.IntegerField(default=0, help_text="Total comments scraped")
    
    # BrightData job details
    brightdata_job_id = models.CharField(max_length=255, null=True, blank=True, help_text="BrightData job ID")
    brightdata_response = models.JSONField(null=True, blank=True, help_text="Full response from BrightData API")
    
    # Job execution details
    error_log = models.TextField(blank=True, null=True, help_text="Error messages and logs")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Instagram Comment Job: {self.name}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Instagram Comment Scraping Job"
        verbose_name_plural = "Instagram Comment Scraping Jobs"

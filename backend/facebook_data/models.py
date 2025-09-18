from django.db import models
from users.models import Project

# Create your models here.

class Folder(models.Model):
    """
    Model for organizing Facebook data into folders with different categories
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
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='posts', help_text="Type of content stored in this folder")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='facebook_folders', null=True)
    
    # Hierarchical folder structure
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, related_name='subfolders', null=True, blank=True, help_text="Parent folder in the hierarchy")
    folder_type = models.CharField(max_length=20, choices=FOLDER_TYPE_CHOICES, default='content', help_text="Type of folder in the hierarchy")
    scraping_run = models.ForeignKey('workflow.ScrapingRun', on_delete=models.CASCADE, related_name='facebook_folders', null=True, blank=True, help_text="Associated scraping run")
    # Link back to unified job folder (nullable, for reliable joins from webhooks)
    unified_job_folder = models.ForeignKey('track_accounts.UnifiedRunFolder', on_delete=models.SET_NULL, null=True, blank=True, related_name='facebook_platform_folders', help_text="Linked unified job folder")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
    
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
                return self.posts.count()
            elif self.category == 'reels':
                return self.posts.filter(content_type='reel').count()
            elif self.category == 'comments':
                return self.comments.count()
        return 0
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['unified_job_folder']),
        ]

class FacebookPost(models.Model):
    """
    Model for storing Facebook post data
    """
    # Add folder relationship
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='posts', null=True, blank=True)
    
    # Basic fields
    url = models.URLField(max_length=500)
    post_id = models.CharField(max_length=100)
    user_url = models.URLField(max_length=500, null=True, blank=True)
    user_posted = models.CharField(max_length=100, null=True, blank=True)
    user_username_raw = models.CharField(max_length=255, null=True, blank=True)
    
    # Content fields
    content = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)  # Legacy field
    hashtags = models.TextField(null=True, blank=True)
    date_posted = models.DateTimeField(null=True, blank=True)
    
    # Engagement metrics
    num_comments = models.IntegerField(default=0)
    num_shares = models.IntegerField(null=True, blank=True)
    likes = models.IntegerField(default=0)
    video_view_count = models.IntegerField(null=True, blank=True)
    num_likes_type = models.JSONField(null=True, blank=True)
    count_reactions_type = models.JSONField(null=True, blank=True)
    
    # Page/Profile information
    page_name = models.CharField(max_length=255, null=True, blank=True)
    profile_id = models.CharField(max_length=255, null=True, blank=True)
    page_intro = models.TextField(null=True, blank=True)
    page_category = models.CharField(max_length=255, null=True, blank=True)
    page_logo = models.URLField(max_length=500, null=True, blank=True)
    page_external_website = models.URLField(max_length=500, null=True, blank=True)
    page_likes = models.IntegerField(null=True, blank=True)
    page_followers = models.IntegerField(null=True, blank=True)
    page_is_verified = models.BooleanField(default=False)
    followers = models.IntegerField(null=True, blank=True)  # Legacy field
    page_phone = models.CharField(max_length=50, null=True, blank=True)
    page_email = models.EmailField(max_length=255, null=True, blank=True)
    page_creation_time = models.DateTimeField(null=True, blank=True)
    page_reviews_score = models.CharField(max_length=20, null=True, blank=True)
    page_reviewers_amount = models.IntegerField(null=True, blank=True)
    page_price_range = models.CharField(max_length=50, null=True, blank=True)
    
    # Media content
    photos = models.TextField(null=True, blank=True)  # Legacy field
    videos = models.TextField(null=True, blank=True)  # Legacy field
    attachments_data = models.JSONField(null=True, blank=True)  # Renamed from 'attachments'
    thumbnail = models.URLField(max_length=500, null=True, blank=True)
    external_link = models.URLField(max_length=500, null=True, blank=True)
    post_image = models.URLField(max_length=500, null=True, blank=True)
    
    # External content
    post_external_link = models.URLField(max_length=500, null=True, blank=True)
    post_external_title = models.CharField(max_length=500, null=True, blank=True)
    post_external_image = models.URLField(max_length=500, null=True, blank=True)
    link_description_text = models.TextField(null=True, blank=True)
    
    # Profile images and URLs
    page_url = models.URLField(max_length=500, null=True, blank=True)
    header_image = models.URLField(max_length=500, null=True, blank=True)
    avatar_image_url = models.URLField(max_length=500, null=True, blank=True)
    profile_handle = models.CharField(max_length=255, null=True, blank=True)
    profile_image_link = models.URLField(max_length=500, null=True, blank=True)  # Legacy field
    
    # Reel specific fields
    shortcode = models.CharField(max_length=255, null=True, blank=True)
    length = models.FloatField(null=True, blank=True)
    audio = models.CharField(max_length=100, null=True, blank=True)
    
    # Metadata and flags
    is_verified = models.BooleanField(default=False)  # Legacy field
    has_handshake = models.BooleanField(default=False, null=True, blank=True)
    is_sponsored = models.BooleanField(default=False, null=True, blank=True)
    sponsor_name = models.CharField(max_length=255, null=True, blank=True)
    is_paid_partnership = models.BooleanField(default=False)
    is_page = models.BooleanField(default=False, null=True, blank=True)
    include_profile_data = models.BooleanField(default=False, null=True, blank=True)
    
    # Additional metadata
    location = models.CharField(max_length=255, null=True, blank=True)  # Legacy field
    latest_comments = models.TextField(null=True, blank=True)
    about = models.TextField(null=True, blank=True)
    active_ads_urls = models.JSONField(null=True, blank=True)
    delegate_page_id = models.CharField(max_length=255, null=True, blank=True)
    original_post = models.JSONField(null=True, blank=True)
    other_posts_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Fetch parameters
    content_type = models.CharField(max_length=50, null=True, blank=True)
    platform_type = models.CharField(max_length=50, null=True, blank=True)
    post_type = models.CharField(max_length=50, null=True, blank=True)
    days_range = models.IntegerField(null=True, blank=True)
    num_of_posts = models.IntegerField(null=True, blank=True)
    posts_count = models.IntegerField(null=True, blank=True)  # Legacy field
    posts_to_not_include = models.TextField(null=True, blank=True)
    until_date = models.DateField(null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    following = models.IntegerField(null=True, blank=True)
    
    # API response fields
    timestamp = models.DateTimeField(null=True, blank=True)
    input = models.JSONField(null=True, blank=True)
    error = models.TextField(null=True, blank=True)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    warning = models.TextField(null=True, blank=True)
    warning_code = models.CharField(max_length=100, null=True, blank=True)
    
    # Other fields
    tagged_users = models.TextField(null=True, blank=True)
    engagement_score = models.FloatField(default=0.0)
    discovery_input = models.CharField(max_length=255, null=True, blank=True)  # Legacy field
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Post by {self.user_posted or self.page_name or 'Unknown'}"
    
    class Meta:
        ordering = ['-date_posted']
        verbose_name = "Facebook Post"
        verbose_name_plural = "Facebook Posts"
        unique_together = [['post_id', 'folder']]
        indexes = [
            models.Index(fields=['user_posted']),
            models.Index(fields=['post_id']),
            models.Index(fields=['date_posted']),
            models.Index(fields=['page_name']),
            models.Index(fields=['content_type']),
        ] 

class FacebookComment(models.Model):
    """
    Model for storing Facebook comment data from BrightData API
    """
    # Folder relationship for organizing comments
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='comments', null=True, blank=True, help_text="Folder containing this comment")
    
    # Relationship to the original post
    facebook_post = models.ForeignKey(
        FacebookPost, 
        on_delete=models.CASCADE, 
        related_name='comments', 
        null=True, 
        blank=True,
        help_text="Link to the original Facebook post if it exists in our database"
    )
    
    # Basic comment information
    url = models.URLField(max_length=500, help_text="URL of the Facebook post")
    post_id = models.CharField(max_length=100, help_text="Facebook post ID")
    post_url = models.URLField(max_length=500, help_text="Full URL of the Facebook post")
    comment_id = models.CharField(max_length=255, unique=True, help_text="Unique comment ID from Facebook")
    
    # User information
    user_name = models.CharField(max_length=255, null=True, blank=True, help_text="Name of the commenter")
    user_id = models.CharField(max_length=255, null=True, blank=True, help_text="Facebook user ID")
    user_url = models.URLField(max_length=500, null=True, blank=True, help_text="URL to commenter's profile")
    commentator_profile = models.URLField(max_length=500, null=True, blank=True, help_text="Commentator profile URL")
    
    # Comment content
    comment_text = models.TextField(null=True, blank=True, help_text="The actual comment text")
    date_created = models.DateTimeField(null=True, blank=True, help_text="When the comment was created")
    comment_link = models.URLField(max_length=500, null=True, blank=True, help_text="Direct link to the comment")
    
    # Engagement metrics
    num_likes = models.IntegerField(default=0, help_text="Number of likes on the comment")
    num_replies = models.IntegerField(default=0, help_text="Number of replies to the comment")
    
    # Media attachments
    attached_files = models.JSONField(null=True, blank=True, help_text="Any files attached to the comment")
    video_length = models.FloatField(null=True, blank=True, help_text="Length of video if attached")
    
    # BrightData metadata
    source_type = models.CharField(max_length=100, null=True, blank=True, help_text="Source type from BrightData")
    subtype = models.CharField(max_length=100, null=True, blank=True, help_text="Subtype from BrightData")
    type = models.CharField(max_length=100, null=True, blank=True, help_text="Type from BrightData")
    
    # System fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Comment by {self.user_name or 'Unknown'} on post {self.post_id}"
    
    class Meta:
        ordering = ['-date_created', '-created_at']
        verbose_name = "Facebook Comment"
        verbose_name_plural = "Facebook Comments"
        indexes = [
            models.Index(fields=['post_id']),
            models.Index(fields=['user_id']),
            models.Index(fields=['date_created']),
            models.Index(fields=['comment_id']),
        ]

class CommentScrapingJob(models.Model):
    """
    Model for tracking comment scraping jobs
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
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='comment_scraping_jobs', null=True)
    
    # Result storage
    result_folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, related_name='scraping_jobs', null=True, blank=True, help_text="Folder to store scraped comments")
    
    # Source configuration
    selected_folders = models.JSONField(help_text="List of folder IDs to scrape comments from")
    comment_limit = models.IntegerField(default=10, help_text="Number of comments to scrape per post")
    get_all_replies = models.BooleanField(default=False, help_text="Whether to get all replies to comments")
    
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
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Comment Scraping Job"
        verbose_name_plural = "Comment Scraping Jobs"
    
    def __str__(self):
        return f"{self.name} ({self.status})" 
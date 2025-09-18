from django.db import models
from users.models import Project
import json

# Create your models here.

class Folder(models.Model):
    """
    Model for organizing LinkedIn posts into folders
    """
    CATEGORY_CHOICES = (
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
    )
    
    FOLDER_TYPE_CHOICES = (
        ('run', 'Scraping Run'),
        ('platform', 'Platform'),
        ('service', 'Platform Service'),
        ('job', 'Job'),
        ('content', 'Content Folder'),
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='posts', help_text="Type of content stored in this folder")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='linkedin_folders', null=True)
    
    # Hierarchical folder structure
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, related_name='subfolders', null=True, blank=True, help_text="Parent folder in the hierarchy")
    folder_type = models.CharField(max_length=20, choices=FOLDER_TYPE_CHOICES, default='content', help_text="Type of folder in the hierarchy")
    scraping_run = models.ForeignKey('workflow.ScrapingRun', on_delete=models.CASCADE, related_name='linkedin_folders', null=True, blank=True, help_text="Associated scraping run")
    # Link back to unified job folder (nullable, for reliable joins from webhooks)
    unified_job_folder = models.ForeignKey('track_accounts.UnifiedRunFolder', on_delete=models.SET_NULL, null=True, blank=True, related_name='linkedin_platform_folders', help_text="Linked unified job folder")
    
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
        elif self.folder_type == 'platform':
            # For platform folders, count all content in subfolders
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
        elif self.folder_type == 'job':
            # For job folders, count based on category
            if self.category == 'posts':
                return self.posts.count()
            elif self.category == 'reels':
                return self.posts.filter(content_type='reel').count()
            elif self.category == 'comments':
                return self.comments.count()
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

class LinkedInComment(models.Model):
    """
    Model for storing LinkedIn comment data
    """
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    post = models.ForeignKey('LinkedInPost', on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    
    # Comment fields from BrightData payload
    comment_id = models.CharField(max_length=100, null=True, blank=True)
    comment_text = models.TextField(null=True, blank=True)
    comment_date = models.DateTimeField(null=True, blank=True)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    user_name = models.CharField(max_length=255, null=True, blank=True)
    user_url = models.URLField(max_length=500, null=True, blank=True)
    user_title = models.CharField(max_length=255, null=True, blank=True)
    num_reactions = models.IntegerField(default=0)
    tagged_users = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Comment by {self.user_name or self.user_id}"
    
    class Meta:
        ordering = ['-comment_date']
        verbose_name = "LinkedIn Comment"
        verbose_name_plural = "LinkedIn Comments"
        indexes = [
            models.Index(fields=['user_id']),
            models.Index(fields=['comment_date']),
        ]

class LinkedInPost(models.Model):
    """
    Model for storing LinkedIn post data
    """
    # Add folder relationship
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, related_name='posts', null=True, blank=True)
    
    # Core post fields (existing)
    url = models.URLField(max_length=500)
    post_id = models.CharField(max_length=100)
    user_id = models.CharField(max_length=100, null=True, blank=True)
    user_posted = models.CharField(max_length=100)  # Keep for backward compatibility
    user_url = models.URLField(max_length=500, null=True, blank=True)
    user_title = models.CharField(max_length=255, null=True, blank=True)
    user_headline = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    hashtags = models.JSONField(null=True, blank=True)  # Changed to JSONField
    hashtags_text = models.TextField(null=True, blank=True)  # Keep for backward compatibility
    num_comments = models.IntegerField(default=0)
    date_posted = models.DateTimeField(null=True, blank=True)
    likes = models.IntegerField(default=0)
    photos = models.TextField(null=True, blank=True)
    videos = models.TextField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    latest_comments = models.TextField(null=True, blank=True)
    discovery_input = models.CharField(max_length=255, null=True, blank=True)
    thumbnail = models.URLField(max_length=500, null=True, blank=True)
    content_type = models.CharField(max_length=50, null=True, blank=True)
    platform_type = models.CharField(max_length=50, null=True, blank=True)
    engagement_score = models.FloatField(default=0.0)
    tagged_users = models.TextField(null=True, blank=True)
    followers = models.IntegerField(null=True, blank=True)
    posts_count = models.IntegerField(null=True, blank=True)
    profile_image_link = models.URLField(max_length=500, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_paid_partnership = models.BooleanField(default=False)
    
    # New fields from BrightData LinkedIn payload
    post_title = models.CharField(max_length=255, null=True, blank=True)
    post_text = models.TextField(null=True, blank=True)
    post_text_html = models.TextField(null=True, blank=True)
    num_likes = models.IntegerField(default=0)
    num_shares = models.IntegerField(default=0)
    user_followers = models.IntegerField(null=True, blank=True)
    user_posts = models.IntegerField(null=True, blank=True)
    user_articles = models.IntegerField(null=True, blank=True)
    num_connections = models.IntegerField(null=True, blank=True)
    post_type = models.CharField(max_length=50, null=True, blank=True)
    account_type = models.CharField(max_length=50, null=True, blank=True)
    images = models.JSONField(null=True, blank=True)
    videos = models.JSONField(null=True, blank=True)
    video_duration = models.IntegerField(null=True, blank=True)
    video_thumbnail = models.URLField(max_length=500, null=True, blank=True)
    external_link_data = models.JSONField(null=True, blank=True)
    embedded_links = models.JSONField(null=True, blank=True)
    document_cover_image = models.URLField(max_length=500, null=True, blank=True)
    document_page_count = models.IntegerField(null=True, blank=True)
    tagged_companies = models.JSONField(null=True, blank=True)
    tagged_people = models.JSONField(null=True, blank=True)
    repost_data = models.JSONField(null=True, blank=True)
    author_profile_pic = models.URLField(max_length=500, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Post by {self.user_posted}"
    
    def save(self, *args, **kwargs):
        # Convert hashtags list to text for backward compatibility
        if self.hashtags and isinstance(self.hashtags, list):
            self.hashtags_text = ', '.join(self.hashtags)
        
        # Convert latest_comments list to JSON string for backward compatibility
        if self.latest_comments and isinstance(self.latest_comments, list):
            self.latest_comments = json.dumps(self.latest_comments)
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-date_posted']
        verbose_name = "LinkedIn Post"
        verbose_name_plural = "LinkedIn Posts"
        unique_together = [['post_id', 'folder']]
        indexes = [
            models.Index(fields=['user_posted']),
            models.Index(fields=['post_id']),
            models.Index(fields=['date_posted']),
            models.Index(fields=['user_id']),
            models.Index(fields=['post_type']),
        ] 
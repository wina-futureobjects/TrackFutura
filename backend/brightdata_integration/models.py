from django.db import models
from django.contrib.auth.models import User
from users.models import Project
import json

# Create your models here.

class BrightdataConfig(models.Model):
    """Model to store Brightdata API configuration with platform-specific datasets"""

    PLATFORM_CHOICES = (
        ('facebook_posts', 'Facebook Posts'),
        ('facebook_reels', 'Facebook Reels'),
        ('facebook_comments', 'Facebook Comments'),
        ('instagram_posts', 'Instagram Posts'),
        ('instagram_reels', 'Instagram Reels'),
        ('instagram_comments', 'Instagram Comments'),
        ('tiktok_posts', 'TikTok Posts'),
        ('tiktok', 'TikTok'),
        ('linkedin_posts', 'LinkedIn Posts'),
        ('linkedin', 'LinkedIn'),
    )

    name = models.CharField(max_length=100, default="Default")
    platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES, default='facebook_posts')
    api_token = models.CharField(max_length=255)
    dataset_id = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True, help_text="Description of this configuration")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Brightdata Configuration"
        verbose_name_plural = "Brightdata Configurations"
        unique_together = ['platform', 'is_active']  # Only one active config per platform

    def __str__(self):
        return f"{self.name} - {self.get_platform_display()} ({self.dataset_id})"

    def save(self, *args, **kwargs):
        # If this config is being set to active, deactivate other configs for the same platform
        if self.is_active:
            BrightdataConfig.objects.filter(platform=self.platform, is_active=True).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def get_platform_display(self):
        return dict(self.PLATFORM_CHOICES)[self.platform]

class BatchScraperJob(models.Model):
    """Model to store automated batch scraper jobs"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    # Job identification
    name = models.CharField(max_length=255, help_text="Name for this batch job")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='batch_scraper_jobs', null=True)

    # Source configuration
    source_folder_ids = models.JSONField(help_text="List of project IDs to scrape from (folders have been removed)")
    platforms_to_scrape = models.JSONField(default=list, help_text="List of platforms to scrape: ['facebook', 'instagram', 'linkedin', 'tiktok']")
    content_types_to_scrape = models.JSONField(default=dict, help_text="Dictionary mapping platforms to content types: {'facebook': ['post', 'reel'], 'instagram': ['post', 'comment']}")

    # Scraping parameters
    num_of_posts = models.IntegerField(default=10, null=True, blank=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    # Output configuration
    auto_create_folders = models.BooleanField(default=True, help_text="Auto-create folders for results by platform and date")
    output_folder_pattern = models.CharField(max_length=255, default="{platform}_{content_type}_{date}_{job_name}",
                                           help_text="Pattern for auto-created folder names")
    
    # Platform-specific parameters
    platform_params = models.JSONField(null=True, blank=True, help_text="Platform-specific parameters for scraping")

    # Job status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_sources = models.IntegerField(default=0, help_text="Total number of sources to process")
    processed_sources = models.IntegerField(default=0, help_text="Number of sources processed so far")
    successful_requests = models.IntegerField(default=0)
    failed_requests = models.IntegerField(default=0)

    # Legacy fields for backward compatibility
    total_accounts = models.IntegerField(default=0, help_text="Legacy field - use total_sources instead")
    processed_accounts = models.IntegerField(default=0, help_text="Legacy field - use processed_sources instead")

    # Job execution details
    job_metadata = models.JSONField(null=True, blank=True, help_text="Stores detailed job execution information")
    error_log = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Batch Scraper Job"
        verbose_name_plural = "Batch Scraper Jobs"

    def __str__(self):
        return f"{self.name} ({self.status})"

    def get_platforms_display(self):
        """Get a readable display of platforms to scrape"""
        if not self.platforms_to_scrape:
            return "All platforms"
        return ", ".join([p.title() for p in self.platforms_to_scrape])

    def get_content_types_display(self):
        """Get a readable display of content types to scrape"""
        if not self.content_types_to_scrape:
            return "Default content types"
        display_items = []
        for platform, content_types in self.content_types_to_scrape.items():
            if content_types:
                display_items.append(f"{platform.title()}: {', '.join(content_types)}")
        return "; ".join(display_items) if display_items else "Default content types"

class ScraperRequest(models.Model):
    """Model to store Brightdata scraper requests"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    PLATFORM_CHOICES = (
        ('facebook_posts', 'Facebook Posts'),
        ('facebook_reels', 'Facebook Reels'),
        ('facebook_comments', 'Facebook Comments'),
        ('instagram_posts', 'Instagram Posts'),
        ('instagram_reels', 'Instagram Reels'),
        ('instagram_comments', 'Instagram Comments'),
        ('tiktok', 'TikTok'),
        ('linkedin', 'LinkedIn'),
    )

    CONTENT_TYPE_CHOICES = (
        ('post', 'Post'),
        ('reel', 'Reel'),
        ('profile', 'Profile'),
        ('comment', 'Comment'),
    )

    config = models.ForeignKey(BrightdataConfig, on_delete=models.CASCADE)
    batch_job = models.ForeignKey(BatchScraperJob, on_delete=models.CASCADE, null=True, blank=True, related_name='scraper_requests')

    # Request information
    request_id = models.CharField(max_length=255, blank=True, null=True)
    platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='post')
    target_url = models.URLField(max_length=500)
    source_name = models.CharField(max_length=255, blank=True, null=True, help_text="Name of the tracked source")
    num_of_posts = models.IntegerField(default=10, null=True, blank=True)
    posts_to_not_include = models.TextField(blank=True, null=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)

    # Legacy field for backward compatibility
    account_name = models.CharField(max_length=255, blank=True, null=True, help_text="Legacy field - use source_name instead")

    # Request metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    request_payload = models.JSONField(null=True, blank=True)
    response_metadata = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    # Destination folder (optional, for automatic import)
    folder_id = models.IntegerField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Scraper Request"
        verbose_name_plural = "Scraper Requests"

    def __str__(self):
        display_name = self.source_name or self.target_url
        return f"{self.platform} - {display_name} ({self.status})"

class BrightdataNotification(models.Model):
    """Model to track notifications from BrightData API"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('finished', 'Finished'),
        ('failed', 'Failed'),
        ('error', 'Error'),
        ('cancelled', 'Cancelled'),
    )

    # Notification details
    snapshot_id = models.CharField(max_length=255, help_text="BrightData snapshot/request ID")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message = models.TextField(blank=True, null=True, help_text="Notification message from BrightData")

    # Associated scraper request
    scraper_request = models.ForeignKey(ScraperRequest, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)

    # Raw notification data
    raw_data = models.JSONField(help_text="Raw notification data from BrightData")

    # Request metadata
    request_ip = models.GenericIPAddressField(null=True, blank=True)
    request_headers = models.JSONField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Notification {self.snapshot_id}: {self.status}"

    class Meta:
        ordering = ['-created_at']
        verbose_name = "BrightData Notification"
        verbose_name_plural = "BrightData Notifications"

class WebhookEvent(models.Model):
    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    snapshot_id = models.CharField(max_length=255, null=True, blank=True)
    raw_payload = models.JSONField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        db_table = 'webhook_events'
        indexes = [
            models.Index(fields=['status', 'received_at']),
            models.Index(fields=['snapshot_id']),
            models.Index(fields=['platform']),
        ]
    
    def __str__(self):
        return f"WebhookEvent {self.id}: {self.platform} - {self.snapshot_id} ({self.status})"

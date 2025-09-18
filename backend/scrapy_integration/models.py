from django.db import models
from django.contrib.auth.models import User
from users.models import Project
import json
import uuid

class ScrapyConfig(models.Model):
    """Model to store Scrapy scraper configuration"""
    
    PLATFORM_CHOICES = (
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    )
    
    CONTENT_TYPE_CHOICES = (
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
        ('profile', 'Profile'),
    )

    name = models.CharField(max_length=100, default="Default")
    platform = models.CharField(max_length=30, choices=PLATFORM_CHOICES)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES, default='posts')
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True, help_text="Description of this configuration")
    
    # Scraping settings
    delay_range = models.CharField(max_length=20, default="1-3", help_text="Delay range in seconds (e.g., '1-3')")
    user_agent_rotation = models.BooleanField(default=True)
    use_proxy = models.BooleanField(default=False)
    proxy_list = models.TextField(blank=True, null=True, help_text="List of proxies, one per line")
    
    # Browser settings
    headless = models.BooleanField(default=True)
    viewport_width = models.IntegerField(default=1920)
    viewport_height = models.IntegerField(default=1080)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Scrapy Configuration"
        verbose_name_plural = "Scrapy Configurations"
        unique_together = ['platform', 'content_type']

    def __str__(self):
        return f"{self.name} - {self.get_platform_display()} {self.get_content_type_display()}"


class ScrapyJob(models.Model):
    """Model to store Scrapy scraping jobs"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    # Job identification
    name = models.CharField(max_length=255, help_text="Name for this scraping job")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='scrapy_jobs', null=True)
    config = models.ForeignKey(ScrapyConfig, on_delete=models.CASCADE)

    # Source configuration
    target_urls = models.JSONField(help_text="List of URLs to scrape")
    source_names = models.JSONField(default=list, help_text="List of source names corresponding to URLs")
    
    # Scraping parameters
    num_of_posts = models.IntegerField(default=10, null=True, blank=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    
    # Output configuration
    output_folder_id = models.IntegerField(null=True, blank=True, help_text="Destination folder ID")
    auto_create_folders = models.BooleanField(default=True)
    
    # Job status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_urls = models.IntegerField(default=0)
    processed_urls = models.IntegerField(default=0)
    successful_scrapes = models.IntegerField(default=0)
    failed_scrapes = models.IntegerField(default=0)
    
    # Job execution details
    job_metadata = models.JSONField(null=True, blank=True, help_text="Stores detailed job execution information")
    error_log = models.TextField(blank=True, null=True)
    scrapy_process_id = models.CharField(max_length=100, blank=True, null=True, help_text="Process ID for running scrapy job")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Scrapy Job"
        verbose_name_plural = "Scrapy Jobs"

    def __str__(self):
        return f"{self.name} ({self.status})"


class ScrapyResult(models.Model):
    """Model to store individual scraping results"""
    
    job = models.ForeignKey(ScrapyJob, on_delete=models.CASCADE, related_name='results')
    source_url = models.URLField(max_length=500)
    source_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Scraped data
    scraped_data = models.JSONField(help_text="Raw scraped data")
    processed_data = models.JSONField(null=True, blank=True, help_text="Processed/cleaned data")
    
    # Metadata
    scrape_timestamp = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True, null=True)
    
    # Processing status
    imported_to_platform = models.BooleanField(default=False, help_text="Whether data was imported to platform-specific tables")
    folder_id = models.IntegerField(null=True, blank=True, help_text="Destination folder ID")
    
    class Meta:
        ordering = ['-scrape_timestamp']
        verbose_name = "Scrapy Result"
        verbose_name_plural = "Scrapy Results"

    def __str__(self):
        return f"Result for {self.source_url} ({'Success' if self.success else 'Failed'})"

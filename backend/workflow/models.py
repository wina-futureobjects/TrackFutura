from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from users.models import Project, PlatformService
from brightdata_integration.models import BatchScraperJob

class InputCollection(models.Model):
    """Model for input collections that can be used for scraping"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='input_collections')
    platform_service = models.ForeignKey(PlatformService, on_delete=models.CASCADE, related_name='input_collections')
    urls = models.JSONField(default=list)  # List of URLs to scrape
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.project.name} - {self.platform_service.platform.name} - {self.platform_service.service.name}"

    @property
    def platform_name(self):
        return self.platform_service.platform.name

    @property
    def service_name(self):
        return self.platform_service.service.name

    @property
    def url_count(self):
        return len(self.urls)

class ScrapingRun(models.Model):
    """Represents a single run of data scraping for all inputs with global configuration"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='scraping_runs')
    name = models.CharField(max_length=255, default='Scraping Run')
    configuration = models.JSONField(default=dict)  # Global configuration for this run
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    total_jobs = models.IntegerField(default=0)
    completed_jobs = models.IntegerField(default=0)
    successful_jobs = models.IntegerField(default=0)
    failed_jobs = models.IntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.project.name} ({self.status})"

    @property
    def progress_percentage(self):
        if self.total_jobs == 0:
            return 0
        return int((self.completed_jobs / self.total_jobs) * 100)
    
    def update_status_from_jobs(self):
        """
        Update the run status based on the status of all jobs in this run
        """
        jobs = self.scraping_jobs.all()
        total_jobs = jobs.count()
        
        if total_jobs == 0:
            self.status = 'pending'
            return
        
        # Count jobs by status
        pending_jobs = jobs.filter(status='pending').count()
        processing_jobs = jobs.filter(status='processing').count()
        completed_jobs = jobs.filter(status='completed').count()
        failed_jobs = jobs.filter(status='failed').count()
        cancelled_jobs = jobs.filter(status='cancelled').count()
        
        # Update job counts
        self.total_jobs = total_jobs
        self.completed_jobs = completed_jobs + failed_jobs + cancelled_jobs
        self.successful_jobs = completed_jobs
        self.failed_jobs = failed_jobs
        
        # Determine run status based on job statuses
        if processing_jobs > 0:
            # If any job is still running, status is 'processing' (in progress)
            self.status = 'processing'
        elif pending_jobs > 0:
            # If any job is still pending, status is 'pending'
            self.status = 'pending'
        elif completed_jobs == total_jobs:
            # All jobs completed successfully
            self.status = 'completed'
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif failed_jobs == total_jobs:
            # All jobs failed
            self.status = 'failed'
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif failed_jobs > 0 and completed_jobs > 0:
            # Mixed results - some succeeded, some failed
            self.status = 'completed'  # Partial success
            if not self.completed_at:
                self.completed_at = timezone.now()
        elif cancelled_jobs == total_jobs:
            # All jobs cancelled
            self.status = 'cancelled'
            if not self.completed_at:
                self.completed_at = timezone.now()
        
        self.save()

class ScrapingJob(models.Model):
    """Individual scraping job for each input entry"""
    scraping_run = models.ForeignKey(ScrapingRun, on_delete=models.CASCADE, related_name='scraping_jobs')
    input_collection = models.ForeignKey(InputCollection, on_delete=models.CASCADE, related_name='scraping_jobs', null=True, blank=True)
    batch_job = models.ForeignKey(BatchScraperJob, on_delete=models.CASCADE, related_name='scraping_jobs')
    request_id = models.CharField(max_length=255, blank=True, null=True, help_text="BrightData request/snapshot ID for webhook mapping")
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    dataset_id = models.CharField(max_length=100)  # Determined by platform+service
    platform = models.CharField(max_length=50)
    service_type = models.CharField(max_length=50)
    url = models.URLField(max_length=500)
    error_message = models.TextField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request_id']),
            models.Index(fields=['batch_job', 'url']),
        ]

    def __str__(self):
        return f"Job {self.id} - {self.platform} {self.service_type} ({self.status})"
    
    def save(self, *args, **kwargs):
        """Override save to automatically update parent run status"""
        # Save the job first
        super().save(*args, **kwargs)
        
        # Update the parent run status
        if self.scraping_run:
            self.scraping_run.update_status_from_jobs()

class WorkflowTask(models.Model):
    """Model for workflow tasks that manage scraping jobs"""
    input_collection = models.ForeignKey(InputCollection, on_delete=models.CASCADE, related_name='workflow_tasks')
    batch_job = models.ForeignKey(BatchScraperJob, on_delete=models.CASCADE, related_name='workflow_tasks')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Workflow Task {self.id} - {self.input_collection}"

class ScheduledScrapingTask(models.Model):
    """Model for scheduled scraping tasks using TrackSource items"""
    name = models.CharField(max_length=255)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='scheduled_tasks')
    track_source = models.ForeignKey('track_accounts.TrackSource', on_delete=models.CASCADE, related_name='scheduled_tasks')
    platform = models.CharField(max_length=50, choices=[
        ('instagram', 'Instagram'),
        ('facebook', 'Facebook'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok')
    ])
    service_type = models.CharField(max_length=50, choices=[
        ('posts', 'Posts'),
        ('comments', 'Comments'),
        ('reels', 'Reels'),
        ('profiles', 'Profiles')
    ], default='posts')
    
    # Scheduling configuration
    is_active = models.BooleanField(default=True)
    schedule_type = models.CharField(max_length=20, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('custom', 'Custom Interval')
    ], default='daily')
    schedule_interval = models.IntegerField(default=1, help_text="Interval in hours for custom schedule")
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    
    # Scraping configuration
    num_of_posts = models.IntegerField(default=10, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    auto_create_folders = models.BooleanField(default=True)
    
    # BrightData configuration (preset)
    brightdata_dataset_id = models.CharField(max_length=100, default='gd_lk5ns7kz21pck8jpis')
    brightdata_api_key = models.CharField(max_length=100, default='c20a28d5-5c6c-43c3-9567-a6d7c193e727')
    
    # Status tracking
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('error', 'Error')
    ], default='active')
    total_runs = models.IntegerField(default=0)
    successful_runs = models.IntegerField(default=0)
    failed_runs = models.IntegerField(default=0)
    
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.track_source.name} ({self.platform})"

    def get_platform_url(self):
        """Get the URL for the specified platform from the TrackSource"""
        platform_field_map = {
            'instagram': 'instagram_link',
            'facebook': 'facebook_link',
            'linkedin': 'linkedin_link',
            'tiktok': 'tiktok_link'
        }
        field_name = platform_field_map.get(self.platform)
        if field_name and hasattr(self.track_source, field_name):
            return getattr(self.track_source, field_name, None)
        return None

    def should_run(self):
        """Check if the task should run based on schedule"""
        if not self.is_active or self.status != 'active':
            return False
        
        if not self.next_run:
            return True
        
        from django.utils import timezone
        return timezone.now() >= self.next_run

    def update_next_run(self):
        """Update the next run time based on schedule"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        
        if self.schedule_type == 'daily':
            self.next_run = now + timedelta(days=1)
        elif self.schedule_type == 'weekly':
            self.next_run = now + timedelta(weeks=1)
        elif self.schedule_type == 'monthly':
            self.next_run = now + timedelta(days=30)
        elif self.schedule_type == 'custom':
            self.next_run = now + timedelta(hours=self.schedule_interval)
        
        self.save()

from django.db import models
import json
from users.models import Project

# Create your models here.

class TrackSource(models.Model):
    """
    Model for storing Track Source data
    """
    # Platform choices
    PLATFORM_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    ]
    
    # Reference to the project
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='track_sources', null=True)
    
    # Core fields
    name = models.CharField(max_length=255)
    
    # Platform and service information
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, blank=True, null=True)
    service_name = models.CharField(max_length=100, blank=True, null=True)
    
    # Social media profile URLs
    facebook_link = models.URLField(max_length=500, blank=True, null=True)
    instagram_link = models.URLField(max_length=500, blank=True, null=True)
    linkedin_link = models.URLField(max_length=500, blank=True, null=True)
    tiktok_link = models.URLField(max_length=500, blank=True, null=True)
    
    other_social_media = models.TextField(blank=True, null=True)
    
    # URL information
    url_count = models.IntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Track Source"
        verbose_name_plural = "Track Sources"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['created_at']),
            models.Index(fields=['platform']),
        ]

# Keep backward compatibility alias
TrackAccount = TrackSource

class ReportFolder(models.Model):
    """
    Model for storing generated reports
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='report_folders', null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    source_folders = models.TextField(blank=True, null=True)  # JSON array of folder IDs used for this report
    
    # Statistics
    total_posts = models.IntegerField(default=0)
    matched_posts = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    def get_source_folders(self):
        """Get source folder IDs as a list"""
        if not self.source_folders:
            return []
        try:
            return json.loads(self.source_folders)
        except json.JSONDecodeError:
            return []
    
    def set_source_folders(self, folder_ids):
        """Store source folder IDs as JSON string"""
        self.source_folders = json.dumps(folder_ids)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Report Folder"
        verbose_name_plural = "Report Folders"

class ReportEntry(models.Model):
    """
    Model for individual report entries (rows in the report)
    """
    report = models.ForeignKey(ReportFolder, on_delete=models.CASCADE, related_name='entries')
    
    # Data from the report row
    sn = models.CharField(max_length=50, blank=True, null=True)  # S/N field, can be left empty
    name = models.CharField(max_length=255, blank=True, null=True)
    entity = models.CharField(max_length=255, blank=True, null=True)
    posting_date = models.DateTimeField(blank=True, null=True)
    platform_type = models.CharField(max_length=50, blank=True, null=True)
    post_url = models.URLField(max_length=500, blank=True, null=True)
    username = models.CharField(max_length=100, blank=True, null=True)
    account_type = models.CharField(max_length=100, blank=True, null=True)  # Personal/Business
    keywords = models.TextField(blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    
    # Original post ID for reference
    post_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Track Source ID for reference (if matched)
    track_source_id = models.IntegerField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Report entry for {self.name or self.username or 'Unknown'}"
    
    class Meta:
        ordering = ['-posting_date']
        verbose_name = "Report Entry"
        verbose_name_plural = "Report Entries"

class UnifiedRunFolder(models.Model):
    """
    Model for storing unified run folders (platform-agnostic)
    """
    FOLDER_TYPE_CHOICES = [
        ('run', 'Run'),
        ('platform', 'Platform'),
        ('service', 'Service'),
        ('job', 'Job'),
        ('content', 'Content'),  # Legacy / backward compatibility
    ]
    
    CATEGORY_CHOICES = [
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
    ]
    
    # Identity fields and hierarchy metadata
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    folder_type = models.CharField(max_length=20, choices=FOLDER_TYPE_CHOICES, default='content')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='posts')

    # Explicit identity for platform/service (nullable for legacy types)
    PLATFORM_CODE_CHOICES = [
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('linkedin', 'LinkedIn'),
        ('tiktok', 'TikTok'),
    ]
    SERVICE_CODE_CHOICES = [
        ('posts', 'Posts'),
        ('reels', 'Reels'),
        ('comments', 'Comments'),
        ('profiles', 'Profiles'),
    ]

    platform_code = models.CharField(max_length=20, choices=PLATFORM_CODE_CHOICES, null=True, blank=True)
    service_code = models.CharField(max_length=20, choices=SERVICE_CODE_CHOICES, null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='unified_run_folders', null=True)
    scraping_run = models.ForeignKey('workflow.ScrapingRun', on_delete=models.CASCADE, related_name='unified_folders', null=True, blank=True)
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, related_name='subfolders', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    def get_content_count(self):
        """Get the count of content items in this folder"""
        if self.folder_type == 'run':
            # Count all platform folders (new), fallback to service if platform layer not present
            platform_children = self.subfolders.filter(folder_type='platform').count()
            if platform_children:
                return platform_children
            return self.subfolders.filter(folder_type='service').count()
        elif self.folder_type == 'platform':
            # Count all service folders under this platform
            return self.subfolders.filter(folder_type='service').count()
        elif self.folder_type == 'service':
            # Count all job folders (new), fallback to legacy content
            job_children = self.subfolders.filter(folder_type='job').count()
            if job_children:
                return job_children
            return self.subfolders.filter(folder_type='content').count()
        else:
            # Job/content folder - no subfolders
            return 0
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Unified Run Folder"
        verbose_name_plural = "Unified Run Folders"
        indexes = [
            models.Index(fields=['scraping_run', 'folder_type']),
            models.Index(fields=['scraping_run', 'folder_type', 'platform_code', 'service_code']),
        ]
        constraints = [
            # platform folders must have platform_code
            models.CheckConstraint(
                name='ck_unified_platform_requires_platform_code',
                check=(
                    models.Q(folder_type='platform', platform_code__isnull=False)
                    | ~models.Q(folder_type='platform')
                ),
            ),
            # service folders must have both platform_code and service_code
            models.CheckConstraint(
                name='ck_unified_service_requires_platform_and_service_code',
                check=(
                    models.Q(folder_type='service', platform_code__isnull=False, service_code__isnull=False)
                    | ~models.Q(folder_type='service')
                ),
            ),
        ]


class ServiceFolderIndex(models.Model):
    """
    Fast lookup index to resolve (run, platform, service) to the corresponding Service folder.
    """
    scraping_run = models.ForeignKey('workflow.ScrapingRun', on_delete=models.CASCADE, related_name='service_folder_indexes')
    platform_code = models.CharField(max_length=20, choices=UnifiedRunFolder.PLATFORM_CODE_CHOICES)
    service_code = models.CharField(max_length=20, choices=UnifiedRunFolder.SERVICE_CODE_CHOICES)
    folder = models.ForeignKey(UnifiedRunFolder, on_delete=models.CASCADE, related_name='indexed_service_folder')

    class Meta:
        unique_together = [('scraping_run', 'platform_code', 'service_code')]
        indexes = [
            models.Index(fields=['scraping_run', 'platform_code', 'service_code'])
        ]

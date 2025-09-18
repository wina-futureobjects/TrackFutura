from django.db import models
from django.contrib.auth.models import User
import json

# Create your models here.
class Report(models.Model):
    """
    Basic report model
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class ReportTemplate(models.Model):
    """
    Report templates available in the marketplace
    """
    TEMPLATE_TYPES = [
        ('sentiment_analysis', 'Sentiment Analysis'),
        ('engagement_metrics', 'Engagement Metrics'),
        ('content_analysis', 'Content Analysis'),
        ('user_behavior', 'User Behavior Analysis'),
        ('trend_analysis', 'Trend Analysis'),
        ('competitive_analysis', 'Competitive Analysis'),
    ]
    
    name = models.CharField(max_length=255)
    description = models.TextField()
    template_type = models.CharField(max_length=50, choices=TEMPLATE_TYPES)
    icon = models.CharField(max_length=50, default='analytics')  # Material-UI icon name
    color = models.CharField(max_length=7, default='#1976d2')  # Hex color
    is_active = models.BooleanField(default=True)
    estimated_time = models.CharField(max_length=50, default='2-5 minutes')  # e.g., "2-5 minutes"
    required_data_types = models.JSONField(default=list)  # ["comments", "posts", "profiles"]
    features = models.JSONField(default=list)  # List of features this template provides
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        ordering = ['name']

class GeneratedReport(models.Model):
    """
    User-generated reports from templates
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    title = models.CharField(max_length=255)
    template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    configuration = models.JSONField(default=dict)  # Store user selections and parameters
    results = models.JSONField(default=dict)  # Store generated report data
    error_message = models.TextField(blank=True, null=True)
    
    # Metadata
    data_source_count = models.IntegerField(default=0)  # Number of data points analyzed
    processing_time = models.FloatField(null=True, blank=True)  # In seconds
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.title} - {self.template.name}"
    
    class Meta:
        ordering = ['-created_at']

from django.db import models
from django.contrib.auth.models import User
from users.models import Project
import uuid

class ChatThread(models.Model):
    """
    Model for storing chat threads/conversations with AI Analysis support
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_threads')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='chat_threads', null=True, blank=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Chat thread {self.id} by {self.user.username}"
    
    class Meta:
        ordering = ['-updated_at']
    
    @property
    def last_message(self):
        return self.messages.first()  # Due to ordering, first() gives the latest

class ChatMessage(models.Model):
    """
    Model for storing individual chat messages with AI Analysis metadata
    """
    SENDER_CHOICES = (
        ('user', 'User'),
        ('ai', 'AI'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(ChatThread, on_delete=models.CASCADE, related_name='messages')
    content = models.TextField()
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_error = models.BooleanField(default=False)
    
    # AI Analysis specific fields
    tokens_used = models.IntegerField(null=True, blank=True)
    response_time = models.FloatField(null=True, blank=True)  # Response time in seconds
    data_context = models.JSONField(null=True, blank=True)  # Context about scraped data used

    def __str__(self):
        return f"{self.sender} message in thread {self.thread.id}"
    
    class Meta:
        ordering = ['-timestamp'] 
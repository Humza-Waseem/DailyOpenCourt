from django.db import models
from django.contrib. auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='STAFF')
    phone = models.CharField(max_length=15, blank=True)
    police_station = models.CharField(max_length=100, blank=True)
    division = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"


class OpenCourtApplication(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('HEARD', 'Heard'),
        ('REFERRED', 'Referred to Legal Assistance'),
        ('CLOSED', 'Closed'),
    ]
    
    FEEDBACK_CHOICES = [
        ('POSITIVE', 'Positive'),
        ('NEGATIVE', 'Negative'),
        ('PENDING', 'Pending'),
    ]
    
    sr_no = models.IntegerField(unique=True)
    dairy_no = models.CharField(max_length=100)
    name = models.CharField(max_length=200)
    contact = models.CharField(max_length=15)
    marked_to = models.CharField(max_length=200, blank=True)
    date = models.DateField(null=True, blank=True)
    marked_by = models.CharField(max_length=200, blank=True)
    timeline = models.CharField(max_length=100, blank=True)
    police_station = models.CharField(max_length=100)
    division = models.CharField(max_length=100)
    category = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    days = models.IntegerField(null=True, blank=True)
    feedback = models.CharField(max_length=20, choices=FEEDBACK_CHOICES, default='PENDING')
    dairy_ps = models.CharField(max_length=100, blank=True)
    
    remarks = models.TextField(blank=True)
    video_response = models.FileField(upload_to='video_responses/', null=True, blank=True)
    supporting_documents = models.FileField(upload_to='documents/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_applications')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self. dairy_no} - {self.name}"


class VideoFeedback(models.Model):
    FEEDBACK_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('LIKE', 'Approved'),
        ('DISLIKE', 'Rejected'),
    ]
    
    user_name = models.CharField(max_length=200)  # Random name for now
    video_file = models.FileField(upload_to='video_feedback/')
    title = models.CharField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    submitted_date = models.DateTimeField(auto_now_add=True)
    
    # Admin feedback
    admin_feedback = models.CharField(max_length=20, choices=FEEDBACK_CHOICES, default='PENDING')
    admin_remarks = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='video_reviews')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Video metadata
    duration = models.IntegerField(null=True, blank=True, help_text='Duration in seconds')
    file_size = models.BigIntegerField(null=True, blank=True, help_text='File size in bytes')
    thumbnail = models.ImageField(upload_to='video_thumbnails/', null=True, blank=True)
    
    class Meta:
        ordering = ['-submitted_date']
        verbose_name = 'Video Feedback'
        verbose_name_plural = 'Video Feedbacks'
    
    def __str__(self):
        return f"{self.user_name} - {self.title or 'Video Feedback'}"
    
    @property
    def file_size_mb(self):
        if self.file_size:
            return round(self.file_size / (1024 * 1024), 2)
        return None
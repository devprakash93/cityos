"""
apps/notifications/models.py
==============================
Role-aware notification model using Generic FK for flexible relation to any object.
"""
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.accounts.models import CustomUser


class Notification(models.Model):
    """
    A notification sent to a specific user.
    - role-aware: service layer ensures citizens never see internal messages
    - related_object: generic FK allows linking to any model (Complaint, PowerOutage, etc.)
    """
    CATEGORY_CHOICES = [
        ("COMPLAINT", "Complaint Update"),
        ("SYSTEM", "System Alert"),
        ("EMERGENCY", "Emergency Alert"),
        ("IOT_ALERT", "IoT Threshold Alert"),
        ("DEPARTMENT", "Department Notice"),
    ]

    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="SYSTEM", db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Generic FK — allows notifications to reference any model
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    related_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "category"]),
        ]

    def __str__(self):
        return f"[{self.category}] → {self.recipient.email}: {self.title[:50]}"


class Announcement(models.Model):
    """
    A public civic announcement broadcast to a specific geographic scope.
    """
    SCOPE_CHOICES = [
        ("STATE", "All Odisha"),
        ("DISTRICT", "District"),
        ("CITY", "City"),
        ("WARD", "Ward"),
    ]
    CATEGORY_CHOICES = [
        ("CIVIC", "Civic Announcement"),
        ("TRAFFIC", "Traffic Notice"),
        ("WATER", "Water Maintenance"),
        ("ELECTRICITY", "Electricity Maintenance"),
        ("TRANSPORT", "Transport Changes"),
        ("EVENT", "Public Event"),
        ("WEATHER", "Weather Alert"),
        ("DISASTER", "Disaster Alert"),
    ]

    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="CIVIC")
    
    scope_level = models.CharField(max_length=20, choices=SCOPE_CHOICES, default="CITY")
    
    # Generic reference to District/City/Ward depending on scope_level
    # If scope_level == STATE, this can be null.
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    scope_object = GenericForeignKey("content_type", "object_id")
    
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name="announcements")
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "announcements"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

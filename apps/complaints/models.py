"""
apps/complaints/models.py
==========================
Full complaint lifecycle models.

Status flow:
  PENDING → ASSIGNED → ACCEPTED → ON_SITE → IN_PROGRESS → REVIEW → RESOLVED → CLOSED
                                                                     ↘ REJECTED
"""
from django.db import models
from apps.accounts.models import CustomUser, Department
from core.utils import media_upload_path


class SLAConfiguration(models.Model):
    """
    Service Level Agreement (SLA) configuration.
    Defines response and resolution deadlines for specific categories and priorities.
    """
    # If category is null, it's a default SLA for the priority.
    # If priority is null, it's a default SLA for the category.
    # This allows flexibility in defining SLAs.
    category = models.CharField(max_length=30, null=True, blank=True, db_index=True)
    priority = models.CharField(max_length=10, null=True, blank=True, db_index=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    
    response_minutes = models.IntegerField(help_text="Expected response time in minutes")
    resolution_minutes = models.IntegerField(help_text="Expected resolution time in minutes")
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sla_configurations"

    def __str__(self):
        return f"SLA: {self.category or '*'} | {self.priority or '*'} -> {self.resolution_minutes}m"


class Complaint(models.Model):
    """
    A complaint submitted by a citizen. Central record of the lifecycle.
    """
    # --- Status choices ---
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    ACCEPTED = "ACCEPTED"
    ON_SITE = "ON_SITE"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (ASSIGNED, "Assigned"),
        (ACCEPTED, "Accepted"),
        (ON_SITE, "On Site"),
        (IN_PROGRESS, "In Progress"),
        (REVIEW, "Under Review"),
        (RESOLVED, "Resolved"),
        (CLOSED, "Closed"),
        (REJECTED, "Rejected"),
    ]

    # --- Priority choices ---
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    PRIORITY_CHOICES = [
        (LOW, "Low"),
        (MEDIUM, "Medium"),
        (HIGH, "High"),
        (CRITICAL, "Critical"),
    ]

    # --- Category choices ---
    CATEGORY_CHOICES = [
        ("ROAD", "Road Damage / Pothole"),
        ("STREET_LIGHT", "Street Light"),
        ("GARBAGE", "Garbage / Illegal Dumping"),
        ("DRAINAGE", "Drainage"),
        ("WATER_SUPPLY", "Water Supply"),
        ("WATER_LEAKAGE", "Water Leakage"),
        ("ELECTRICITY", "Electricity"),
        ("TRAFFIC_SIGNAL", "Traffic Signal"),
        ("TRANSPORT", "Public Transport"),
        ("ROAD_BLOCKAGE", "Road Blockage"),
        ("POLLUTION", "Pollution"),
        ("STRAY_ANIMAL", "Stray Animal"),
        ("PUBLIC_TOILET", "Public Toilet"),
        ("FLOODING", "Flooding / Waterlogging"),
        ("CYCLONE", "Cyclone Damage"),
        ("OTHER", "Other"),
    ]

    citizen = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="complaints",
        db_index=True,
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
        db_index=True,
    )
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField()

    # Location
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.TextField(blank=True)
    ward = models.ForeignKey(
        "geography.Ward",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="complaints"
    )

    # Status & priority
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=PENDING, db_index=True
    )
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default=MEDIUM, db_index=True
    )

    # Internal reference number
    reference_number = models.CharField(max_length=20, unique=True, blank=True, db_index=True)

    # SLA Tracking
    sla_config = models.ForeignKey(
        'SLAConfiguration',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="complaints"
    )
    sla_due_at = models.DateTimeField(null=True, blank=True)
    sla_breached = models.BooleanField(default=False)
    sla_breached_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "complaints"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority"]),
            models.Index(fields=["citizen", "status"]),
            models.Index(fields=["department", "status"]),
        ]

    def __str__(self):
        return f"[{self.reference_number}] {self.title} — {self.status}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = self._generate_reference()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_reference() -> str:
        """Format: CMP-YYYYMMDD-XXXX (e.g. CMP-20240801-0001)"""
        from django.utils import timezone
        import random
        today = timezone.now().strftime("%Y%m%d")
        suffix = str(random.randint(1000, 9999))
        return f"CMP-{today}-{suffix}"

    @property
    def is_open(self) -> bool:
        return self.status not in (self.RESOLVED, self.CLOSED, self.REJECTED)


class ComplaintMedia(models.Model):
    """Evidence uploaded by citizen, or completion photo by field worker."""
    TYPE_CHOICES = [
        ("EVIDENCE", "Evidence"),
        ("COMPLETION", "Completion Photo"),
        ("SUPPLEMENTARY", "Supplementary"),
    ]

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="media")
    file = models.FileField(upload_to=media_upload_path("complaint_media"))
    media_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="EVIDENCE")
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    caption = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "complaint_media"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Media for {self.complaint.reference_number} ({self.media_type})"


class ComplaintAssignment(models.Model):
    """
    Officer assigns a complaint to a field worker.
    A complaint can be re-assigned (new record replaces old).
    """
    complaint = models.ForeignKey(
        Complaint, on_delete=models.CASCADE, related_name="assignments"
    )
    assigned_to = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="received_assignments",
        db_index=True,
    )
    assigned_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="made_assignments",
    )
    deadline = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)  # False when re-assigned

    class Meta:
        db_table = "complaint_assignments"
        ordering = ["-assigned_at"]
        indexes = [models.Index(fields=["assigned_to", "is_active"])]

    def __str__(self):
        return f"{self.complaint.reference_number} → {self.assigned_to.username}"


class ComplaintHistory(models.Model):
    """
    Immutable timeline entry. Created every time status, priority, or
    assignment changes. Never updated or deleted.
    """
    EVENT_CHOICES = [
        ("STATUS_CHANGE", "Status Changed"),
        ("ASSIGNMENT", "Assigned"),
        ("PRIORITY_CHANGE", "Priority Changed"),
        ("REMARK", "Remark Added"),
        ("MEDIA_UPLOAD", "Media Uploaded"),
    ]

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="history")
    changed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, db_index=True)
    old_value = models.CharField(max_length=100, blank=True)
    new_value = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "complaint_history"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.complaint.reference_number} — {self.event_type}"

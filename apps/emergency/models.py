"""
apps/emergency/models.py
Emergency incident management, responders, assignments, and public contacts.
"""
from django.db import models
from apps.accounts.models import CustomUser
from core.models import SimulationTrackingModel


class EmergencyContact(models.Model):
    """Public emergency contact numbers (visible to all citizens)."""
    TYPE_CHOICES = [
        ("POLICE", "Police"),
        ("FIRE", "Fire Brigade"),
        ("AMBULANCE", "Ambulance"),
        ("DISASTER", "Disaster Management"),
        ("HELPLINE", "General Helpline"),
    ]

    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "emergency_contacts"

    def __str__(self):
        return f"{self.name} ({self.type}): {self.phone}"


class EmergencyIncident(SimulationTrackingModel):
    """A reported or detected emergency incident."""
    INCIDENT_TYPES = [
        ("FIRE", "Fire"),
        ("MEDICAL", "Medical Emergency"),
        ("ACCIDENT", "Road Accident"),
        ("FLOOD", "Flooding"),
        ("EARTHQUAKE", "Earthquake"),
        ("CIVIL_UNREST", "Civil Unrest"),
        ("OTHER", "Other"),
    ]
    SEVERITY_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("CRITICAL", "Critical"),
    ]
    STATUS_CHOICES = [
        ("REPORTED", "Reported"),
        ("ACKNOWLEDGED", "Acknowledged"),
        ("RESPONDING", "Responding"),
        ("CONTAINED", "Contained"),
        ("RESOLVED", "Resolved"),
    ]

    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPES, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="MEDIUM", db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.ForeignKey(
        "geography.Location",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="emergency_incidents"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="REPORTED", db_index=True)
    reported_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "emergency_incidents"
        ordering = ["-reported_at"]
        indexes = [models.Index(fields=["status", "severity"])]

    def __str__(self):
        return f"[{self.severity}] {self.incident_type} — {self.title}"


class Responder(models.Model):
    """An emergency response unit (fire truck, ambulance, police patrol)."""
    RESPONDER_TYPES = [
        ("POLICE", "Police Unit"),
        ("FIRE", "Fire Unit"),
        ("AMBULANCE", "Ambulance"),
        ("RESCUE", "Rescue Team"),
        ("DISASTER", "Disaster Response"),
    ]
    STATUS_CHOICES = [
        ("AVAILABLE", "Available"),
        ("DISPATCHED", "Dispatched"),
        ("ON_SCENE", "On Scene"),
        ("RETURNING", "Returning"),
    ]

    unit_code = models.CharField(max_length=20, unique=True)
    responder_type = models.CharField(max_length=15, choices=RESPONDER_TYPES, db_index=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="AVAILABLE", db_index=True)
    city = models.ForeignKey(
        "geography.City",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="responders"
    )
    operator = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "responders"

    def __str__(self):
        return f"{self.unit_code} ({self.responder_type}) — {self.status}"


class IncidentAssignment(models.Model):
    """Links a responder to an incident."""
    incident = models.ForeignKey(EmergencyIncident, on_delete=models.CASCADE, related_name="assignments")
    responder = models.ForeignKey(Responder, on_delete=models.CASCADE, related_name="assignments")
    assigned_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    arrived_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "incident_assignments"

    def __str__(self):
        return f"{self.responder.unit_code} → {self.incident.title}"


class EmergencyAlert(models.Model):
    """
    Broadcast alerts for citizens (e.g., Cyclone warning, flood evacuation).
    Lifecycle: DRAFT -> PUBLISHED -> ACTIVE -> EXPIRED
    """
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("PUBLISHED", "Published (Upcoming)"),
        ("ACTIVE", "Active"),
        ("EXPIRED", "Expired"),
    ]
    SEVERITY_CHOICES = [
        ("INFO", "Information"),
        ("WARNING", "Warning"),
        ("CRITICAL", "Critical"),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="WARNING", db_index=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="DRAFT", db_index=True)
    
    city = models.ForeignKey(
        "geography.City",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="emergency_alerts",
        help_text="If null, applies to the entire state."
    )
    
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional validity window
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "emergency_alerts"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "severity", "city"])]

    def __str__(self):
        return f"[{self.status}] {self.title}"

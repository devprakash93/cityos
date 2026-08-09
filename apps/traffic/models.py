"""
apps/traffic/models.py
========================
Traffic zone monitoring and incident tracking.
"""
from django.db import models
from apps.accounts.models import CustomUser
from core.models import SimulationTrackingModel


class TrafficZone(models.Model):
    """A named geographic zone monitored for traffic conditions."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    zone = models.ForeignKey(
        "geography.Zone",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="traffic_zones"
    )
    road_type = models.CharField(
        max_length=20,
        choices=[("HIGHWAY", "Highway"), ("ARTERIAL", "Arterial"), ("LOCAL", "Local")],
        default="ARTERIAL",
    )
    speed_limit_kmh = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "traffic_zones"

    def __str__(self):
        return f"{self.name} ({self.code})"


class TrafficReading(SimulationTrackingModel):
    """IoT sensor reading for a traffic zone. Written by the simulator."""
    CONGESTION_CHOICES = [
        ("FREE", "Free Flow"),
        ("MODERATE", "Moderate"),
        ("HEAVY", "Heavy"),
        ("JAMMED", "Jammed"),
    ]

    zone = models.ForeignKey(TrafficZone, on_delete=models.CASCADE, related_name="readings", db_index=True)
    density = models.PositiveSmallIntegerField(help_text="Vehicles per km, 0–100 scale")
    avg_speed_kmh = models.DecimalField(max_digits=5, decimal_places=2)
    congestion_level = models.CharField(max_length=10, choices=CONGESTION_CHOICES, default="FREE", db_index=True)
    incident_flag = models.BooleanField(default=False)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "traffic_readings"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["zone", "recorded_at"])]

    def __str__(self):
        return f"{self.zone.name} @ {self.recorded_at:%H:%M} — density {self.density}"


class TrafficIncident(SimulationTrackingModel):
    """A detected or reported traffic incident (accident, obstruction)."""
    TYPE_CHOICES = [
        ("ACCIDENT", "Accident"),
        ("BREAKDOWN", "Vehicle Breakdown"),
        ("ROADWORK", "Road Works"),
        ("FLOODING", "Road Flooding"),
        ("OBSTRUCTION", "Obstruction"),
        ("OTHER", "Other"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("CLEARED", "Cleared"),
        ("MONITORING", "Under Monitoring"),
    ]

    zone = models.ForeignKey(TrafficZone, on_delete=models.SET_NULL, null=True, related_name="incidents")
    incident_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    description = models.TextField(blank=True)
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="ACTIVE", db_index=True)
    reported_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    reported_at = models.DateTimeField(auto_now_add=True)
    cleared_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "traffic_incidents"
        ordering = ["-reported_at"]

    def __str__(self):
        return f"{self.incident_type} at {self.zone} — {self.status}"

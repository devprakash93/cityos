"""
apps/water/models.py
Water source monitoring: reservoirs, quality readings, and alerts.
"""
from django.db import models
from core.models import SimulationTrackingModel


class WaterSource(models.Model):
    SOURCE_CHOICES = [
        ("RESERVOIR", "Reservoir"),
        ("BOREWELL", "Borewell"),
        ("TREATMENT_PLANT", "Treatment Plant"),
        ("TANK", "Overhead Tank"),
    ]

    name = models.CharField(max_length=100)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, db_index=True)
    location = models.ForeignKey(
        "geography.Location",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="water_sources"
    )
    capacity_million_liters = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "water_sources"

    def __str__(self):
        return f"{self.name} ({self.source_type})"


class WaterReading(SimulationTrackingModel):
    """IoT sensor reading — water levels and quality parameters."""
    source = models.ForeignKey(WaterSource, on_delete=models.CASCADE, related_name="readings", db_index=True)
    level_percent = models.DecimalField(max_digits=5, decimal_places=2, help_text="Level as % of capacity")
    ph = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text="pH 0–14")
    turbidity_ntu = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    flow_rate_lps = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, help_text="Litres per second")
    chlorine_ppm = models.DecimalField(max_digits=5, decimal_places=3, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "water_readings"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["source", "recorded_at"])]

    def __str__(self):
        return f"{self.source.name} — {self.level_percent}% @ {self.recorded_at:%H:%M}"


class WaterAlert(SimulationTrackingModel):
    ALERT_TYPES = [
        ("LOW_LEVEL", "Low Water Level"),
        ("HIGH_TURBIDITY", "High Turbidity"),
        ("PH_ANOMALY", "pH Anomaly"),
        ("CONTAMINATION", "Contamination Detected"),
    ]
    STATUS_CHOICES = [("ACTIVE", "Active"), ("RESOLVED", "Resolved")]

    source = models.ForeignKey(WaterSource, on_delete=models.CASCADE, related_name="alerts")
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, db_index=True)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE", db_index=True)
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "water_alerts"
        ordering = ["-triggered_at"]


class WaterSchedule(models.Model):
    """Area-wise daily water supply timings."""
    city = models.ForeignKey("geography.City", on_delete=models.CASCADE, related_name="water_schedules")
    ward = models.ForeignKey("geography.Ward", on_delete=models.CASCADE, related_name="water_schedules")
    
    morning_start = models.TimeField(null=True, blank=True)
    morning_end = models.TimeField(null=True, blank=True)
    evening_start = models.TimeField(null=True, blank=True)
    evening_end = models.TimeField(null=True, blank=True)
    days_of_supply = models.CharField(max_length=100, default="Everyday")

    class Meta:
        db_table = "water_schedules"
        unique_together = [("city", "ward")]

    def __str__(self):
        return f"Schedule for {self.ward}, {self.city}"


class WaterNotice(models.Model):
    """Planned or emergency water supply interruptions."""
    NOTICE_TYPES = [
        ("PLANNED_CUT", "Planned Water Cut"),
        ("EMERGENCY_CUT", "Emergency Water Cut"),
        ("LOW_PRESSURE", "Low Water Pressure"),
        ("MAINTENANCE", "Pipeline Maintenance"),
        ("CONTAMINATION", "Water Contamination Alert"),
    ]
    STATUS_CHOICES = [
        ("UPCOMING", "Upcoming"),
        ("IN_PROGRESS", "In Progress"),
        ("RESOLVED", "Resolved"),
    ]

    city = models.ForeignKey("geography.City", on_delete=models.CASCADE, related_name="water_notices")
    ward = models.ForeignKey("geography.Ward", on_delete=models.SET_NULL, null=True, blank=True, related_name="water_notices")
    
    notice_type = models.CharField(max_length=30, choices=NOTICE_TYPES)
    title = models.CharField(max_length=200)
    description = models.TextField()
    reason = models.CharField(max_length=255, blank=True)
    
    start_time = models.DateTimeField()
    expected_restoration = models.DateTimeField(null=True, blank=True)
    actual_restoration = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="UPCOMING")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "water_notices"
        ordering = ["-start_time"]

    def __str__(self):
        return f"[{self.status}] {self.title} - {self.city}"

"""
apps/electricity/models.py
Grid zone monitoring, load readings, and power outages.
"""
from django.db import models
from apps.accounts.models import CustomUser
from core.models import SimulationTrackingModel


class GridZone(models.Model):
    """An electricity grid zone or substation coverage area."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    zone = models.ForeignKey(
        "geography.Zone",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="grid_zones"
    )
    max_load_kw = models.DecimalField(max_digits=10, decimal_places=2, default=1000)
    total_consumers = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "grid_zones"

    def __str__(self):
        return f"{self.name} ({self.code})"


class ElectricityReading(SimulationTrackingModel):
    """IoT sensor reading for a grid zone."""
    zone = models.ForeignKey(GridZone, on_delete=models.CASCADE, related_name="readings", db_index=True)
    voltage_v = models.DecimalField(max_digits=7, decimal_places=2)
    current_a = models.DecimalField(max_digits=7, decimal_places=2)
    load_kw = models.DecimalField(max_digits=10, decimal_places=2)
    load_percent = models.DecimalField(max_digits=5, decimal_places=2, help_text="Load as % of max")
    frequency_hz = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    overload_flag = models.BooleanField(default=False)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "electricity_readings"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.zone.name} — {self.load_kw} kW @ {self.recorded_at:%H:%M}"


class PowerOutage(SimulationTrackingModel):
    """An active or resolved power outage for a grid zone."""
    CAUSE_CHOICES = [
        ("EQUIPMENT_FAILURE", "Equipment Failure"),
        ("OVERLOAD", "Overload"),
        ("MAINTENANCE", "Planned Maintenance"),
        ("WEATHER", "Weather Event"),
        ("ACCIDENT", "Accident"),
        ("UNKNOWN", "Unknown"),
    ]
    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("RESTORING", "Being Restored"),
        ("RESOLVED", "Resolved"),
    ]

    zone = models.ForeignKey(GridZone, on_delete=models.CASCADE, related_name="outages", db_index=True)
    cause = models.CharField(max_length=25, choices=CAUSE_CHOICES, default="UNKNOWN")
    description = models.TextField(blank=True)
    affected_households = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="ACTIVE", db_index=True)
    start_time = models.DateTimeField(auto_now_add=True)
    estimated_restoration = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    reported_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "power_outages"
        ordering = ["-start_time"]
        indexes = [models.Index(fields=["status", "zone"])]

    def __str__(self):
        return f"Outage at {self.zone.name} [{self.status}]"

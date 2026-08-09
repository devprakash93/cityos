"""
apps/waste/models.py
Waste bin monitoring and collection management.
"""
from django.db import models
from apps.accounts.models import CustomUser
from core.models import SimulationTrackingModel


class WasteBin(models.Model):
    """A physical waste bin with GPS coordinates and capacity data."""
    BIN_TYPE_CHOICES = [
        ("GENERAL", "General Waste"),
        ("RECYCLABLE", "Recyclable"),
        ("ORGANIC", "Organic"),
        ("HAZARDOUS", "Hazardous"),
    ]

    name = models.CharField(max_length=100)
    bin_type = models.CharField(max_length=15, choices=BIN_TYPE_CHOICES, default="GENERAL", db_index=True)
    location = models.ForeignKey(
        "geography.Location",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="waste_bins"
    )
    capacity_liters = models.PositiveIntegerField(default=100)
    is_active = models.BooleanField(default=True)
    installed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "waste_bins"

    def __str__(self):
        return f"{self.name} ({self.bin_type})"


class WasteBinReading(SimulationTrackingModel):
    """IoT sensor reading for a bin. Written by simulator."""
    bin = models.ForeignKey(WasteBin, on_delete=models.CASCADE, related_name="readings", db_index=True)
    fill_percent = models.PositiveSmallIntegerField(help_text="0–100%")
    battery_percent = models.PositiveSmallIntegerField(default=100)
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    alert_triggered = models.BooleanField(default=False)  # True if fill >= 80%
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "waste_bin_readings"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.bin.name} — {self.fill_percent}% @ {self.recorded_at:%H:%M}"


class CollectionRoute(models.Model):
    """A named collection route grouping several bins."""
    name = models.CharField(max_length=100)
    bins = models.ManyToManyField(WasteBin, related_name="routes", blank=True)
    assigned_vehicle = models.CharField(max_length=50, blank=True)
    assigned_worker = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "collection_routes"

    def __str__(self):
        return self.name


class CollectionLog(models.Model):
    """Record of a completed bin collection event."""
    route = models.ForeignKey(CollectionRoute, on_delete=models.SET_NULL, null=True, blank=True)
    bin = models.ForeignKey(WasteBin, on_delete=models.CASCADE, related_name="collection_logs")
    collected_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    fill_at_collection = models.PositiveSmallIntegerField()
    collected_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "collection_logs"
        ordering = ["-collected_at"]

    def __str__(self):
        return f"{self.bin.name} collected at {self.collected_at:%Y-%m-%d %H:%M}"

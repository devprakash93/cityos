"""
apps/pollution/models.py
AQI station monitoring with multi-pollutant readings and zone alerts.
"""
from django.db import models
from core.models import SimulationTrackingModel


class AQIStation(models.Model):
    """An air quality monitoring station."""
    name = models.CharField(max_length=100)
    location = models.ForeignKey(
        "geography.Location",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="aqi_stations"
    )
    is_active = models.BooleanField(default=True)
    installed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "aqi_stations"

    def __str__(self):
        return self.name


class AQIReading(SimulationTrackingModel):
    """Multi-pollutant reading from an AQI station. Written by simulator."""
    AQI_CATEGORIES = [
        ("GOOD", "Good (0–50)"),
        ("MODERATE", "Moderate (51–100)"),
        ("UNHEALTHY", "Unhealthy for Sensitive Groups (101–150)"),
        ("VERY_UNHEALTHY", "Very Unhealthy (151–200)"),
        ("HAZARDOUS", "Hazardous (200+)"),
    ]

    station = models.ForeignKey(AQIStation, on_delete=models.CASCADE, related_name="readings", db_index=True)
    pm25 = models.DecimalField(max_digits=7, decimal_places=2, help_text="PM2.5 µg/m³")
    pm10 = models.DecimalField(max_digits=7, decimal_places=2, help_text="PM10 µg/m³")
    co2 = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="CO2 ppm")
    no2 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="NO2 µg/m³")
    so2 = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True, help_text="SO2 µg/m³")
    aqi_value = models.DecimalField(max_digits=6, decimal_places=2, db_index=True)
    category = models.CharField(max_length=20, choices=AQI_CATEGORIES, db_index=True)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "aqi_readings"
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["station", "recorded_at"])]

    def __str__(self):
        return f"{self.station.name} — AQI {self.aqi_value} ({self.category}) @ {self.recorded_at:%H:%M}"


class PollutionAlert(SimulationTrackingModel):
    """Alert when AQI crosses UNHEALTHY threshold."""
    STATUS_CHOICES = [("ACTIVE", "Active"), ("RESOLVED", "Resolved")]

    station = models.ForeignKey(AQIStation, on_delete=models.CASCADE, related_name="alerts")
    aqi_value = models.DecimalField(max_digits=6, decimal_places=2)
    category = models.CharField(max_length=20)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ACTIVE", db_index=True)
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "pollution_alerts"
        ordering = ["-triggered_at"]

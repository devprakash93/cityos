from django.db import models
from apps.accounts.models import CustomUser

class DemoModeConfig(models.Model):
    """
    Global configuration for the continuous demo mode engine.
    There should only be one row in this table.
    """
    is_enabled = models.BooleanField(default=False)
    interval_seconds = models.IntegerField(default=10, help_text="Tick interval in seconds")
    last_run_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "demo_mode_config"

    def __str__(self):
        return f"Demo Mode: {'ON' if self.is_enabled else 'OFF'}"

class SimulationEvent(models.Model):
    """
    A triggered simulation event (e.g. 'Traffic Accident', 'Water Leakage').
    """
    EVENT_TYPES = [
        ("TRAFFIC_ACCIDENT", "Traffic Accident"),
        ("BIN_FULL", "Waste Bin Full"),
        ("WATER_LEAKAGE", "Water Leakage"),
        ("POWER_OUTAGE", "Power Outage"),
        ("BUS_BREAKDOWN", "Bus Breakdown"),
        ("AQI_HIGH", "High AQI Alert"),
        ("EMERGENCY", "General Emergency"),
        ("CYCLONE", "Cyclone Alert"),
    ]
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    city = models.ForeignKey("geography.City", on_delete=models.CASCADE, related_name="simulation_events")
    severity = models.CharField(max_length=15, default="WARNING")
    payload = models.JSONField(default=dict, blank=True)
    
    triggered_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    triggered_at = models.DateTimeField(auto_now_add=True)
    
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = "simulation_events"
        ordering = ["-triggered_at"]

    def __str__(self):
        return f"{self.event_type} in {self.city.name} at {self.triggered_at}"

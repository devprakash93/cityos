"""
apps/transport/models.py
Public transport: routes, stops, buses, live GPS and schedules.
"""
from django.db import models
from apps.accounts.models import CustomUser
from core.models import SimulationTrackingModel


class BusRoute(models.Model):
    route_number = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=200)
    origin = models.CharField(max_length=100)
    destination = models.CharField(max_length=100)
    distance_km = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fare_inr = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    city = models.ForeignKey(
        "geography.City",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="bus_routes"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "bus_routes"

    def __str__(self):
        return f"Route {self.route_number}: {self.origin} → {self.destination}"


class BusStop(models.Model):
    name = models.CharField(max_length=100)
    route = models.ForeignKey(BusRoute, on_delete=models.CASCADE, related_name="stops")
    stop_order = models.PositiveSmallIntegerField()
    location = models.ForeignKey(
        "geography.Location",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="bus_stops"
    )

    class Meta:
        db_table = "bus_stops"
        ordering = ["route", "stop_order"]

    def __str__(self):
        return f"{self.name} (Stop #{self.stop_order} on {self.route.route_number})"


class Bus(models.Model):
    registration_number = models.CharField(max_length=20, unique=True)
    route = models.ForeignKey(BusRoute, on_delete=models.SET_NULL, null=True, related_name="buses")
    capacity = models.PositiveSmallIntegerField(default=50)
    is_active = models.BooleanField(default=True)
    driver_name = models.CharField(max_length=100, blank=True)
    driver_phone = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "buses"

    def __str__(self):
        return f"Bus {self.registration_number}"


class BusLocation(SimulationTrackingModel):
    """Live GPS location pushed by IoT device / simulator."""
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name="locations", db_index=True)
    location_lat = models.DecimalField(max_digits=9, decimal_places=6)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6)
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    occupancy_percent = models.PositiveSmallIntegerField(default=0)
    next_stop = models.ForeignKey(BusStop, on_delete=models.SET_NULL, null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "bus_locations"
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.bus.registration_number} @ {self.recorded_at:%H:%M}"


class BusSchedule(models.Model):
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name="schedules")
    stop = models.ForeignKey(BusStop, on_delete=models.CASCADE)
    scheduled_arrival = models.TimeField()
    actual_arrival = models.TimeField(null=True, blank=True)
    date = models.DateField()
    delay_minutes = models.IntegerField(default=0)

    class Meta:
        db_table = "bus_schedules"

    def __str__(self):
        return f"{self.bus} at {self.stop} on {self.date}"

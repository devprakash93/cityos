"""
apps/geography/models.py
========================
Odisha geographic hierarchy: State → District → City → Zone → Ward → Location
Also includes the unified Facility model for emergency/civic infrastructure.

Design decisions:
- unique_together enforced at DB level to support idempotent seeding
- is_default on City marks Cuttack as the boot city
- Location is a reusable coordinate model referenced by all IoT/incident modules
- Facility replaces scattered EmergencyContact models
- is_demo + source fields enforce data integrity transparency
"""
from django.db import models


class State(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, help_text="e.g. OD for Odisha")
    country = models.CharField(max_length=100, default="India")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_states"
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name="districts")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_districts"
        unique_together = [("name", "state")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class City(models.Model):
    name = models.CharField(max_length=100)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="cities")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, default=20.4625)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, default=85.8830)
    population = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(
        default=False,
        help_text="Only one city should be default (Cuttack for demo)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_cities"
        unique_together = [("name", "district")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}, {self.district.name}"

    @property
    def state(self):
        return self.district.state


class Zone(models.Model):
    """Administrative zone within a city (e.g. CDA, Old Town)."""
    name = models.CharField(max_length=100)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="zones")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_zones"
        unique_together = [("name", "city")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} — {self.city.name}"


class Ward(models.Model):
    """Municipal ward within a city. May belong to a zone."""
    number = models.PositiveIntegerField()
    name = models.CharField(max_length=100, blank=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="wards")
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name="wards")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "geo_wards"
        unique_together = [("number", "city")]
        ordering = ["number"]

    def __str__(self):
        return f"Ward {self.number} — {self.city.name}"


class Location(models.Model):
    """
    Reusable precise geographic point.
    Referenced by Complaints, TrafficZone, WasteBin, AQIStation, etc.
    Prevents each module from implementing its own lat/lng fields inconsistently.
    """
    SOURCE_SIMULATED = "SIMULATED"
    SOURCE_API = "API"
    SOURCE_MANUAL = "MANUAL"
    SOURCE_SENSOR = "SENSOR"
    SOURCE_CHOICES = [
        (SOURCE_SIMULATED, "Simulated"),
        (SOURCE_API, "External API"),
        (SOURCE_MANUAL, "Manually Entered"),
        (SOURCE_SENSOR, "IoT Sensor"),
    ]

    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    address = models.CharField(max_length=255, blank=True)
    landmark = models.CharField(max_length=100, blank=True)
    ward = models.ForeignKey(Ward, on_delete=models.SET_NULL, null=True, blank=True, related_name="locations")
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="locations")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default=SOURCE_SIMULATED)
    is_demo = models.BooleanField(default=True, help_text="True = demo/simulated location")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "geo_locations"
        ordering = ["city", "address"]

    def __str__(self):
        return f"{self.address or 'Location'} ({self.city.name})"


class Facility(models.Model):
    """
    Unified model for civic/emergency facilities: hospitals, police, fire, etc.
    Replaces scattered EmergencyContact tables.

    IMPORTANT: All phone numbers in demo data must be labeled is_demo=True.
    Never invent or present unofficial government phone numbers as real.
    """
    TYPE_HOSPITAL = "HOSPITAL"
    TYPE_POLICE = "POLICE"
    TYPE_FIRE = "FIRE_STATION"
    TYPE_AMBULANCE = "AMBULANCE"
    TYPE_DISASTER = "DISASTER_CENTER"
    TYPE_BUS_DEPOT = "BUS_DEPOT"
    TYPE_WATER_FACILITY = "WATER_FACILITY"
    TYPE_POWER_STATION = "POWER_STATION"

    TYPE_CHOICES = [
        (TYPE_HOSPITAL, "Hospital"),
        (TYPE_POLICE, "Police Station"),
        (TYPE_FIRE, "Fire Station"),
        (TYPE_AMBULANCE, "Ambulance Station"),
        (TYPE_DISASTER, "Disaster Management Center"),
        (TYPE_BUS_DEPOT, "Bus Depot"),
        (TYPE_WATER_FACILITY, "Water Treatment Facility"),
        (TYPE_POWER_STATION, "Power Station"),
    ]

    STATUS_ACTIVE = "ACTIVE"
    STATUS_INACTIVE = "INACTIVE"
    STATUS_MAINTENANCE = "MAINTENANCE"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_INACTIVE, "Inactive"),
        (STATUS_MAINTENANCE, "Under Maintenance"),
    ]

    name = models.CharField(max_length=200)
    facility_type = models.CharField(max_length=30, choices=TYPE_CHOICES, db_index=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name="facilities")
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name="facilities")
    address = models.TextField()
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    phone = models.CharField(
        max_length=30, blank=True,
        help_text="DEMO ONLY — never invent official government numbers"
    )
    is_demo = models.BooleanField(
        default=True,
        help_text="True = demo data, never claim this is live government data"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "geo_facilities"
        ordering = ["facility_type", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_facility_type_display()}) — {self.city.name}"

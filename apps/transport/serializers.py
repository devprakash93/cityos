from rest_framework import serializers
from .models import BusRoute, BusStop, Bus, BusLocation, BusSchedule


class BusRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusRoute
        fields = "__all__"


class BusStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusStop
        fields = "__all__"


class BusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bus
        fields = "__all__"


class BusLocationSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="bus.registration_number", read_only=True)

    class Meta:
        model = BusLocation
        fields = ["id", "bus", "bus_number", "location_lat", "location_lng",
                  "speed_kmh", "occupancy_percent", "next_stop", "recorded_at"]


class BusScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusSchedule
        fields = "__all__"

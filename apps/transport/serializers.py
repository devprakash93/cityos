from rest_framework import serializers
from .models import BusRoute, BusStop, Bus, BusLocation, BusSchedule


class BusRouteSerializer(serializers.ModelSerializer):
    stops = serializers.SerializerMethodField()

    class Meta:
        model = BusRoute
        fields = "__all__"

    def get_stops(self, obj):
        return [s.name for s in obj.stops.all()]


class BusStopSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusStop
        fields = "__all__"


class BusSerializer(serializers.ModelSerializer):
    bus_number = serializers.CharField(source="registration_number", read_only=True)
    route_number = serializers.CharField(source="route.route_number", read_only=True)
    route_name = serializers.CharField(source="route.name", read_only=True)
    status = serializers.SerializerMethodField()
    current_stop = serializers.SerializerMethodField()
    next_stop = serializers.SerializerMethodField()
    eta_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Bus
        fields = "__all__"

    def _get_latest_loc(self, obj):
        if not hasattr(obj, "_latest_loc"):
            obj._latest_loc = obj.locations.order_by("-recorded_at").first()
        return obj._latest_loc

    def get_status(self, obj):
        if not obj.is_active:
            return "OUT_OF_SERVICE"
        loc = self._get_latest_loc(obj)
        if loc and loc.speed_kmh < 10 and loc.next_stop:
            return "DELAYED"
        return "ACTIVE"

    def get_current_stop(self, obj):
        loc = self._get_latest_loc(obj)
        if not loc:
            return None
        return "In Transit" if loc.speed_kmh > 0 else "At Stop"

    def get_next_stop(self, obj):
        loc = self._get_latest_loc(obj)
        if loc and loc.next_stop:
            return loc.next_stop.name
        return None

    def get_eta_minutes(self, obj):
        loc = self._get_latest_loc(obj)
        if loc and loc.next_stop:
            import random
            return random.randint(2, 20)
        return None


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

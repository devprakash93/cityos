"""Waste serializers."""
from rest_framework import serializers
from .models import WasteBin, WasteBinReading, CollectionRoute, CollectionLog


class WasteBinSerializer(serializers.ModelSerializer):
    location_address = serializers.CharField(source="location.address", read_only=True)
    city_name = serializers.CharField(source="location.city.name", read_only=True)
    ward_number = serializers.CharField(source="location.ward.number", read_only=True)
    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = WasteBin
        fields = "__all__"

    def get_latest_reading(self, obj):
        reading = obj.readings.order_by("-recorded_at").first()
        if not reading:
            return None
        return {
            "fill_percent": reading.fill_percent,
            "battery_percent": reading.battery_percent,
            "temperature_c": str(reading.temperature_c) if reading.temperature_c is not None else None,
            "alert_triggered": reading.alert_triggered,
            "recorded_at": reading.recorded_at,
        }


class WasteBinReadingSerializer(serializers.ModelSerializer):
    bin_name = serializers.CharField(source="bin.name", read_only=True)

    class Meta:
        model = WasteBinReading
        fields = [
            "id", "bin", "bin_name", "fill_percent", "battery_percent",
            "temperature_c", "alert_triggered", "recorded_at"
        ]


class CollectionRouteSerializer(serializers.ModelSerializer):
    bins_count = serializers.IntegerField(source="bins.count", read_only=True)
    worker_name = serializers.CharField(source="assigned_worker.full_name", read_only=True)

    class Meta:
        model = CollectionRoute
        fields = "__all__"


class CollectionLogSerializer(serializers.ModelSerializer):
    bin_name = serializers.CharField(source="bin.name", read_only=True)
    collector_name = serializers.CharField(source="collected_by.full_name", read_only=True)
    route_name = serializers.CharField(source="route.name", read_only=True)

    class Meta:
        model = CollectionLog
        fields = "__all__"

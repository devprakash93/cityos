"""apps/traffic serializers, views, urls, apps."""
from rest_framework import serializers
from .models import TrafficZone, TrafficReading, TrafficIncident


class TrafficZoneSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    city_name = serializers.CharField(source="zone.city.name", read_only=True)
    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = TrafficZone
        fields = "__all__"

    def get_latest_reading(self, obj):
        reading = obj.readings.order_by("-recorded_at").first()
        if not reading:
            return None
        return {
            "density": reading.density,
            "avg_speed_kmh": str(reading.avg_speed_kmh),
            "congestion_level": reading.congestion_level,
            "incident_flag": reading.incident_flag,
            "recorded_at": reading.recorded_at,
        }


class TrafficReadingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = TrafficReading
        fields = [
            "id", "zone", "zone_name", "density", "avg_speed_kmh",
            "congestion_level", "incident_flag", "recorded_at"
        ]


class TrafficIncidentSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    city_name = serializers.CharField(source="zone.zone.city.name", read_only=True)

    class Meta:
        model = TrafficIncident
        fields = "__all__"

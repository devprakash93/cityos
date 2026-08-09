"""apps/traffic serializers, views, urls, apps."""
from rest_framework import serializers
from .models import TrafficZone, TrafficReading, TrafficIncident


class TrafficZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficZone
        fields = "__all__"


class TrafficReadingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = TrafficReading
        fields = ["id", "zone", "zone_name", "density", "avg_speed_kmh",
                  "congestion_level", "incident_flag", "recorded_at"]


class TrafficIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrafficIncident
        fields = "__all__"

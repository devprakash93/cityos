"""Waste serializers."""
from rest_framework import serializers
from .models import WasteBin, WasteBinReading, CollectionRoute, CollectionLog


class WasteBinSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteBin
        fields = "__all__"


class WasteBinReadingSerializer(serializers.ModelSerializer):
    bin_name = serializers.CharField(source="bin.name", read_only=True)

    class Meta:
        model = WasteBinReading
        fields = ["id", "bin", "bin_name", "fill_percent", "battery_percent",
                  "temperature_c", "alert_triggered", "recorded_at"]


class CollectionRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionRoute
        fields = "__all__"


class CollectionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionLog
        fields = "__all__"

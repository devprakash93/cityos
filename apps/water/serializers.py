from rest_framework import serializers
from .models import WaterSource, WaterReading, WaterAlert


class WaterSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterSource
        fields = "__all__"


class WaterReadingSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = WaterReading
        fields = ["id", "source", "source_name", "level_percent", "ph",
                  "turbidity_ntu", "flow_rate_lps", "chlorine_ppm", "recorded_at"]


class WaterAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterAlert
        fields = "__all__"

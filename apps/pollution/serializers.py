from rest_framework import serializers
from .models import AQIStation, AQIReading, PollutionAlert


class AQIStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AQIStation
        fields = "__all__"


class AQIReadingSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="station.name", read_only=True)

    class Meta:
        model = AQIReading
        fields = ["id", "station", "station_name", "pm25", "pm10", "co2", "no2", "so2",
                  "aqi_value", "category", "recorded_at"]


class PollutionAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollutionAlert
        fields = "__all__"

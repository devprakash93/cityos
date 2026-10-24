from rest_framework import serializers
from .models import AQIStation, AQIReading, PollutionAlert


class AQIStationSerializer(serializers.ModelSerializer):
    location_address = serializers.CharField(source="location.address", read_only=True)
    city_name = serializers.CharField(source="location.city.name", read_only=True)
    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = AQIStation
        fields = "__all__"

    def get_latest_reading(self, obj):
        reading = obj.readings.order_by("-recorded_at").first()
        if not reading:
            return None
        return {
            "aqi_value": str(reading.aqi_value),
            "category": reading.category,
            "pm25": str(reading.pm25),
            "pm10": str(reading.pm10),
            "co2": str(reading.co2) if reading.co2 is not None else None,
            "no2": str(reading.no2) if reading.no2 is not None else None,
            "so2": str(reading.so2) if reading.so2 is not None else None,
            "recorded_at": reading.recorded_at,
        }


class AQIReadingSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="station.name", read_only=True)

    class Meta:
        model = AQIReading
        fields = [
            "id", "station", "station_name", "pm25", "pm10", "co2", "no2", "so2",
            "aqi_value", "category", "recorded_at"
        ]


class PollutionAlertSerializer(serializers.ModelSerializer):
    station_name = serializers.CharField(source="station.name", read_only=True)

    class Meta:
        model = PollutionAlert
        fields = "__all__"

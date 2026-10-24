from rest_framework import serializers
from .models import WaterSource, WaterReading, WaterAlert, WaterSchedule, WaterNotice


class WaterSourceSerializer(serializers.ModelSerializer):
    location_address = serializers.CharField(source="location.address", read_only=True)
    city_name = serializers.CharField(source="location.city.name", read_only=True)
    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = WaterSource
        fields = "__all__"

    def get_latest_reading(self, obj):
        reading = obj.readings.order_by("-recorded_at").first()
        if not reading:
            return None
        return {
            "level_percent": str(reading.level_percent),
            "ph": str(reading.ph) if reading.ph is not None else None,
            "turbidity_ntu": str(reading.turbidity_ntu) if reading.turbidity_ntu is not None else None,
            "flow_rate_lps": str(reading.flow_rate_lps) if reading.flow_rate_lps is not None else None,
            "chlorine_ppm": str(reading.chlorine_ppm) if reading.chlorine_ppm is not None else None,
            "recorded_at": reading.recorded_at,
        }


class WaterReadingSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = WaterReading
        fields = [
            "id", "source", "source_name", "level_percent", "ph",
            "turbidity_ntu", "flow_rate_lps", "chlorine_ppm", "recorded_at"
        ]


class WaterAlertSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)

    class Meta:
        model = WaterAlert
        fields = "__all__"


class WaterScheduleSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    ward_number = serializers.IntegerField(source="ward.number", read_only=True)

    class Meta:
        model = WaterSchedule
        fields = "__all__"


class WaterNoticeSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    ward_number = serializers.IntegerField(source="ward.number", read_only=True)

    class Meta:
        model = WaterNotice
        fields = "__all__"

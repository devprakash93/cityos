from rest_framework import serializers
from .models import GridZone, ElectricityReading, PowerOutage, ElectricityNotice


class GridZoneSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    city_name = serializers.CharField(source="zone.city.name", read_only=True)
    latest_reading = serializers.SerializerMethodField()

    class Meta:
        model = GridZone
        fields = "__all__"

    def get_latest_reading(self, obj):
        reading = obj.readings.order_by("-recorded_at").first()
        if not reading:
            return None
        return {
            "load_kw": str(reading.load_kw),
            "load_percent": str(reading.load_percent),
            "voltage_v": str(reading.voltage_v),
            "current_a": str(reading.current_a),
            "frequency_hz": str(reading.frequency_hz),
            "overload_flag": reading.overload_flag,
            "recorded_at": reading.recorded_at,
        }


class ElectricityReadingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = ElectricityReading
        fields = [
            "id", "zone", "zone_name", "voltage_v", "current_a", "load_kw",
            "load_percent", "frequency_hz", "overload_flag", "recorded_at"
        ]


class PowerOutageSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    city_name = serializers.CharField(source="zone.zone.city.name", read_only=True)

    class Meta:
        model = PowerOutage
        fields = "__all__"


class ElectricityNoticeSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    ward_number = serializers.CharField(source="ward.number", read_only=True)

    class Meta:
        model = ElectricityNotice
        fields = "__all__"

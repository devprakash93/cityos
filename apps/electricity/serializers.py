from rest_framework import serializers
from .models import GridZone, ElectricityReading, PowerOutage, ElectricityNotice


class GridZoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = GridZone
        fields = "__all__"


class ElectricityReadingSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

    class Meta:
        model = ElectricityReading
        fields = ["id", "zone", "zone_name", "voltage_v", "current_a", "load_kw",
                  "load_percent", "frequency_hz", "overload_flag", "recorded_at"]


class PowerOutageSerializer(serializers.ModelSerializer):
    zone_name = serializers.CharField(source="zone.name", read_only=True)

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

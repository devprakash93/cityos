from rest_framework import serializers
from .models import EmergencyContact, EmergencyIncident, Responder, IncidentAssignment, EmergencyAlert


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = "__all__"


class EmergencyIncidentSerializer(serializers.ModelSerializer):
    location_lat = serializers.SerializerMethodField()
    location_lng = serializers.SerializerMethodField()
    location_address = serializers.CharField(source="location.address", read_only=True)
    reported_by_name = serializers.CharField(source="reported_by.full_name", read_only=True)
    reported_by_email = serializers.CharField(source="reported_by.email", read_only=True)
    reported_by_phone = serializers.CharField(source="reported_by.profile.phone", read_only=True)
    assigned_responder = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyIncident
        fields = "__all__"
        read_only_fields = ["reported_at"]

    def get_location_lat(self, obj):
        if obj.location and obj.location.latitude is not None:
            return float(obj.location.latitude)
        return None

    def get_location_lng(self, obj):
        if obj.location and obj.location.longitude is not None:
            return float(obj.location.longitude)
        return None

    def get_assigned_responder(self, obj):
        assignment = obj.assignments.select_related("responder").order_by("-assigned_at").first()
        if assignment and assignment.responder:
            return {
                "id": assignment.responder.id,
                "unit_code": assignment.responder.unit_code,
                "responder_type": assignment.responder.responder_type,
                "status": assignment.responder.status,
                "contact_phone": assignment.responder.contact_phone,
                "assigned_at": assignment.assigned_at,
            }
        return None


class ResponderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Responder
        fields = "__all__"


class IncidentAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentAssignment
        fields = "__all__"


class EmergencyAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyAlert
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by"]

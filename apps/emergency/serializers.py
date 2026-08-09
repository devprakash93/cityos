from rest_framework import serializers
from .models import EmergencyContact, EmergencyIncident, Responder, IncidentAssignment, EmergencyAlert


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = "__all__"


class EmergencyIncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyIncident
        fields = "__all__"
        read_only_fields = ["reported_at"]


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

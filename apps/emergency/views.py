from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import EmergencyContact, EmergencyIncident, Responder, IncidentAssignment
from .serializers import (
    EmergencyContactSerializer, EmergencyIncidentSerializer,
    ResponderSerializer, IncidentAssignmentSerializer, EmergencyAlertSerializer
)
from core.mixins import CityScopeMixin


@extend_schema(tags=["emergency"])
class EmergencyContactViewSet(viewsets.ReadOnlyModelViewSet):
    """Public emergency contacts — readable by all authenticated users."""
    queryset = EmergencyContact.objects.filter(is_active=True).order_by("type")
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type"]


@extend_schema(tags=["emergency"])
class EmergencyIncidentViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = EmergencyIncidentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "incident_type", "severity"]
    search_fields = ["title", "description", "location__address"]
    city_lookup_field = "location__city"

    def get_queryset(self):
        return super().get_queryset().select_related("location__city").order_by("-reported_at")
    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        incident = serializer.save(reported_by=self.request.user)
        # Notify all relevant parties for CRITICAL/HIGH incidents
        if incident.severity in ("CRITICAL", "HIGH"):
            from apps.notifications.services import NotificationService
            NotificationService.notify_emergency(
                title=f"🚨 {incident.get_severity_display()} Emergency: {incident.title}",
                message=f"Type: {incident.get_incident_type_display()}. Location: {incident.address}",
                related_object=incident,
            )

    @action(detail=True, methods=["post"], url_path="assign-responder",
            permission_classes=[IsAuthenticated, IsOfficerOrAdmin])
    def assign_responder(self, request, pk=None):
        incident = self.get_object()
        responder_id = request.data.get("responder_id")
        try:
            responder = Responder.objects.get(pk=responder_id, status="AVAILABLE", is_active=True)
        except Responder.DoesNotExist:
            return Response({"error": "Responder not found or not available."}, status=404)

        assignment = IncidentAssignment.objects.create(
            incident=incident,
            responder=responder,
            assigned_by=request.user,
            notes=request.data.get("notes", ""),
        )
        responder.status = "DISPATCHED"
        responder.save(update_fields=["status"])
        return Response(
            {"success": True, "assignment_id": assignment.pk},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["emergency"])
class ResponderViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = ResponderSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    filterset_fields = ["status", "responder_type"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("city").order_by("unit_code")


@extend_schema(tags=["emergency"])
class EmergencyAlertViewSet(CityScopeMixin, viewsets.ModelViewSet):
    """
    Emergency alerts broadcasted to the public (e.g. Cyclone warning).
    Lifecycle: DRAFT -> PUBLISHED -> ACTIVE -> EXPIRED
    """
    from .models import EmergencyAlert
    queryset = EmergencyAlert.objects.all().select_related("city")
    serializer_class = EmergencyAlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "severity"]
    search_fields = ["title", "description"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().select_related("city").order_by("-created_at")

    def get_permissions(self):
        # Only Officers or Admins can create/update alerts
        if self.action in ("create", "update", "partial_update", "destroy", "update_status"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        """Transition alert status (DRAFT -> PUBLISHED -> ACTIVE -> EXPIRED)"""
        alert = self.get_object()
        new_status = request.data.get("status")
        
        valid_transitions = {
            "DRAFT": ["PUBLISHED"],
            "PUBLISHED": ["ACTIVE", "EXPIRED"],
            "ACTIVE": ["EXPIRED"],
            "EXPIRED": []
        }
        
        if new_status not in valid_transitions.get(alert.status, []):
            return Response(
                {"error": f"Cannot transition from {alert.status} to {new_status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        alert.status = new_status
        alert.save(update_fields=["status", "updated_at"])
        
        if new_status == "PUBLISHED":
            # Fire notification to all users in the city
            from apps.notifications.services import NotificationService
            NotificationService.notify_emergency(
                title=f"🚨 {alert.get_severity_display()}: {alert.title}",
                message=alert.description,
                related_object=alert
            )
            
        return Response(EmergencyAlertSerializer(alert).data)

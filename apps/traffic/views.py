"""
apps/traffic/views.py
Traffic management ViewSets — read-only public data + officer management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from drf_spectacular.utils import extend_schema

from core.permissions import IsOfficerOrAdmin
from .models import TrafficZone, TrafficReading, TrafficIncident
from .serializers import TrafficZoneSerializer, TrafficReadingSerializer, TrafficIncidentSerializer


from core.mixins import CityScopeMixin

@extend_schema(tags=["traffic"])
class TrafficZoneViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = TrafficZoneSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["road_type"]
    search_fields = ["name", "code"]
    city_lookup_field = "zone__city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("zone__city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="latest-reading")
    def latest_reading(self, request, pk=None):
        """GET /api/traffic/{id}/latest-reading/ — most recent IoT reading."""
        zone = self.get_object()
        reading = zone.readings.order_by("-recorded_at").first()
        if not reading:
            return Response({"message": "No readings yet."})
        return Response(TrafficReadingSerializer(reading).data)

    @action(detail=True, methods=["get"], url_path="readings")
    def readings(self, request, pk=None):
        """GET /api/traffic/{id}/readings/ — recent 50 readings."""
        zone = self.get_object()
        readings = zone.readings.order_by("-recorded_at")[:50]
        return Response(TrafficReadingSerializer(readings, many=True).data)


@extend_schema(tags=["traffic"])
class TrafficIncidentViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = TrafficIncidentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "incident_type", "zone"]
    search_fields = ["description"]
    city_lookup_field = "zone__zone__city"

    def get_queryset(self):
        return super().get_queryset().select_related("zone__zone__city").order_by("-reported_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

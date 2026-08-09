from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import WaterSource, WaterAlert
from .serializers import WaterSourceSerializer, WaterReadingSerializer, WaterAlertSerializer


from core.mixins import CityScopeMixin

@extend_schema(tags=["water"])
class WaterSourceViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = WaterSourceSerializer
    permission_classes = [IsAuthenticated]
    city_lookup_field = "location__city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("location__city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="latest-reading")
    def latest_reading(self, request, pk=None):
        source = self.get_object()
        reading = source.readings.order_by("-recorded_at").first()
        if not reading:
            return Response({"message": "No readings yet."})
        return Response(WaterReadingSerializer(reading).data)

    @action(detail=True, methods=["get"], url_path="readings")
    def readings(self, request, pk=None):
        source = self.get_object()
        readings = source.readings.order_by("-recorded_at")[:50]
        return Response(WaterReadingSerializer(readings, many=True).data)


@extend_schema(tags=["water"])
class WaterAlertViewSet(CityScopeMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = WaterAlertSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    filterset_fields = ["status", "alert_type"]
    city_lookup_field = "source__location__city"

    def get_queryset(self):
        return super().get_queryset().select_related("source__location__city").order_by("-triggered_at")

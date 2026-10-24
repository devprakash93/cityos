from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import WaterSource, WaterAlert, WaterNotice, WaterSchedule
from .serializers import (
    WaterSourceSerializer, WaterReadingSerializer, WaterAlertSerializer,
    WaterNoticeSerializer, WaterScheduleSerializer
)


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


@extend_schema(tags=["water"])
class WaterScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    """Schedules for daily water supply."""
    serializer_class = WaterScheduleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["city", "ward"]

    def get_queryset(self):
        qs = WaterSchedule.objects.select_related("city", "ward")
        city_id = self.request.query_params.get("city")
        ward_id = self.request.query_params.get("ward")
        if city_id:
            qs = qs.filter(city_id=city_id)
        if ward_id:
            qs = qs.filter(ward_id=ward_id)
        return qs


class WaterNoticeViewSet(CityScopeMixin, viewsets.ModelViewSet):
    """Planned/emergency interruptions."""
    queryset = WaterNotice.objects.all()
    serializer_class = WaterNoticeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["city", "ward", "status", "notice_type"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().select_related("city", "ward").order_by("-start_time")
        
    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

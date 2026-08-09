"""Waste views."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from core.permissions import IsOfficerOrAdmin
from .models import WasteBin, CollectionRoute, CollectionLog
from .serializers import (
    WasteBinSerializer, WasteBinReadingSerializer,
    CollectionRouteSerializer, CollectionLogSerializer,
)


from core.mixins import CityScopeMixin

@extend_schema(tags=["waste"])
class WasteBinViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = WasteBinSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["bin_type"]
    search_fields = ["name", "location__address"]
    city_lookup_field = "location__city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("location__city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="latest-reading")
    def latest_reading(self, request, pk=None):
        bin_obj = self.get_object()
        reading = bin_obj.readings.order_by("-recorded_at").first()
        if not reading:
            return Response({"message": "No readings yet."})
        return Response(WasteBinReadingSerializer(reading).data)

    @action(detail=False, methods=["get"], url_path="alerts")
    def alerts(self, request):
        """Bins with fill >= 80% (most recent reading)."""
        from django.db.models import OuterRef, Subquery
        from .models import WasteBinReading
        latest_reading_ids = WasteBinReading.objects.filter(
            bin=OuterRef("pk")
        ).order_by("-recorded_at").values("id")[:1]
        
        qs = self.get_queryset()
                
        alert_bins = qs.filter(
            readings__id__in=Subquery(latest_reading_ids),
            readings__alert_triggered=True,
        ).distinct()
        return Response(WasteBinSerializer(alert_bins, many=True).data)


@extend_schema(tags=["waste"])
class CollectionRouteViewSet(CityScopeMixin, viewsets.ModelViewSet):
    city_lookup_field = "city"
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)
    serializer_class = CollectionRouteSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]


@extend_schema(tags=["waste"])
class CollectionLogViewSet(CityScopeMixin, viewsets.ReadOnlyModelViewSet):
    city_lookup_field = "bin__location__city"
    def get_queryset(self):
        return super().get_queryset().select_related("bin", "collected_by").order_by("-collected_at")
    serializer_class = CollectionLogSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    filterset_fields = ["bin", "route"]

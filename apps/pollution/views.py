from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import AQIStation, PollutionAlert
from .serializers import AQIStationSerializer, AQIReadingSerializer, PollutionAlertSerializer


from core.mixins import CityScopeMixin

@extend_schema(tags=["pollution"])
class AQIStationViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = AQIStationSerializer
    permission_classes = [IsAuthenticated]
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
        station = self.get_object()
        reading = station.readings.order_by("-recorded_at").first()
        if not reading:
            return Response({"message": "No readings yet."})
        return Response(AQIReadingSerializer(reading).data)

    @action(detail=True, methods=["get"], url_path="readings")
    def readings(self, request, pk=None):
        station = self.get_object()
        readings = station.readings.order_by("-recorded_at")[:50]
        return Response(AQIReadingSerializer(readings, many=True).data)

    @action(detail=False, methods=["get"], url_path="city-aqi")
    def city_aqi(self, request):
        """Latest reading from every active station — used for city-wide dashboard."""
        from .models import AQIReading
        from django.db.models import OuterRef, Subquery
        latest_ids = AQIReading.objects.filter(
            station=OuterRef("pk")
        ).order_by("-recorded_at").values("id")[:1]
        
        qs = self.get_queryset()
                
        stations = qs
        results = []
        for station in stations:
            reading = station.readings.order_by("-recorded_at").first()
            results.append({
                "station": AQIStationSerializer(station).data,
                "latest_reading": AQIReadingSerializer(reading).data if reading else None,
            })
        return Response(results)


@extend_schema(tags=["pollution"])
class PollutionAlertViewSet(CityScopeMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = PollutionAlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "category"]
    city_lookup_field = "station__location__city"

    def get_queryset(self):
        return super().get_queryset().select_related("station__location__city").order_by("-triggered_at")

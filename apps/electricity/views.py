from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import GridZone, PowerOutage
from .serializers import GridZoneSerializer, ElectricityReadingSerializer, PowerOutageSerializer


from core.mixins import CityScopeMixin

@extend_schema(tags=["electricity"])
class GridZoneViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = GridZoneSerializer
    permission_classes = [IsAuthenticated]
    city_lookup_field = "zone__city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("zone__city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="latest-reading")
    def latest_reading(self, request, pk=None):
        zone = self.get_object()
        reading = zone.readings.order_by("-recorded_at").first()
        if not reading:
            return Response({"message": "No readings yet."})
        return Response(ElectricityReadingSerializer(reading).data)


@extend_schema(tags=["electricity"])
class PowerOutageViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = PowerOutageSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "zone", "cause"]
    city_lookup_field = "zone__zone__city"

    def get_queryset(self):
        return super().get_queryset().select_related("zone__zone__city").order_by("-start_time")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(reported_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="active")
    def active_outages(self, request):
        """GET /api/electricity/outages/active/ — currently active outages."""
        qs = PowerOutage.objects.filter(status="ACTIVE").select_related("zone__zone__city")
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(request.user)
        if city:
            qs = qs.filter(zone__zone__city=city)
        else:
            city_id = request.query_params.get("city_id")
            if city_id:
                qs = qs.filter(zone__zone__city_id=city_id)
        return Response(PowerOutageSerializer(qs, many=True).data)

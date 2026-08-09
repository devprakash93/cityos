from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin
from .models import BusRoute, Bus, BusSchedule
from .serializers import (
    BusRouteSerializer, BusStopSerializer, BusSerializer,
    BusLocationSerializer, BusScheduleSerializer,
)


from core.mixins import CityScopeMixin

@extend_schema(tags=["transport"])
class BusRouteViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = BusRouteSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ["route_number", "name", "origin", "destination"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="stops")
    def stops(self, request, pk=None):
        route = self.get_object()
        stops = route.stops.order_by("stop_order")
        return Response(BusStopSerializer(stops, many=True).data)

    @action(detail=True, methods=["get"], url_path="buses")
    def buses(self, request, pk=None):
        route = self.get_object()
        buses = route.buses.filter(is_active=True)
        return Response(BusSerializer(buses, many=True).data)


@extend_schema(tags=["transport"])
class BusViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = BusSerializer
    permission_classes = [IsAuthenticated]
    city_lookup_field = "route__city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("route__city")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=["get"], url_path="live-location")
    def live_location(self, request, pk=None):
        """Latest GPS ping for this bus."""
        bus = self.get_object()
        location = bus.locations.order_by("-recorded_at").first()
        if not location:
            return Response({"message": "No location data yet."})
        return Response(BusLocationSerializer(location).data)


@extend_schema(tags=["transport"])
class BusScheduleViewSet(viewsets.ModelViewSet):
    queryset = BusSchedule.objects.select_related("bus", "stop").order_by("date", "scheduled_arrival")
    serializer_class = BusScheduleSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["bus", "stop", "date"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

"""
apps/geography/views.py
========================
Public/authenticated views for geographic hierarchy data.
Cities, Districts, Wards, Facilities — all read-only for citizens.
Write access for Super Admin only.
"""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import State, District, City, Zone, Ward, Location, Facility
from .serializers import (
    StateSerializer, DistrictSerializer, CitySerializer,
    ZoneSerializer, WardSerializer, LocationSerializer, FacilitySerializer
)
from .permissions import IsSuperAdminRole, IsSuperAdminOrReadOnly
from django.db import models
from apps.accounts.models import CustomUser, Role
from apps.complaints.models import Complaint
from apps.emergency.models import EmergencyIncident


@extend_schema(tags=["geography"])
class StateViewSet(viewsets.ModelViewSet):
    queryset = State.objects.all()
    serializer_class = StateSerializer
    permission_classes = [IsSuperAdminOrReadOnly]


@extend_schema(tags=["geography"])
class DistrictViewSet(viewsets.ModelViewSet):
    serializer_class = DistrictSerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    filterset_fields = ['state']

    def get_queryset(self):
        return District.objects.select_related('state').all()

    def destroy(self, request, *args, **kwargs):
        district = self.get_object()
        district.is_active = False
        district.save(update_fields=['is_active'])
        return Response({"message": "District deactivated."}, status=200)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        district = self.get_object()
        cities = district.cities.all()
        
        citizens = CustomUser.objects.filter(role__name=Role.CITIZEN, profile__district_ref=district, is_active=True).count()
        officers = CustomUser.objects.filter(role__name=Role.OFFICER, profile__district_ref=district, is_active=True).count()
        workers = CustomUser.objects.filter(role__name=Role.FIELD_WORKER, profile__district_ref=district, is_active=True).count()
        
        complaints = Complaint.objects.filter(ward__city__district=district, status__in=['OPEN', 'IN_PROGRESS']).count()
        incidents = EmergencyIncident.objects.filter(location__city__district=district, status__in=['REPORTED', 'ACKNOWLEDGED', 'RESPONDING']).count()

        return Response({
            "cities": cities.count(),
            "zones": Zone.objects.filter(city__district=district).count(),
            "wards": Ward.objects.filter(city__district=district).count(),
            "citizens": citizens,
            "officers": officers,
            "workers": workers,
            "active_complaints": complaints,
            "open_incidents": incidents
        })


@extend_schema(tags=["geography"])
class CityViewSet(viewsets.ModelViewSet):
    serializer_class = CitySerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    filterset_fields = ['district', 'is_active']

    def get_queryset(self):
        return City.objects.select_related('district__state').all()

    def destroy(self, request, *args, **kwargs):
        city = self.get_object()
        city.is_active = False
        city.save(update_fields=['is_active'])
        return Response({"message": "City deactivated."}, status=200)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        city = self.get_object()
        
        citizens = CustomUser.objects.filter(role__name=Role.CITIZEN, profile__city_ref=city, is_active=True).count()
        officers = CustomUser.objects.filter(role__name=Role.OFFICER, profile__city_ref=city, is_active=True).count()
        workers = CustomUser.objects.filter(role__name=Role.FIELD_WORKER, profile__city_ref=city, is_active=True).count()
        
        complaints = Complaint.objects.filter(ward__city=city, status__in=['OPEN', 'IN_PROGRESS']).count()
        incidents = EmergencyIncident.objects.filter(location__city=city, status__in=['REPORTED', 'ACKNOWLEDGED', 'RESPONDING']).count()
        iot_devices = Location.objects.filter(city=city, source=Location.SOURCE_SENSOR).count()

        return Response({
            "zones": city.zones.count(),
            "wards": city.wards.count(),
            "citizens": citizens,
            "officers": officers,
            "workers": workers,
            "active_complaints": complaints,
            "open_incidents": incidents,
            "iot_devices": iot_devices
        })

    @action(detail=True, methods=['get'], url_path='wards')
    def wards(self, request, pk=None):
        """List all wards for a city."""
        city = self.get_object()
        wards = city.wards.select_related('zone').all()
        return Response(WardSerializer(wards, many=True).data)

    @action(detail=True, methods=['get'], url_path='zones')
    def zones(self, request, pk=None):
        """List all zones for a city."""
        city = self.get_object()
        zones = city.zones.all()
        return Response(ZoneSerializer(zones, many=True).data)

    @action(detail=True, methods=['get'], url_path='facilities')
    def facilities(self, request, pk=None):
        """List all facilities for a city, optionally filtered by type."""
        city = self.get_object()
        ftype = request.query_params.get('type')
        qs = city.facilities.all()
        if ftype:
            qs = qs.filter(facility_type=ftype)
        return Response(FacilitySerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='default')
    def default_city(self, request):
        """Return the default city (Cuttack)."""
        city = City.objects.filter(is_default=True, is_active=True).first()
        if not city:
            city = City.objects.filter(is_active=True).first()
        if not city:
            return Response({'detail': 'No cities configured.'}, status=404)
        return Response(CitySerializer(city).data)


@extend_schema(tags=["geography"])
class ZoneViewSet(viewsets.ModelViewSet):
    serializer_class = ZoneSerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    filterset_fields = ['city']

    def get_queryset(self):
        return Zone.objects.select_related('city').all()

    def destroy(self, request, *args, **kwargs):
        zone = self.get_object()
        zone.is_active = False
        zone.save(update_fields=['is_active'])
        return Response({"message": "Zone deactivated."}, status=200)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        zone = self.get_object()
        
        citizens = CustomUser.objects.filter(role__name=Role.CITIZEN, profile__zone_ref=zone, is_active=True).count()
        workers = CustomUser.objects.filter(role__name=Role.FIELD_WORKER, profile__zone_ref=zone, is_active=True).count()
        
        complaints = Complaint.objects.filter(ward__zone=zone, status__in=['OPEN', 'IN_PROGRESS']).count()
        incidents = EmergencyIncident.objects.filter(location__ward__zone=zone, status__in=['REPORTED', 'ACKNOWLEDGED', 'RESPONDING']).count()
        iot_devices = Location.objects.filter(ward__zone=zone, source=Location.SOURCE_SENSOR).count()

        return Response({
            "wards": zone.wards.count(),
            "citizens": citizens,
            "workers": workers,
            "active_complaints": complaints,
            "open_incidents": incidents,
            "iot_devices": iot_devices
        })


@extend_schema(tags=["geography"])
class WardViewSet(viewsets.ModelViewSet):
    serializer_class = WardSerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    filterset_fields = ['city', 'zone']

    def get_queryset(self):
        return Ward.objects.select_related('city', 'zone').all()

    def destroy(self, request, *args, **kwargs):
        ward = self.get_object()
        ward.is_active = False
        ward.save(update_fields=['is_active'])
        return Response({"message": "Ward deactivated."}, status=200)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        ward = self.get_object()
        
        citizens = CustomUser.objects.filter(role__name=Role.CITIZEN, profile__ward_ref=ward, is_active=True).count()
        officers = CustomUser.objects.filter(role__name=Role.OFFICER, profile__ward_ref=ward, is_active=True).count()
        workers = CustomUser.objects.filter(role__name=Role.FIELD_WORKER, profile__ward_ref=ward, is_active=True).count()
        
        complaints = Complaint.objects.filter(ward=ward, status__in=['OPEN', 'IN_PROGRESS']).count()
        iot_devices = Location.objects.filter(ward=ward, source=Location.SOURCE_SENSOR).count()
        
        # Breakdown by department could be done here, for now basic active incidents
        # Note: EmergencyIncident does not have a department__code, we'll just count overall or filter by incident_type
        traffic_incidents = EmergencyIncident.objects.filter(location__ward=ward, incident_type='ACCIDENT', status__in=['REPORTED', 'ACKNOWLEDGED', 'RESPONDING']).count()
        waste_incidents = 0  # EmergencyIncident doesn't map directly to waste
        water_incidents = EmergencyIncident.objects.filter(location__ward=ward, incident_type='FLOOD', status__in=['REPORTED', 'ACKNOWLEDGED', 'RESPONDING']).count()
        power_incidents = 0

        return Response({
            "citizens": citizens,
            "officers": officers,
            "workers": workers,
            "active_complaints": complaints,
            "iot_devices": iot_devices,
            "traffic_incidents": traffic_incidents,
            "waste_incidents": waste_incidents,
            "water_incidents": water_incidents,
            "electricity_incidents": power_incidents
        })


@extend_schema(tags=["geography"])
class FacilityViewSet(viewsets.ModelViewSet):
    serializer_class = FacilitySerializer
    permission_classes = [IsSuperAdminOrReadOnly]
    filterset_fields = ['facility_type', 'city', 'district', 'status']
    search_fields = ['name', 'address']

    def get_queryset(self):
        return Facility.objects.select_related('city', 'district').all()

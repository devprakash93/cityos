"""
apps/dashboard/views.py
========================
Single endpoint that returns role-scoped dashboard data.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from apps.accounts.models import Role
from .services import (
    get_citizen_dashboard,
    get_officer_dashboard,
    get_field_worker_dashboard,
    get_admin_dashboard,
)


@extend_schema(tags=["dashboard"])
class DashboardView(APIView):
    """
    GET /api/dashboard/
    Returns a payload tailored to the authenticated user's role.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role_name = user.role.name if user.role else None

        if role_name == Role.SUPER_ADMIN:
            data = get_admin_dashboard(request)
        elif role_name == Role.OFFICER:
            data = get_officer_dashboard(request)
        elif role_name == Role.FIELD_WORKER:
            data = get_field_worker_dashboard(request)
        elif role_name == Role.CITIZEN:
            data = get_citizen_dashboard(request)
        else:
            return Response(
                {"success": False, "error": "No role assigned. Contact your administrator."},
                status=403,
            )

        return Response({"success": True, "role": role_name, "data": data})

@extend_schema(tags=["dashboard", "map"])
class OfficerMapDataView(APIView):
    """
    GET /api/officer/map/
    Returns geoJSON-like or structured data for the officer's specific department.
    """
    from core.permissions import IsOfficer
    permission_classes = [IsAuthenticated, IsOfficer]

    def get(self, request):
        user = request.user
        dept = user.department
        
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)

        data = {
            "complaints": [],
            "sensors": [],
            "incidents": [],
        }

        # Complaints
        from apps.complaints.models import Complaint
        c_qs = Complaint.objects.filter(department=dept, status__in=["PENDING", "ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS", "REVIEW"])
        if city:
            c_qs = c_qs.filter(ward__city=city)
        
        for c in c_qs:
            if c.location_lat and c.location_lng:
                data["complaints"].append({
                    "id": c.id,
                    "reference": c.reference_number,
                    "title": c.title,
                    "lat": float(c.location_lat),
                    "lng": float(c.location_lng),
                    "status": c.status,
                    "priority": c.priority
                })

        # Incidents
        from apps.emergency.models import EmergencyIncident
        i_qs = EmergencyIncident.objects.filter(status__in=["REPORTED", "RESPONDING"])
        if city:
            i_qs = i_qs.filter(location__city=city)
            
        for i in i_qs:
            if i.location and i.location.latitude and i.location.longitude:
                 data["incidents"].append({
                    "id": i.id,
                    "type": i.incident_type,
                    "severity": i.severity,
                    "lat": float(i.location.latitude),
                    "lng": float(i.location.longitude),
                    "status": i.status
                })
                
        # Department specific sensors
        if dept and dept.code == "WASTE":
            from apps.waste.models import WasteBin
            bins = WasteBin.objects.filter(is_active=True)
            if city:
                bins = bins.filter(location__city=city)
            for b in bins:
                if b.location and b.location.latitude and b.location.longitude:
                    data["sensors"].append({
                        "id": b.id,
                        "type": "WASTE_BIN",
                        "fill": b.current_fill_percent,
                        "lat": float(b.location.latitude),
                        "lng": float(b.location.longitude)
                    })
        elif dept and dept.code == "TRAFFIC":
            from apps.traffic.models import TrafficZone
            zones = TrafficZone.objects.filter(is_active=True)
            if city:
                zones = zones.filter(zone__city=city)
            for z in zones:
                if z.zone and z.zone.latitude and z.zone.longitude:
                    data["sensors"].append({
                        "id": z.id,
                        "type": "TRAFFIC_ZONE",
                        "density": 0, # Should fetch from reading if needed
                        "lat": float(z.zone.latitude),
                        "lng": float(z.zone.longitude)
                    })
        
        return Response({"success": True, "data": data})

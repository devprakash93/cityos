"""
apps/analytics/views.py
========================
Aggregated statistics endpoints for dashboards and reports.
All queries use Django ORM aggregations — no raw SQL.
"""
from datetime import timedelta
from django.db.models import Count, Avg, Sum, Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from core.permissions import IsOfficerOrAdmin


def parse_date_range(request, default_days=30):
    """Extract start_date/end_date from query params, defaulting to last N days."""
    end = timezone.now()
    start_str = request.query_params.get("start_date")
    end_str = request.query_params.get("end_date")
    if start_str:
        from django.utils.dateparse import parse_datetime
        start = parse_datetime(start_str + "T00:00:00Z") or end - timedelta(days=default_days)
    else:
        start = end - timedelta(days=default_days)
    return start, end


@extend_schema(tags=["analytics"])
class ComplaintSummaryView(APIView):
    """
    GET /api/analytics/complaints/summary/
    Returns complaint counts grouped by department and status.
    Supports ?start_date=&end_date=&department=
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        from apps.complaints.models import Complaint
        start, end = parse_date_range(request)
        qs = Complaint.objects.filter(created_at__range=(start, end))

        user = request.user
        role_name = user.role.name if user.role else ""

        dept_filter = request.query_params.get("department")
        if role_name == "OFFICER" and user.department:
            qs = qs.filter(department=user.department)
        elif dept_filter:
            qs = qs.filter(department__code=dept_filter.upper())
            
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs = qs.filter(ward__city=city)

        # By status
        by_status = qs.values("status").annotate(count=Count("id")).order_by("status")

        # By department
        by_dept = qs.values("department__name").annotate(count=Count("id")).order_by("-count")

        # By priority
        by_priority = qs.values("priority").annotate(count=Count("id")).order_by("priority")

        # Overall
        total = qs.count()
        resolved = qs.filter(status=Complaint.RESOLVED).count()
        resolution_rate = round(resolved / total * 100, 1) if total else 0

        return Response({
            "period": {"start": start, "end": end},
            "total": total,
            "resolution_rate_percent": resolution_rate,
            "by_status": list(by_status),
            "by_department": list(by_dept),
            "by_priority": list(by_priority),
        })


@extend_schema(tags=["analytics"])
class ComplaintTrendView(APIView):
    """
    GET /api/analytics/complaints/trend/
    Daily complaint submission volume for the last N days.
    Supports ?days=30
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        from apps.complaints.models import Complaint
        from django.db.models.functions import TruncDate
        days = int(request.query_params.get("days", 30))
        start = timezone.now() - timedelta(days=days)

        user = request.user
        qs = Complaint.objects.filter(created_at__gte=start)
        
        if user.role and user.role.name == "OFFICER" and user.department:
            qs = qs.filter(department=user.department)
            
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs = qs.filter(ward__city=city)

        trend = (
            qs.annotate(date=TruncDate("created_at"))
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return Response({"days": days, "trend": list(trend)})


@extend_schema(tags=["analytics"])
class AQIHistoryView(APIView):
    """
    GET /api/analytics/aqi/history/?station_id=&days=7
    Hourly AQI readings for a station over a period.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.pollution.models import AQIReading, AQIStation
        station_id = request.query_params.get("station_id")
        days = int(request.query_params.get("days", 7))
        start = timezone.now() - timedelta(days=days)

        qs = AQIReading.objects.filter(recorded_at__gte=start)
        if station_id:
            qs = qs.filter(station_id=station_id)

        # Hourly average AQI
        from django.db.models.functions import TruncHour
        hourly = (
            qs.annotate(hour=TruncHour("recorded_at"))
            .values("hour", "station__name")
            .annotate(avg_aqi=Avg("aqi_value"))
            .order_by("hour")
        )
        return Response({"days": days, "history": list(hourly)})


@extend_schema(tags=["analytics"])
class TrafficHeatmapView(APIView):
    """
    GET /api/analytics/traffic/heatmap/
    Average density by zone and hour of day (last 7 days).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.traffic.models import TrafficReading
        from django.db.models.functions import ExtractHour
        start = timezone.now() - timedelta(days=7)
        heatmap = (
            TrafficReading.objects
            .filter(recorded_at__gte=start)
            .annotate(hour=ExtractHour("recorded_at"))
            .values("zone__name", "hour")
            .annotate(avg_density=Avg("density"))
            .order_by("zone__name", "hour")
        )
        return Response(list(heatmap))


@extend_schema(tags=["analytics"])
class WasteCollectionEfficiencyView(APIView):
    """
    GET /api/analytics/waste/collection-efficiency/
    Bins collected vs overflowed this month.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        from apps.waste.models import WasteBin, WasteBinReading, CollectionLog
        from django.db.models.functions import TruncDate

        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0)

        user = request.user
        qs_bins = WasteBin.objects.filter(is_active=True)
        qs_readings = WasteBinReading.objects.filter(recorded_at__gte=month_start, fill_percent=100)
        qs_collections = CollectionLog.objects.filter(collected_at__gte=month_start)

        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs_bins = qs_bins.filter(location__city=city)
            qs_readings = qs_readings.filter(bin__location__city=city)
            qs_collections = qs_collections.filter(bin__location__city=city)

        total_bins = qs_bins.count()
        overflowed = qs_readings.values("bin").distinct().count()
        collections = qs_collections.count()

        return Response({
            "month_start": month_start,
            "total_bins": total_bins,
            "overflowed_bins": overflowed,
            "total_collections": collections,
            "overflow_rate_percent": round(overflowed / total_bins * 100, 1) if total_bins else 0,
        })


@extend_schema(tags=["analytics"])
class OutageStatsView(APIView):
    """
    GET /api/analytics/electricity/outage-stats/
    Outage hours and affected households this month.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        from apps.electricity.models import PowerOutage
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0)
        user = request.user
        outages = PowerOutage.objects.filter(start_time__gte=month_start)
        
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            outages = outages.filter(zone__zone__city=city)

        total_outages = outages.count()
        active_outages = outages.filter(status="ACTIVE").count()
        total_households_affected = outages.aggregate(
            total=Sum("affected_households")
        )["total"] or 0

        # Total downtime in hours (only for resolved outages)
        total_hours = 0
        for outage in outages.filter(end_time__isnull=False):
            delta = outage.end_time - outage.start_time
            total_hours += delta.total_seconds() / 3600

        return Response({
            "month_start": month_start,
            "total_outages": total_outages,
            "active_outages": active_outages,
            "total_households_affected": total_households_affected,
            "total_downtime_hours": round(total_hours, 2),
        })


@extend_schema(tags=["analytics"])
class TransportRidershipView(APIView):
    """
    GET /api/analytics/transport/ridership/
    Average bus occupancy by route and time of day.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        from apps.transport.models import BusLocation
        from django.db.models.functions import ExtractHour
        start = timezone.now() - timedelta(days=7)
        user = request.user
        qs = BusLocation.objects.filter(recorded_at__gte=start)
        
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs = qs.filter(bus__route__city=city)

        ridership = (
            qs.annotate(hour=ExtractHour("recorded_at"))
            .annotate(hour=ExtractHour("recorded_at"))
            .values("bus__route__route_number", "bus__route__name", "hour")
            .annotate(avg_occupancy=Avg("occupancy_percent"))
            .order_by("bus__route__route_number", "hour")
        )
        return Response(list(ridership))


@extend_schema(tags=["analytics"])
class ReportDownloadView(APIView):
    """
    GET /api/analytics/reports/download/?format=pdf&days=30
    Generates and downloads a system performance report.
    Format must be 'pdf' or 'xlsx'.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    
    @extend_schema(
        parameters=[
            OpenApiParameter("format", description="pdf or xlsx", required=True, type=str),
            OpenApiParameter("days", description="Days to cover in report", required=False, type=int),
        ]
    )
    def get(self, request):
        from .reports import generate_pdf_report, generate_excel_report
        from django.http import HttpResponse

        fmt = request.query_params.get("format", "pdf").lower()
        start, end = parse_date_range(request, default_days=30)
        
        if fmt == "pdf":
            pdf_bytes = generate_pdf_report(start, end, request.user)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="cityos_report_{end.strftime("%Y%m%d")}.pdf"'
            return response
        elif fmt == "xlsx":
            xlsx_bytes = generate_excel_report(start, end, request.user)
            response = HttpResponse(xlsx_bytes, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="cityos_complaints_{end.strftime("%Y%m%d")}.xlsx"'
            return response
        else:
            return Response({"error": "Invalid format. Use 'pdf' or 'xlsx'."}, status=400)


@extend_schema(tags=["analytics", "system"])
class SystemHealthView(APIView):
    """
    GET /api/analytics/system/health/
    Tests connections to Django, MySQL, Storage, and checks Simulator status.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    
    def get(self, request):
        from django.db import connection
        from apps.iot_simulator.models import DemoModeConfig
        import os
        import psutil

        health_data = {
            "django_api": "🟢 Healthy",
            "mysql": "🔴 Disconnected",
            "storage": "🔴 Full",
            "iot_simulator": "🔴 Stopped",
            "cpu_usage": f"{psutil.cpu_percent()}%",
            "memory_usage": f"{psutil.virtual_memory().percent}%"
        }

        # Check DB
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_data["mysql"] = "🟢 Connected"
        except Exception:
            pass

        # Check Storage (Rough check of root disk)
        try:
            disk = psutil.disk_usage('/')
            if disk.percent < 90:
                health_data["storage"] = f"🟢 Available ({100 - disk.percent:.1f}% free)"
            else:
                health_data["storage"] = f"🟡 Near Full ({100 - disk.percent:.1f}% free)"
        except Exception:
            pass

        # Check Simulator
        try:
            config = DemoModeConfig.objects.first()
            if config and config.is_enabled:
                health_data["iot_simulator"] = "🟢 Running"
            else:
                health_data["iot_simulator"] = "🟡 Idle"
        except Exception:
            pass

        return Response(health_data)



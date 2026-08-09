"""
apps/dashboard/services.py
===========================
Aggregation service that builds role-scoped dashboard payloads.
All DB queries happen here. Views just call these and return results.
"""
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta


def get_citizen_dashboard(request):
    """
    Dashboard payload for a citizen:
    - Profile summary
    - Recent 5 complaints
    - City-wide AQI (latest reading)
    - Traffic summary
    - Emergency contacts
    - Unread notification count
    """
    user = request.user
    from apps.geography.permissions import get_city_for_user
    city = get_city_for_user(user)

    from apps.complaints.models import Complaint
    from apps.pollution.models import AQIReading
    from apps.traffic.models import TrafficReading, TrafficZone
    from apps.emergency.models import EmergencyContact
    from apps.notifications.models import Notification

    # Recent complaints
    recent_complaints = Complaint.objects.filter(citizen=user).order_by("-created_at")[:5]
    complaint_stats = Complaint.objects.filter(citizen=user).aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        in_progress=Count("id", filter=Q(status__in=["ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS"])),
        resolved=Count("id", filter=Q(status="RESOLVED")),
    )

    # Latest AQI (city average)
    aqi_qs = AQIReading.objects.all()
    if city:
        aqi_qs = aqi_qs.filter(station__location__city=city)
    latest_aqi = aqi_qs.order_by("-recorded_at").first()

    # Traffic summary — count zones by congestion level
    traffic_qs = TrafficZone.objects.filter(trafficreading__density__gte=70)
    if city:
        traffic_qs = traffic_qs.filter(zone__city=city)
    traffic_summary = {
        "high_congestion_zones": traffic_qs.distinct().count(),
    }

    # Emergency contacts
    emergency_contacts = list(
        EmergencyContact.objects.values("name", "phone", "type").order_by("type")[:10]
    )

    # Notification badge
    unread_notifications = Notification.objects.filter(
        recipient=user, is_read=False
    ).count()

    from apps.complaints.serializers import ComplaintListSerializer
    return {
        "complaints": {
            "stats": complaint_stats,
            "recent": ComplaintListSerializer(recent_complaints, many=True).data,
        },
        "aqi": {
            "value": latest_aqi.aqi_value if latest_aqi else None,
            "category": latest_aqi.category if latest_aqi else "UNKNOWN",
            "station": latest_aqi.station.name if latest_aqi else None,
            "recorded_at": latest_aqi.recorded_at if latest_aqi else None,
        },
        "traffic": traffic_summary,
        "emergency_contacts": emergency_contacts,
        "unread_notifications": unread_notifications,
    }


def get_officer_dashboard(request):
    """
    Dashboard payload for a department officer:
    - Department KPIs
    - Recent complaints
    - Active workers
    - Operations summary
    """
    user = request.user
    from apps.complaints.models import Complaint, ComplaintAssignment
    from apps.accounts.models import CustomUser, Role
    from apps.notifications.models import Notification
    from apps.complaints.serializers import ComplaintListSerializer
    from apps.emergency.models import EmergencyIncident
    from apps.geography.permissions import get_city_for_user

    dept = user.department
    if not dept:
        return {"error": "Officer has no department assigned."}

    city = get_city_for_user(user)
    complaint_qs = Complaint.objects.filter(department=dept)
    if city:
        complaint_qs = complaint_qs.filter(ward__city=city)

    # Core KPIs
    today = timezone.now().date()
    kpi = complaint_qs.aggregate(
        open_complaints=Count("id", filter=Q(status__in=["PENDING", "ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS", "REVIEW"])),
        in_progress=Count("id", filter=Q(status__in=["ACCEPTED", "ON_SITE", "IN_PROGRESS"])),
        resolved_today=Count("id", filter=Q(status="RESOLVED", updated_at__date=today)),
        sla_warnings=Count("id", filter=Q(sla_breached=False, sla_due_at__lte=timezone.now() + timedelta(hours=24), status__in=["PENDING", "ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS", "REVIEW"])),
        sla_breaches=Count("id", filter=Q(sla_breached=True, status__in=["PENDING", "ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS", "REVIEW"])),
    )

    # Active Incidents
    incident_qs = EmergencyIncident.objects.filter(status__in=["REPORTED", "RESPONDING"])
    if city:
        incident_qs = incident_qs.filter(location__city=city)
    kpi["active_incidents"] = incident_qs.count()

    # Assigned Tasks (Active assignments)
    task_qs = ComplaintAssignment.objects.filter(complaint__department=dept, is_active=True)
    if city:
        task_qs = task_qs.filter(complaint__ward__city=city)
    kpi["assigned_tasks"] = task_qs.count()

    # Workers
    field_worker_role = Role.objects.filter(name=Role.FIELD_WORKER).first()
    worker_qs = CustomUser.objects.filter(
        department=dept, role=field_worker_role, is_active=True
    )
    if city:
        worker_qs = worker_qs.filter(
            Q(profile__city_ref=city) | Q(profile__ward_ref__city=city)
        )
    kpi["available_workers"] = worker_qs.count() # Simplified availability

    workers = worker_qs.values("id", "username", "first_name", "last_name", "email")

    recent = complaint_qs.select_related("citizen", "department").order_by("-created_at")[:10]
    unread = Notification.objects.filter(recipient=user, is_read=False).count()

    return {
        "department": {"id": dept.id, "name": dept.name, "code": dept.code},
        "kpi": kpi,
        "recent_complaints": ComplaintListSerializer(recent, many=True).data,
        "field_workers": list(workers),
        "unread_notifications": unread,
    }


def get_field_worker_dashboard(request):
    """
    Dashboard payload for a field worker:
    - New, Accepted, On the way, Working, Completed Today, Urgent
    """
    user = request.user
    from apps.complaints.models import ComplaintAssignment, Complaint
    from apps.complaints.serializers import ComplaintListSerializer
    from apps.notifications.models import Notification

    today = timezone.now().date()
    assigned_ids = ComplaintAssignment.objects.filter(
        assigned_to=user, is_active=True
    ).values_list("complaint_id", flat=True)

    all_tasks = Complaint.objects.filter(id__in=assigned_ids).select_related("department", "ward__city")
    
    stats = all_tasks.aggregate(
        new_tasks=Count("id", filter=Q(status="ASSIGNED")),
        accepted=Count("id", filter=Q(status="ACCEPTED")),
        on_the_way=Count("id", filter=Q(status="ON_SITE")),
        working=Count("id", filter=Q(status="IN_PROGRESS")),
        completed_today=Count("id", filter=Q(status__in=["REVIEW", "RESOLVED", "CLOSED"], updated_at__date=today)),
        urgent=Count("id", filter=Q(priority__in=["HIGH", "CRITICAL"], status__in=["ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS"]))
    )

    recent_tasks = all_tasks.exclude(status__in=["RESOLVED", "CLOSED"]).order_by("sla_due_at", "-created_at")[:10]
    unread = Notification.objects.filter(recipient=user, is_read=False).count()

    return {
        "stats": stats,
        "recent_tasks": ComplaintListSerializer(recent_tasks, many=True).data,
        "unread_notifications": unread,
    }


def get_admin_dashboard(request):
    """
    System-wide dashboard for super admin.
    """
    from apps.geography.permissions import get_city_for_user
    city = get_city_for_user(request.user)
    if not city:
        city_id = request.query_params.get("city_id")
        if city_id:
            from apps.geography.models import City
            city = City.objects.filter(pk=city_id).first()

    from apps.accounts.models import CustomUser, Role
    from apps.complaints.models import Complaint
    from apps.notifications.models import Notification
    from apps.traffic.models import TrafficZone
    from apps.electricity.models import PowerOutage
    from apps.emergency.models import EmergencyIncident

    user_qs = CustomUser.objects.all()
    if city:
        user_qs = user_qs.filter(
            Q(profile__city_ref=city) | 
            Q(profile__ward_ref__city=city)
        )

    user_stats = user_qs.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(is_active=True)),
        citizens=Count("id", filter=Q(role__name="CITIZEN")),
        officers=Count("id", filter=Q(role__name="OFFICER")),
        workers=Count("id", filter=Q(role__name="FIELD_WORKER")),
    )

    complaint_qs = Complaint.objects.all()
    if city:
        complaint_qs = complaint_qs.filter(ward__city=city)
        
    complaint_stats = complaint_qs.aggregate(
        total=Count("id"),
        pending=Count("id", filter=Q(status="PENDING")),
        resolved=Count("id", filter=Q(status="RESOLVED")),
        sla_breaches=Count("id", filter=Q(sla_breached=True)),
    )

    outage_qs = PowerOutage.objects.filter(status="ACTIVE")
    if city:
        outage_qs = outage_qs.filter(zone__zone__city=city)
    active_outages = outage_qs.count()
    
    incident_qs = EmergencyIncident.objects.filter(status__in=["REPORTED", "RESPONDING"])
    if city:
        incident_qs = incident_qs.filter(location__city=city)
    active_incidents = incident_qs.count()

    from apps.geography.models import City, District
    total_cities = City.objects.count()
    total_districts = District.objects.count()

    # IoT Mock Data for now (replace with actual logic if models exist)
    # Assume 95% online, 5% offline for demo purposes
    total_iot = 1250
    if city:
        total_iot = 320
    online_iot = int(total_iot * 0.95)
    offline_iot = total_iot - online_iot

    # Department performance breakdown
    from apps.accounts.models import Department
    dept_perf = []
    for dept in Department.objects.filter(is_active=True):
        dept_complaints = complaint_qs.filter(department=dept)
        dept_stats = dept_complaints.aggregate(
            open=Count("id", filter=Q(status__in=["PENDING", "ASSIGNED", "IN_PROGRESS"])),
            resolved=Count("id", filter=Q(status="RESOLVED")),
            total=Count("id"),
            sla_breaches=Count("id", filter=Q(sla_breached=True)),
        )
        total = dept_stats["total"]
        resolution_rate = round(dept_stats["resolved"] / total * 100) if total else 0
        dept_perf.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "open": dept_stats["open"],
            "resolved": dept_stats["resolved"],
            "sla_breaches": dept_stats["sla_breaches"],
            "resolution_rate": resolution_rate,
        })

    # Recent critical events (last 10 emergency incidents)
    recent_incidents = list(
        incident_qs.order_by("-reported_at").values(
            "id", "incident_type", "severity", "status",
            "description", "location__address", "location__city__name", "reported_at"
        )[:10]
    )

    return {
        "cities": total_cities,
        "districts": total_districts,
        "users": user_stats,
        "complaints": complaint_stats,
        "active_power_outages": active_outages,
        "active_emergency_incidents": active_incidents,
        "iot": {
            "online": online_iot,
            "offline": offline_iot,
        },
        "department_performance": dept_perf,
        "recent_incidents": recent_incidents,
    }

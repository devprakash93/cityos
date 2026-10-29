from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin, IsEmergencyControllerOrAdmin, IsControllerOrOfficerOrAdmin
from .models import EmergencyContact, EmergencyIncident, Responder, IncidentAssignment
from .serializers import (
    EmergencyContactSerializer, EmergencyIncidentSerializer,
    ResponderSerializer, IncidentAssignmentSerializer, EmergencyAlertSerializer
)
from core.mixins import CityScopeMixin


@extend_schema(tags=["emergency"])
class EmergencyContactViewSet(viewsets.ReadOnlyModelViewSet):
    """Public emergency contacts — readable by all authenticated users."""
    queryset = EmergencyContact.objects.filter(is_active=True).order_by("type")
    serializer_class = EmergencyContactSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["type"]


@extend_schema(tags=["emergency"])
class EmergencyIncidentViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = EmergencyIncidentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "incident_type", "severity"]
    search_fields = ["title", "description", "location__address"]
    city_lookup_field = "location__city"

    def get_queryset(self):
        return super().get_queryset().select_related("location__city").order_by("-reported_at")

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy", "assign_responder", "update_status"):
            return [IsAuthenticated(), IsControllerOrOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        incident = serializer.save(reported_by=self.request.user)

        # Automatically attach coordinates if location is not yet set
        lat = self.request.data.get("location_lat") or self.request.data.get("latitude")
        lng = self.request.data.get("location_lng") or self.request.data.get("longitude")
        if (lat is not None and lng is not None) and not incident.location:
            try:
                from apps.geography.models import Location, City
                city = City.objects.first()
                if city:
                    loc = Location.objects.create(
                        latitude=lat,
                        longitude=lng,
                        address=self.request.data.get("address", "Reported Live Location"),
                        city=city,
                        source="API",
                        is_demo=False,
                    )
                    incident.location = loc
                    incident.save(update_fields=["location"])
            except Exception:
                pass

        # Notify controllers & relevant parties for emergency requests
        from apps.notifications.services import NotificationService
        from apps.accounts.models import CustomUser, Role

        # Broadcast to all Emergency Controllers
        controllers = CustomUser.objects.filter(role__name=Role.EMERGENCY_CONTROLLER, is_active=True)
        for ctrl in controllers:
            NotificationService.notify_user(
                user=ctrl,
                title=f"🚨 Emergency Request: {incident.title}",
                message=f"Type: {incident.get_incident_type_display()} · Location: {incident.address}",
                category="EMERGENCY",
                related_object=incident,
            )

        # Notify general emergency broadcast if CRITICAL/HIGH
        if incident.severity in ("CRITICAL", "HIGH"):
            NotificationService.notify_emergency(
                title=f"🚨 {incident.get_severity_display()} Emergency: {incident.title}",
                message=f"Type: {incident.get_incident_type_display()}. Location: {incident.address}",
                related_object=incident,
            )

    @action(detail=True, methods=["post"], url_path="assign-responder",
            permission_classes=[IsAuthenticated, IsControllerOrOfficerOrAdmin])
    def assign_responder(self, request, pk=None):
        incident = self.get_object()
        responder_id = request.data.get("responder_id")
        try:
            responder = Responder.objects.get(pk=responder_id, status="AVAILABLE", is_active=True)
        except Responder.DoesNotExist:
            return Response({"error": "Responder not found or not available."}, status=404)

        assignment = IncidentAssignment.objects.create(
            incident=incident,
            responder=responder,
            assigned_by=request.user,
            notes=request.data.get("notes", ""),
        )
        responder.status = "DISPATCHED"
        responder.save(update_fields=["status"])

        # Advance incident status to RESPONDING
        incident.status = "RESPONDING"
        incident.save(update_fields=["status"])

        # Audit log
        try:
            from apps.accounts.models import ActivityLog
            ActivityLog.objects.create(
                user=request.user,
                action="ASSIGN",
                model_name="EmergencyIncident",
                object_id=incident.id,
                message=f"Assigned responder {responder.unit_code} ({responder.responder_type}) to incident #{incident.id}.",
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            pass

        # Notify citizen
        if incident.reported_by:
            from apps.notifications.services import NotificationService
            NotificationService.notify_user(
                user=incident.reported_by,
                title="🚑 Response Unit Dispatched",
                message=f"Emergency unit {responder.unit_code} has been dispatched to your location.",
                category="EMERGENCY",
                related_object=incident,
            )

        return Response(
            {"success": True, "assignment_id": assignment.pk, "incident_status": incident.status},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="update-status",
            permission_classes=[IsAuthenticated, IsControllerOrOfficerOrAdmin])
    def update_status(self, request, pk=None):
        incident = self.get_object()
        new_status = request.data.get("status")
        valid_statuses = ["REPORTED", "ACKNOWLEDGED", "RESPONDING", "CONTAINED", "RESOLVED", "CANCELLED"]

        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status '{new_status}'. Allowed: {', '.join(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        incident.status = new_status
        if new_status == "RESOLVED":
            incident.resolved_at = timezone.now()
            incident.save(update_fields=["status", "resolved_at"])
        else:
            incident.save(update_fields=["status"])

        # Audit log
        try:
            from apps.accounts.models import ActivityLog
            ActivityLog.objects.create(
                user=request.user,
                action="STATUS_CHANGE",
                model_name="EmergencyIncident",
                object_id=incident.id,
                message=f"Incident #{incident.id} status changed to {new_status} by {request.user.role.name}.",
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            pass

        # Notify citizen
        if incident.reported_by:
            from apps.notifications.services import NotificationService
            NotificationService.notify_user(
                user=incident.reported_by,
                title=f"🚨 Emergency Status Update: {incident.title}",
                message=f"Your emergency request status has been updated to: {incident.get_status_display()}.",
                category="EMERGENCY",
                related_object=incident,
            )

        return Response(EmergencyIncidentSerializer(incident).data)


@extend_schema(tags=["emergency"])
class ResponderViewSet(CityScopeMixin, viewsets.ModelViewSet):
    serializer_class = ResponderSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    filterset_fields = ["status", "responder_type"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).select_related("city").order_by("unit_code")


@extend_schema(tags=["emergency"])
class EmergencyAlertViewSet(CityScopeMixin, viewsets.ModelViewSet):
    """
    Emergency alerts broadcasted to the public (e.g. Cyclone warning).
    Lifecycle: DRAFT -> PUBLISHED -> ACTIVE -> EXPIRED
    """
    from .models import EmergencyAlert
    queryset = EmergencyAlert.objects.all().select_related("city")
    serializer_class = EmergencyAlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "severity"]
    search_fields = ["title", "description"]
    city_lookup_field = "city"

    def get_queryset(self):
        return super().get_queryset().select_related("city").order_by("-created_at")

    def get_permissions(self):
        # Only Officers or Admins can create/update alerts
        if self.action in ("create", "update", "partial_update", "destroy", "update_status"):
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="status")
    def update_status(self, request, pk=None):
        """Transition alert status (DRAFT -> PUBLISHED -> ACTIVE -> EXPIRED)"""
        alert = self.get_object()
        new_status = request.data.get("status")
        
        valid_transitions = {
            "DRAFT": ["PUBLISHED"],
            "PUBLISHED": ["ACTIVE", "EXPIRED"],
            "ACTIVE": ["EXPIRED"],
            "EXPIRED": []
        }
        
        if new_status not in valid_transitions.get(alert.status, []):
            return Response(
                {"error": f"Cannot transition from {alert.status} to {new_status}"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        alert.status = new_status
        alert.save(update_fields=["status", "updated_at"])
        
        if new_status == "PUBLISHED":
            # Fire notification to all users in the city
            from apps.notifications.services import NotificationService
            NotificationService.notify_emergency(
                title=f"🚨 {alert.get_severity_display()}: {alert.title}",
                message=alert.description,
                related_object=alert
            )
            
        return Response(EmergencyAlertSerializer(alert).data)


import uuid
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from django.core import signing
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle


class EmergencyControllerThrottle(UserRateThrottle):
    rate = "15/minute"


@extend_schema(tags=["emergency"])
class EmergencyControllerAuthView(APIView):
    """
    POST /api/emergency/controller/auth/
    Authenticates predefined Emergency Controller ID & password for demo purposes.
    Credentials are validated securely on the backend against server environment configuration.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [EmergencyControllerThrottle]

    def post(self, request):
        controller_id = request.data.get("controller_id", "").strip()
        password = request.data.get("password", "")

        if not controller_id or not password:
            return Response(
                {"success": False, "error": "Both Controller ID and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_id = getattr(settings, "EMERGENCY_CONTROLLER_ID", "EMERGENCY-CTRL-ODISHA")
        expected_pw = getattr(settings, "EMERGENCY_CONTROLLER_PASSWORD", "OdishaSecure2026!#")

        id_valid = constant_time_compare(controller_id, expected_id)
        pw_valid = constant_time_compare(password, expected_pw)

        if not (id_valid and pw_valid):
            return Response(
                {"success": False, "error": "Invalid Emergency Controller ID or password. Access denied."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Generate a signed demo token valid for 30 minutes
        token = signing.dumps(
            {
                "controller_id": expected_id,
                "user_id": request.user.id,
                "timestamp": timezone.now().isoformat(),
            },
            salt="emergency-controller-auth",
        )

        return Response(
            {
                "success": True,
                "message": "Emergency Controller authenticated successfully.",
                "controller": {
                    "controller_id": expected_id,
                    "name": "Odisha Emergency Response Support System (ERSS - 112)",
                    "unit": "Bhubaneswar Central Dispatch Control Desk",
                    "status": "ONLINE",
                    "authenticated_at": timezone.now().isoformat(),
                },
                "token": token,
            },
            status=status.HTTP_200_OK,
        )


from django.core.cache import cache


@extend_schema(tags=["emergency"])
class EmergencyDemoCallView(APIView):
    """
    POST /api/emergency/controller/demo-call/
    Simulates placing a call to the authenticated Emergency Controller.
    Receives verified citizen coordinates and returns a simulated connected session.
    Also registers the active call so the Emergency Controller Dashboard displays an incoming call alert.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token") or request.headers.get("X-Controller-Token")
        controller_id = getattr(settings, "EMERGENCY_CONTROLLER_ID", "EMERGENCY-CTRL-ODISHA")
        if token:
            try:
                data = signing.loads(token, salt="emergency-controller-auth", max_age=1800)
                controller_id = data.get("controller_id", controller_id)
            except (signing.BadSignature, signing.SignatureExpired):
                return Response(
                    {"success": False, "error": "Emergency Controller session expired or invalid. Please re-authenticate."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        else:
            return Response(
                {"success": False, "error": "Authentication required. Please authenticate the Emergency Controller first."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        lat = request.data.get("latitude")
        lng = request.data.get("longitude")
        accuracy = request.data.get("accuracy")
        address = request.data.get("address", "Odisha, India")

        call_id = f"DEMO-{uuid.uuid4().hex[:8].upper()}"

        call_record = {
            "call_id": call_id,
            "citizen_name": request.user.full_name,
            "citizen_email": request.user.email,
            "citizen_phone": getattr(getattr(request.user, "profile", None), "phone", "") or "N/A",
            "latitude": lat,
            "longitude": lng,
            "accuracy": accuracy,
            "address": address,
            "status": "RINGING",
            "created_at": timezone.now().isoformat(),
        }

        # Store in cache so Controller Dashboard sees incoming call in real time
        calls = cache.get("active_emergency_demo_calls", [])
        calls = [c for c in calls if c.get("status") != "ENDED"]
        calls.insert(0, call_record)
        cache.set("active_emergency_demo_calls", calls[:10], timeout=600)

        return Response(
            {
                "success": True,
                "demo": True,
                "call_id": call_id,
                "status": "CONNECTED",
                "controller": {
                    "id": controller_id,
                    "desk": "Odisha State Emergency Response Centre (OSERC)",
                    "officer": "Dispatcher on Duty (ERSS-112)",
                },
                "coordinates": {
                    "latitude": lat,
                    "longitude": lng,
                    "accuracy": accuracy,
                    "address": address,
                },
                "notice": "DEMO CALL ONLY: Simulated training and testing call. No actual phone call placed and real emergency services are NOT contacted.",
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["emergency"])
class EmergencyControllerDashboardView(APIView):
    """
    GET /api/emergency/controller/dashboard/
    Overview endpoint for the dedicated Emergency Controller Dashboard.
    Provides live statistics, recent emergency incidents, responder units, and demo calls.
    Protected strictly by IsEmergencyControllerOrAdmin.
    """
    permission_classes = [IsAuthenticated, IsEmergencyControllerOrAdmin]

    def get(self, request):
        active_calls = cache.get("active_emergency_demo_calls", [])
        active_calls = [c for c in active_calls if c.get("status") != "ENDED"]

        new_count = EmergencyIncident.objects.filter(status="REPORTED").count()
        ack_count = EmergencyIncident.objects.filter(status="ACKNOWLEDGED").count()
        disp_count = EmergencyIncident.objects.filter(status="RESPONDING").count()
        res_count = EmergencyIncident.objects.filter(status="RESOLVED").count()
        total_count = EmergencyIncident.objects.count()

        recent_incidents = EmergencyIncident.objects.select_related(
            "location__city", "reported_by__profile"
        ).prefetch_related("assignments__responder").order_by("-reported_at")[:30]

        responders = Responder.objects.filter(is_active=True).order_by("unit_code")

        return Response({
            "success": True,
            "metrics": {
                "new": new_count,
                "acknowledged": ack_count,
                "dispatched": disp_count,
                "resolved": res_count,
                "total": total_count,
                "active_demo_calls": len(active_calls),
            },
            "incidents": EmergencyIncidentSerializer(recent_incidents, many=True).data,
            "responders": ResponderSerializer(responders, many=True).data,
            "active_demo_calls": active_calls,
        })


@extend_schema(tags=["emergency"])
class EmergencyControllerCallActionView(APIView):
    """
    POST /api/emergency/controller/calls/<call_id>/action/
    Allows an Emergency Controller to accept or end an incoming demo call.
    """
    permission_classes = [IsAuthenticated, IsEmergencyControllerOrAdmin]

    def post(self, request, call_id):
        action = request.data.get("action")  # 'accept' or 'end'
        if action not in ("accept", "end"):
            return Response(
                {"error": "Action must be 'accept' or 'end'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        calls = cache.get("active_emergency_demo_calls", [])
        found_call = None
        for c in calls:
            if c.get("call_id") == call_id:
                if action == "accept":
                    c["status"] = "CONNECTED"
                elif action == "end":
                    c["status"] = "ENDED"
                found_call = c
                break

        cache.set("active_emergency_demo_calls", calls, timeout=600)

        # Audit log
        try:
            from apps.accounts.models import ActivityLog
            ActivityLog.objects.create(
                user=request.user,
                action="UPDATE",
                model_name="DemoEmergencyCall",
                object_id=0,
                message=f"Controller {request.user.full_name} executed '{action}' on demo call {call_id}.",
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "demo": True,
            "call_id": call_id,
            "status": found_call.get("status") if found_call else "ENDED",
            "message": f"Demo call {action}ed successfully.",
        })


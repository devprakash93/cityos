"""
apps/complaints/views.py
=========================
Complaint ViewSet and action views.
Business logic lives in services.py. Views are thin routers.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from drf_spectacular.utils import extend_schema

from core.permissions import (
    IsCitizen, IsOfficer, IsFieldWorker, IsSuperAdmin,
    IsFieldWorkerOrOfficer, IsOwnerOrAdmin, IsSameDepartmentOfficer,
)
from core.mixins import RoleFilterMixin
from apps.accounts.models import Role
from .models import Complaint, ComplaintHistory, ComplaintMedia
from .serializers import (
    ComplaintCreateSerializer,
    ComplaintDetailSerializer,
    ComplaintListSerializer,
    StatusUpdateSerializer,
    AssignComplaintSerializer,
    MediaUploadSerializer,
    ComplaintHistorySerializer,
)
from .services import ComplaintService


@extend_schema(tags=["complaints"])
class ComplaintViewSet(RoleFilterMixin, viewsets.ModelViewSet):
    """
    Core complaint CRUD.
    - POST: citizen submits
    - GET list: role-filtered
    - GET detail: full detail with history + media
    - PATCH /status/: status transition
    - POST /assign/: officer assigns to worker
    - POST /media/: upload evidence/completion photo
    - GET /history/: status timeline
    """
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "category", "department"]
    search_fields = ["title", "reference_number", "description", "address"]
    ordering_fields = ["created_at", "priority", "status"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsCitizen()]
        if self.action in ("assign", "update_status"):
            from core.permissions import IsOfficerOrAdmin
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "create":
            return ComplaintCreateSerializer
        if self.action in ("retrieve", "history", "assign", "update_status"):
            return ComplaintDetailSerializer
        return ComplaintListSerializer

    # --- RoleFilterMixin ---
    def _apply_city_filter(self, qs):
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(self.request.user)
        if city:
            return qs.filter(ward__city=city)
        # For super admin, allow ?city_id= filtering
        city_id = self.request.query_params.get("city_id")
        if city_id:
            return qs.filter(ward__city_id=city_id)
        return qs

    def get_queryset_for_citizen(self):
        qs = Complaint.objects.filter(citizen=self.request.user).select_related(
            "citizen", "department", "ward__city"
        )
        return self._apply_city_filter(qs)

    def get_queryset_for_officer(self):
        qs = Complaint.objects.filter(
            department=self.request.user.department
        ).select_related("citizen", "department", "ward__city")
        return self._apply_city_filter(qs)

    def get_queryset_for_field_worker(self):
        from .models import ComplaintAssignment
        assigned_ids = ComplaintAssignment.objects.filter(
            assigned_to=self.request.user, is_active=True
        ).values_list("complaint_id", flat=True)
        return Complaint.objects.filter(id__in=assigned_ids).select_related("citizen", "department", "ward__city")

    def get_queryset_for_admin(self):
        qs = Complaint.objects.all().select_related("citizen", "department", "ward__city")
        return self._apply_city_filter(qs)

    def perform_create(self, serializer):
        ComplaintService.create_complaint(self.request.user, serializer, self.request)

    def get_object(self):
        obj = super().get_object()
        # Citizen can only access their own complaints (object-level)
        user = self.request.user
        role_name = user.role.name if user.role else ""
        if role_name == Role.CITIZEN and obj.citizen != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only access your own complaints.")
        if role_name == Role.OFFICER and obj.department != user.department:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This complaint belongs to a different department.")
            
        # Geographic authorization
        from apps.geography.permissions import get_city_for_user
        user_city = get_city_for_user(user)
        if user_city and obj.ward and obj.ward.city != user_city:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("This complaint belongs to a different city.")
            
        return obj

    @extend_schema(request=StatusUpdateSerializer, tags=["complaints"])
    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        """PATCH /api/complaints/{id}/status/"""
        complaint = self.get_object()
        serializer = StatusUpdateSerializer(
            data=request.data,
            context={"complaint": complaint, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        updated = ComplaintService.update_status(
            complaint=complaint,
            new_status=serializer.validated_data["status"],
            changed_by=request.user,
            remarks=serializer.validated_data.get("remarks", ""),
        )
        return Response(
            {
                "success": True,
                "message": f"Status updated to {updated.status}.",
                "data": ComplaintDetailSerializer(updated, context={"request": request}).data,
            }
        )

    @extend_schema(request=AssignComplaintSerializer, tags=["complaints"])
    @action(detail=True, methods=["post"], url_path="assign",
            permission_classes=[IsAuthenticated, IsOfficer])
    def assign(self, request, pk=None):
        """POST /api/complaints/{id}/assign/"""
        complaint = self.get_object()
        serializer = AssignComplaintSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = ComplaintService.assign_complaint(
            complaint=complaint,
            assigned_to_id=serializer.validated_data["assigned_to_id"],
            assigned_by=request.user,
            deadline=serializer.validated_data.get("deadline"),
            remarks=serializer.validated_data.get("remarks", ""),
        )
        return Response(
            {
                "success": True,
                "message": "Complaint assigned successfully.",
                "assignment_id": assignment.pk,
            }
        )

    @extend_schema(tags=["complaints"])
    @action(
        detail=True,
        methods=["post"],
        url_path="media",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_media(self, request, pk=None):
        """POST /api/complaints/{id}/media/ — upload evidence or completion photo."""
        complaint = self.get_object()
        serializer = MediaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = ComplaintService.upload_media(
            complaint=complaint,
            uploaded_by=request.user,
            file=serializer.validated_data["file"],
            media_type=serializer.validated_data.get("media_type", "EVIDENCE"),
            caption=serializer.validated_data.get("caption", ""),
        )
        from .serializers import ComplaintMediaSerializer
        return Response(
            {
                "success": True,
                "message": "File uploaded.",
                "data": ComplaintMediaSerializer(media, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(tags=["complaints"])
    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """GET /api/complaints/{id}/history/ — full status timeline."""
        complaint = self.get_object()
        entries = complaint.history.select_related("changed_by").order_by("timestamp")
        serializer = ComplaintHistorySerializer(entries, many=True)
        return Response({"success": True, "data": serializer.data})

    @extend_schema(tags=["complaints"])
    @action(detail=True, methods=["post"], url_path="resolve",
            permission_classes=[IsAuthenticated, IsOfficer])
    def resolve(self, request, pk=None):
        """POST /api/complaints/{id}/resolve/ — officer resolves after reviewing worker completion."""
        complaint = self.get_object()
        if complaint.status not in [Complaint.REVIEW, Complaint.IN_PROGRESS, Complaint.ASSIGNED, Complaint.ACCEPTED, Complaint.ON_SITE]:
            return Response(
                {"success": False, "message": f"Cannot resolve complaint in status: {complaint.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        remarks = request.data.get("remarks", "Resolved by officer.")
        updated = ComplaintService.update_status(
            complaint=complaint,
            new_status=Complaint.RESOLVED,
            changed_by=request.user,
            remarks=remarks,
        )
        return Response({
            "success": True,
            "message": "Complaint resolved.",
            "data": ComplaintDetailSerializer(updated, context={"request": request}).data,
        })

    @extend_schema(tags=["complaints"])
    @action(detail=True, methods=["post"], url_path="reject",
            permission_classes=[IsAuthenticated, IsOfficer])
    def reject(self, request, pk=None):
        """POST /api/complaints/{id}/reject/ — officer rejects a complaint."""
        complaint = self.get_object()
        if complaint.status in [Complaint.RESOLVED, Complaint.CLOSED, Complaint.REJECTED]:
            return Response(
                {"success": False, "message": f"Complaint is already {complaint.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        remarks = request.data.get("remarks", "Rejected by officer.")
        updated = ComplaintService.update_status(
            complaint=complaint,
            new_status=Complaint.REJECTED,
            changed_by=request.user,
            remarks=remarks,
        )
        return Response({
            "success": True,
            "message": "Complaint rejected.",
            "data": ComplaintDetailSerializer(updated, context={"request": request}).data,
        })

    @extend_schema(tags=["complaints"])
    @action(detail=True, methods=["patch"], url_path="priority",
            permission_classes=[IsAuthenticated, IsOfficer])
    def change_priority(self, request, pk=None):
        """PATCH /api/complaints/{id}/priority/ — officer changes priority."""
        complaint = self.get_object()
        new_priority = request.data.get("priority")
        valid = [Complaint.LOW, Complaint.MEDIUM, Complaint.HIGH, Complaint.CRITICAL]
        if new_priority not in valid:
            return Response(
                {"success": False, "message": f"Invalid priority. Choose from: {valid}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        old_priority = complaint.priority
        complaint.priority = new_priority
        complaint.save(update_fields=["priority", "updated_at"])
        ComplaintHistory.objects.create(
            complaint=complaint,
            changed_by=request.user,
            event_type="PRIORITY_CHANGE",
            old_value=old_priority,
            new_value=new_priority,
            remarks=f"Priority changed by officer.",
        )
        return Response({
            "success": True,
            "message": f"Priority updated to {new_priority}.",
            "data": ComplaintDetailSerializer(complaint, context={"request": request}).data,
        })


@extend_schema(tags=["tasks"])
class TaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/officer/tasks/
    Read-only view for officers to see ComplaintAssignments (Tasks) within their department.
    """
    from .serializers import ComplaintAssignmentSerializer
    serializer_class = ComplaintAssignmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "assigned_to", "assigned_by"]
    search_fields = ["complaint__reference_number", "complaint__title"]
    ordering_fields = ["assigned_at", "deadline"]
    ordering = ["-assigned_at"]

    def get_permissions(self):
        return [IsAuthenticated(), IsOfficer()]

    def get_queryset(self):
        user = self.request.user
        from .models import ComplaintAssignment
        qs = ComplaintAssignment.objects.filter(
            complaint__department=user.department
        ).select_related("assigned_to", "assigned_by", "complaint")
        
        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs = qs.filter(complaint__ward__city=city)
        return qs


@extend_schema(tags=["worker_tasks"])
class WorkerTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Dedicated viewset for Field Workers to view and manage their assigned tasks.
    Enforces IsFieldWorker.
    """
    from .serializers import ComplaintDetailSerializer
    serializer_class = ComplaintDetailSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority"]
    search_fields = ["reference_number", "title"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_permissions(self):
        return [IsAuthenticated(), IsFieldWorker()]

    def get_queryset(self):
        user = self.request.user
        from .models import ComplaintAssignment
        assigned_ids = ComplaintAssignment.objects.filter(
            assigned_to=user, is_active=True
        ).values_list("complaint_id", flat=True)
        return Complaint.objects.filter(id__in=assigned_ids).select_related("citizen", "department", "ward__city")

    def _transition_task(self, request, expected_current, new_status, action_name):
        complaint = self.get_object()
        if complaint.status not in expected_current:
            return Response(
                {"success": False, "message": f"Cannot {action_name}. Task is currently {complaint.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        remarks = request.data.get("remarks", "")
        updated = ComplaintService.update_status(
            complaint=complaint,
            new_status=new_status,
            changed_by=request.user,
            remarks=remarks
        )
        return Response(
            {"success": True, "message": f"Task updated to {new_status}.", "data": self.get_serializer(updated).data}
        )

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        return self._transition_task(request, [Complaint.ASSIGNED], Complaint.ACCEPTED, "accept")

    @action(detail=True, methods=["post"], url_path="start-travel")
    def start_travel(self, request, pk=None):
        return self._transition_task(request, [Complaint.ACCEPTED], Complaint.ON_SITE, "start travel")

    @action(detail=True, methods=["post"], url_path="start-work")
    def start_work(self, request, pk=None):
        return self._transition_task(request, [Complaint.ON_SITE], Complaint.IN_PROGRESS, "start work")

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        return self._transition_task(request, [Complaint.IN_PROGRESS], Complaint.REVIEW, "complete")


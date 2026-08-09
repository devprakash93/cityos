"""
apps/accounts/views.py
======================
User management endpoints accessible to super admins.
Own-profile editing is handled in apps/authentication/views.py
"""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from drf_spectacular.utils import extend_schema, extend_schema_view

from core.permissions import IsSuperAdmin
from django.db import models
from .models import CustomUser, Department, Role
from .serializers import (
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    DepartmentSerializer,
    RoleSerializer,
    ActivityLogSerializer,
)


from apps.authentication.serializers import StaffCreateSerializer

@extend_schema(tags=["accounts"])
class UserListView(generics.ListCreateAPIView):
    """List all users or create a new user (super admin only)."""
    serializer_class = AdminUserListSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    queryset = CustomUser.objects.select_related("role", "department").order_by("-date_joined")
    filterset_fields = ["role__name", "department__code", "is_active"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering_fields = ["date_joined", "email"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return StaffCreateSerializer
        return AdminUserListSerializer

    def perform_create(self, serializer):
        from apps.authentication.services import AuthService
        # Use AuthService to handle profile creation and password hashing
        AuthService.create_staff_user(serializer, self.request.user)


@extend_schema(tags=["accounts"])
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update (role/dept/status), or deactivate a user — super admin only."""
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    queryset = CustomUser.objects.select_related("role", "department", "profile")

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return AdminUserUpdateSerializer
        return AdminUserListSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate instead of hard delete."""
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"message": "User deactivated."}, status=status.HTTP_200_OK)


@extend_schema(tags=["accounts"])
class RoleListView(generics.ListAPIView):
    """List all roles — authenticated users only (for UI dropdowns)."""
    serializer_class = RoleSerializer
    queryset = Role.objects.all()
    permission_classes = [permissions.IsAuthenticated]

@extend_schema(tags=["accounts"])
class ActivityLogListView(generics.ListAPIView):
    """
    List all activity logs (Audit Trail). Super Admin only.
    Supports filtering by user and action.
    """
    from .models import ActivityLog
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    queryset = ActivityLog.objects.select_related("user").order_by("-timestamp")
    filterset_fields = ["user__email", "action", "model_name"]
    search_fields = ["message", "user__email"]

@extend_schema(tags=["accounts"])
class OfficerWorkerListView(generics.ListAPIView):
    """
    List all FIELD_WORKERs belonging to the authenticated officer's department and city.
    Accessible only to IsOfficer.
    """
    serializer_class = AdminUserListSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.BasePermission] # Will use IsOfficer
    
    def get_permissions(self):
        from core.permissions import IsOfficer
        return [permissions.IsAuthenticated(), IsOfficer()]

    def get_queryset(self):
        user = self.request.user
        qs = CustomUser.objects.filter(
            role__name=Role.FIELD_WORKER,
            department=user.department
        ).select_related("role", "department", "profile")

        from apps.geography.permissions import get_city_for_user
        city = get_city_for_user(user)
        if city:
            qs = qs.filter(
                models.Q(profile__city_ref=city) | 
                models.Q(profile__ward_ref__city=city)
            )
        
        return qs.order_by("first_name", "last_name")


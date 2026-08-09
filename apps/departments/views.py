"""
apps/departments/views.py
==========================
Department management endpoints.
"""
from rest_framework import generics, permissions
from drf_spectacular.utils import extend_schema

from core.permissions import IsSuperAdmin
from apps.accounts.models import Department
from apps.accounts.serializers import DepartmentSerializer


@extend_schema(tags=["departments"])
class DepartmentListView(generics.ListCreateAPIView):
    """
    GET: List all departments.
    POST: Create a new department (Super Admin only).
    """
    serializer_class = DepartmentSerializer
    queryset = Department.objects.all().order_by("name")
    
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]


@extend_schema(tags=["departments"])
class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Retrieve a department.
    PUT/PATCH: Update a department (Super Admin only).
    DELETE: Soft-delete/deactivate a department (Super Admin only).
    """
    serializer_class = DepartmentSerializer
    queryset = Department.objects.all()
    
    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsSuperAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save(update_fields=["is_active"])

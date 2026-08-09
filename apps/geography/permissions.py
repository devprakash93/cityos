"""
apps/geography/permissions.py
==============================
Geographic authorization layer for Odisha CityOS.

KEY PRINCIPLE:
- frontend CityContext = UI scope (what the user is viewing)
- backend permissions = authoritative data scope (what the user is ALLOWED to see)

The frontend city_id is ONLY trusted for SUPER_ADMIN.
For Citizens, Officers, and Field Workers, city is always derived from their profile.
"""
from rest_framework.permissions import BasePermission
from apps.accounts.models import Role


def get_user_role_name(user):
    return user.role.name if user and user.role else None


class IsCitizenRole(BasePermission):
    """Request user is a Citizen."""
    def has_permission(self, request, view):
        return get_user_role_name(request.user) == Role.CITIZEN


class IsOfficerRole(BasePermission):
    """Request user is an Officer."""
    def has_permission(self, request, view):
        return get_user_role_name(request.user) == Role.OFFICER


class IsFieldWorkerRole(BasePermission):
    """Request user is a Field Worker."""
    def has_permission(self, request, view):
        return get_user_role_name(request.user) == Role.FIELD_WORKER


class IsSuperAdminRole(BasePermission):
    """Request user is a Super Admin."""
    def has_permission(self, request, view):
        return get_user_role_name(request.user) == Role.SUPER_ADMIN


class IsSuperAdminOrReadOnly(BasePermission):
    """
    Allow read access to anyone (or authenticated), 
    but require Super Admin for write operations (POST, PUT, PATCH, DELETE).
    """
    def has_permission(self, request, view):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return get_user_role_name(request.user) == Role.SUPER_ADMIN


class IsOfficerOrAdmin(BasePermission):
    """Officer or Super Admin."""
    def has_permission(self, request, view):
        return get_user_role_name(request.user) in (Role.OFFICER, Role.SUPER_ADMIN)


class SameCityAccess(BasePermission):
    """
    Object-level: user can only access objects belonging to their city.
    Super Admin bypasses this check.
    """
    def has_object_permission(self, request, view, obj):
        role = get_user_role_name(request.user)
        if role == Role.SUPER_ADMIN:
            return True
        user_city = getattr(request.user, 'city', None)
        obj_city = getattr(obj, 'city', None)
        if user_city and obj_city:
            return user_city == obj_city
        return True  # If no city on obj, allow (e.g. state-level resources)


class SameDepartmentAccess(BasePermission):
    """
    Object-level: Officer can only access objects belonging to their department.
    Super Admin bypasses this check.
    """
    def has_object_permission(self, request, view, obj):
        role = get_user_role_name(request.user)
        if role == Role.SUPER_ADMIN:
            return True
        user_dept = getattr(request.user, 'department', None)
        obj_dept = getattr(obj, 'department', None)
        if user_dept and obj_dept:
            return user_dept == obj_dept
        return True


def get_city_for_user(user):
    """
    Derive the authoritative city for any user.

    - Citizens: profile.city
    - Officers: user.city (set on registration/assignment)
    - Field Workers: derived from assigned tasks (returns None — handled per-view)
    - Super Admin: None — can access all cities

    This is the single source of truth for city-scoped data.
    Frontend city_id is IGNORED for non-admin users.
    """
    from apps.accounts.models import Role
    if not user or not user.is_authenticated:
        return None
    role = get_user_role_name(user)
    if role == Role.SUPER_ADMIN:
        return None  # Admin can see all — views handle ?city_id=
    # For Citizens and Officers: city is on the user's profile
    profile = getattr(user, 'profile', None)
    if profile:
        return getattr(profile, 'city', None)
    return None

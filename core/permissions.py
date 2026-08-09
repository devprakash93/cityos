"""
core/permissions.py
===================
Reusable DRF permission classes for CityOS.
All permission decisions are made here — never scattered in views.
"""
from rest_framework.permissions import BasePermission

# Role name constants — must match Role.name values in the database
ROLE_CITIZEN = "CITIZEN"
ROLE_OFFICER = "OFFICER"
ROLE_FIELD_WORKER = "FIELD_WORKER"
ROLE_SUPER_ADMIN = "SUPER_ADMIN"


def _has_role(request, role_name: str) -> bool:
    """Return True if the authenticated user has the given role name."""
    user = request.user
    return (
        user
        and user.is_authenticated
        and hasattr(user, "role")
        and user.role is not None
        and user.role.name == role_name
    )


class IsCitizen(BasePermission):
    """Allow access only to users with the CITIZEN role."""
    message = "Access restricted to citizens."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_CITIZEN)


class IsOfficer(BasePermission):
    """Allow access only to users with the OFFICER role."""
    message = "Access restricted to department officers."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_OFFICER)


class IsFieldWorker(BasePermission):
    """Allow access only to users with the FIELD_WORKER role."""
    message = "Access restricted to field workers."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_FIELD_WORKER)


class IsSuperAdmin(BasePermission):
    """Allow access only to users with the SUPER_ADMIN role."""
    message = "Access restricted to super administrators."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_SUPER_ADMIN)


class IsOfficerOrAdmin(BasePermission):
    """Allow officers and super admins."""
    message = "Access restricted to officers and administrators."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_OFFICER) or _has_role(request, ROLE_SUPER_ADMIN)


class IsFieldWorkerOrOfficer(BasePermission):
    """Allow field workers and officers."""
    message = "Access restricted to field workers and officers."

    def has_permission(self, request, view):
        return (
            _has_role(request, ROLE_FIELD_WORKER)
            or _has_role(request, ROLE_OFFICER)
            or _has_role(request, ROLE_SUPER_ADMIN)
        )


class IsCitizenOrAdmin(BasePermission):
    """Allow citizens and super admins."""
    message = "Access restricted to citizens and administrators."

    def has_permission(self, request, view):
        return _has_role(request, ROLE_CITIZEN) or _has_role(request, ROLE_SUPER_ADMIN)


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: allow the object owner or a super admin.
    The model must have a `user` or `citizen` attribute pointing to a User.
    """
    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        if _has_role(request, ROLE_SUPER_ADMIN):
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "citizen", None)
        return owner == request.user


class IsSameDepartmentOfficer(BasePermission):
    """
    Object-level: allow only the officer of the same department.
    The object must have a `department` FK.
    """
    message = "You can only access records within your department."

    def has_object_permission(self, request, view, obj):
        if _has_role(request, ROLE_SUPER_ADMIN):
            return True
        if not _has_role(request, ROLE_OFFICER):
            return False
        return getattr(obj, "department", None) == request.user.department

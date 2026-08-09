"""
core/mixins.py
==============
Reusable view/model mixins for CityOS.
"""
from django.utils import timezone


class ActivityLogMixin:
    """
    Mixin for ViewSets that need to log every mutating action into an
    ActivityLog. Concrete apps should override `get_log_message`.
    """

    def get_log_message(self, action: str, instance) -> str:
        return f"{action} {instance.__class__.__name__} #{instance.pk}"

    def perform_create(self, serializer):
        instance = serializer.save()
        self._write_log("CREATE", instance)
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self._write_log("UPDATE", instance)
        return instance

    def perform_destroy(self, instance):
        self._write_log("DELETE", instance)
        instance.delete()

    def _write_log(self, action: str, instance):
        """Import lazily to avoid circular imports."""
        try:
            from apps.accounts.models import ActivityLog
            ActivityLog.objects.create(
                user=self.request.user,
                action=action,
                model_name=instance.__class__.__name__,
                object_id=instance.pk,
                message=self.get_log_message(action, instance),
            )
        except Exception:
            # Logging must never break the main request
            pass


class TimestampedModelMixin:
    """
    Mixin for models that need created_at / updated_at.
    Use this when you cannot inherit from a common base model.
    """
    pass  # Timestamps are defined directly on each model for clarity


class RoleFilterMixin:
    """
    Queryset filtering mixin — filters list results based on the
    requesting user's role. Subclasses must implement
    `get_queryset_for_citizen`, `get_queryset_for_officer`, etc.
    """

    def get_queryset(self):
        role_name = self.request.user.role.name if getattr(self.request.user, "role", None) else None
        
        if role_name == "SUPER_ADMIN":
            return self.get_queryset_for_admin()
        elif role_name == "OFFICER":
            return self.get_queryset_for_officer()
        elif role_name == "FIELD_WORKER":
            return self.get_queryset_for_field_worker()
        else:
            return self.get_queryset_for_citizen()

    # Subclasses override these as needed:
    def get_queryset_for_admin(self):
        return self.queryset.all()

    def get_queryset_for_officer(self):
        return self.queryset.none()

    def get_queryset_for_field_worker(self):
        return self.queryset.none()

    def get_queryset_for_citizen(self):
        return self.queryset.none()


class CityScopeMixin:
    """
    Queryset filtering mixin for IoT domain objects (Traffic, Waste, Water, etc.).
    - Super Admins can see all, or filter by ?city_id=
    - Officers/Citizens are strictly scoped to their assigned/profile city.
    Assumes the model is related to City via `zone__city` or `ward__city`.
    Subclasses must set `city_lookup_field` (e.g. 'zone__city' or 'ward__city').
    """
    city_lookup_field = "zone__city"

    def get_queryset(self):
        qs = super().get_queryset()
        from apps.geography.permissions import get_city_for_user
        from apps.accounts.models import Role
        
        user = self.request.user
        role_name = getattr(user.role, 'name', None) if getattr(user, 'role', None) else None
        
        if role_name == Role.SUPER_ADMIN:
            city_id = self.request.query_params.get("city_id")
            if city_id:
                return qs.filter(**{f"{self.city_lookup_field}_id": city_id})
            return qs
            
        city = get_city_for_user(user)
        if city:
            return qs.filter(**{self.city_lookup_field: city})
        
        # If not Super Admin and has no city, return nothing
        return qs.none()

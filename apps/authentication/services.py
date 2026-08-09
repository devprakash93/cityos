"""
apps/authentication/services.py
================================
Business logic for authentication flows.
Views call these services — no business logic in views.
"""
from django.contrib.auth import login, logout
from django.utils import timezone
from apps.accounts.models import CustomUser, ActivityLog, UserProfile
from core.utils import get_client_ip


class AuthService:
    """Handles login, logout, registration side-effects."""

    @staticmethod
    def login_user(request, user: CustomUser) -> None:
        """
        Establish a Django session for the user.
        Records the login IP and writes an activity log entry.
        """
        login(request, user)

        # Record IP
        ip = get_client_ip(request)
        CustomUser.objects.filter(pk=user.pk).update(last_login_ip=ip)

        # Activity log
        ActivityLog.objects.create(
            user=user,
            action="LOGIN",
            model_name="CustomUser",
            object_id=user.pk,
            message=f"User {user.email} logged in.",
            ip_address=ip,
        )

    @staticmethod
    def logout_user(request) -> None:
        """Destroy session and log the logout event."""
        user = request.user
        if user.is_authenticated:
            ActivityLog.objects.create(
                user=user,
                action="LOGOUT",
                model_name="CustomUser",
                object_id=user.pk,
                message=f"User {user.email} logged out.",
                ip_address=get_client_ip(request),
            )
        logout(request)

    @staticmethod
    def register_citizen(serializer) -> CustomUser:
        """
        Complete citizen registration:
        1. Save validated user
        2. Create blank profile
        3. Log the action
        """
        user = serializer.save()
        UserProfile.objects.get_or_create(user=user)
        ActivityLog.objects.create(
            user=user,
            action="CREATE",
            model_name="CustomUser",
            object_id=user.pk,
            message=f"Citizen {user.email} registered.",
        )
        return user

    @staticmethod
    def change_password(user: CustomUser, new_password: str) -> None:
        """Update the user's password and log the change."""
        user.set_password(new_password)
        user.save(update_fields=["password"])
        ActivityLog.objects.create(
            user=user,
            action="UPDATE",
            model_name="CustomUser",
            object_id=user.pk,
            message=f"User {user.email} changed their password.",
        )

    @staticmethod
    def create_staff_user(serializer, created_by: CustomUser) -> CustomUser:
        """Admin creates an officer/field-worker account."""
        user = serializer.save()
        
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if hasattr(user, '_profile_data'):
            for key, value in user._profile_data.items():
                setattr(profile, key, value)
            profile.save()

        ActivityLog.objects.create(
            user=created_by,
            action="CREATE",
            model_name="CustomUser",
            object_id=user.pk,
            message=f"Admin {created_by.email} created staff user {user.email} with role {user.role}.",
        )
        return user

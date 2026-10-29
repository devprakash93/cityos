"""
apps/authentication/views.py
=============================
Auth endpoints: register, login, logout, me, change-password, staff-create.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie

from core.permissions import IsSuperAdmin
from apps.accounts.serializers import UserDetailSerializer, UserUpdateSerializer
from apps.accounts.models import UserProfile
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    StaffCreateSerializer,
)
from .services import AuthService


def get_jwt_tokens(user):
    """Generate JWT access + refresh tokens for the user."""
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


@extend_schema(tags=["auth"])
class RegisterView(APIView):
    """
    POST /api/auth/register/
    Public endpoint. Citizen self-registration.
    Returns user detail + JWT tokens on success.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = RegisterSerializer  # for drf-spectacular

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = AuthService.register_citizen(serializer)
        AuthService.login_user(request, user)  # auto-login after registration
        tokens = get_jwt_tokens(user)
        return Response(
            {
                "success": True,
                "message": "Registration successful.",
                "user": UserDetailSerializer(user, context={"request": request}).data,
                "tokens": tokens,
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginView(APIView):
    """
    POST /api/auth/login/
    Establishes a Django session AND returns JWT tokens.
    Frontend can use either session cookies or Bearer tokens.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        AuthService.login_user(request, user)
        tokens = get_jwt_tokens(user)

        # Determine redirect hint for frontend
        role_name = user.role.name if user.role else "CITIZEN"
        dashboard_url = {
            "CITIZEN": "/citizen/dashboard",
            "OFFICER": "/officer/dashboard",
            "FIELD_WORKER": "/worker/dashboard",
            "SUPER_ADMIN": "/admin/dashboard",
            "EMERGENCY_CONTROLLER": "/controller/dashboard",
        }.get(role_name, "/dashboard")

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "redirect": dashboard_url,
                "user": UserDetailSerializer(user, context={"request": request}).data,
                "tokens": tokens,
            }
        )


from django.conf import settings
from django.db import models as db_models
from django.utils.crypto import constant_time_compare
from rest_framework.throttling import UserRateThrottle
from apps.accounts.models import CustomUser, Role, Department, ActivityLog


class ControllerLoginThrottle(UserRateThrottle):
    rate = "15/minute"


@extend_schema(tags=["auth"])
@method_decorator(ensure_csrf_cookie, name="dispatch")
class ControllerLoginView(APIView):
    """
    POST /api/auth/controller-login/
    Dedicated authentication endpoint for Emergency Controllers.
    Supports predefined demo Controller ID & password from server configuration.
    Ensures the user account and role exist in the database and returns JWT + session.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ControllerLoginThrottle]

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

        user = None
        if constant_time_compare(controller_id, expected_id) and constant_time_compare(password, expected_pw):
            role, _ = Role.objects.get_or_create(
                name=Role.EMERGENCY_CONTROLLER,
                defaults={"description": "Emergency Controller — oversees emergency incidents and dispatches."}
            )
            dept, _ = Department.objects.get_or_create(
                code=Department.EMERGENCY,
                defaults={"name": "Emergency Services", "is_active": True}
            )
            user, _ = CustomUser.objects.get_or_create(
                username=expected_id,
                defaults={
                    "email": "emergency.controller@cityos.gov",
                    "first_name": "Emergency",
                    "last_name": "Controller",
                    "role": role,
                    "department": dept,
                    "is_active": True,
                    "is_staff": False,
                    "is_superuser": False,
                }
            )
            if user.role != role:
                user.role = role
                user.save(update_fields=["role"])
            if not user.check_password(expected_pw):
                user.set_password(expected_pw)
                user.save(update_fields=["password"])
        else:
            try:
                candidate = CustomUser.objects.get(
                    db_models.Q(username=controller_id) | db_models.Q(email=controller_id),
                    role__name=Role.EMERGENCY_CONTROLLER,
                    is_active=True
                )
                if candidate.check_password(password):
                    user = candidate
            except CustomUser.DoesNotExist:
                user = None

        if not user:
            return Response(
                {"success": False, "error": "Invalid Emergency Controller credentials. Access denied."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        AuthService.login_user(request, user)
        tokens = get_jwt_tokens(user)

        try:
            ActivityLog.objects.create(
                user=user,
                action="LOGIN",
                model_name="CustomUser",
                object_id=user.id,
                message="Emergency Controller logged in.",
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        except Exception:
            pass

        return Response(
            {
                "success": True,
                "message": "Emergency Controller authentication successful.",
                "redirect": "/controller/dashboard",
                "user": UserDetailSerializer(user, context={"request": request}).data,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["auth"])
class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Destroys the Django session. JWT tokens must be discarded client-side.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        AuthService.logout_user(request)
        return Response({"success": True, "message": "Logged out successfully."})


@extend_schema(tags=["auth"])
@method_decorator(ensure_csrf_cookie, name="dispatch")
class MeView(APIView):
    """
    GET  /api/auth/me/ — Current user details.
    PATCH /api/auth/me/ — Update own name/profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserDetailSerializer(request.user, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def patch(self, request):
        # Ensure profile exists before updating
        UserProfile.objects.get_or_create(user=request.user)
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {
                "success": True,
                "message": "Profile updated.",
                "data": UserDetailSerializer(request.user, context={"request": request}).data,
            }
        )


@extend_schema(tags=["auth"])
class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Authenticated user changing their own password.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        AuthService.change_password(request.user, serializer.validated_data["new_password"])
        # Re-issue tokens after password change
        tokens = get_jwt_tokens(request.user)
        return Response(
            {"success": True, "message": "Password changed successfully.", "tokens": tokens}
        )


@extend_schema(tags=["auth"])
class StaffCreateView(APIView):
    """
    POST /api/auth/staff/create/
    Super admin creates officer or field-worker accounts.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = StaffCreateSerializer

    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = AuthService.create_staff_user(serializer, request.user)
        return Response(
            {
                "success": True,
                "message": f"Staff account created for {user.email}.",
                "data": UserDetailSerializer(user, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

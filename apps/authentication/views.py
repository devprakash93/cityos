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

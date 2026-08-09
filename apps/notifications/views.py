"""
apps/notifications/views.py
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema

from .models import Notification, Announcement
from .serializers import NotificationSerializer, AnnouncementSerializer


@extend_schema(tags=["notifications"])
class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ â€” paginated list of own notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        # Optional filter by read status
        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            qs = qs.filter(is_read=is_read.lower() == "true")
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category.upper())
        return qs


@extend_schema(tags=["notifications"])
class NotificationMarkReadView(APIView):
    """PATCH /api/notifications/{id}/read/ â€” mark a single notification as read."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response({"success": True, "message": "Marked as read."})


@extend_schema(tags=["notifications"])
class MarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/ â€” bulk mark all as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).update(is_read=True)
        return Response({"success": True, "marked_read": count})


@extend_schema(tags=["notifications"])
class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ â€” badge count."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"unread_count": count})
@extend_schema(tags=["notifications"])
class AnnouncementListView(generics.ListCreateAPIView):
    """
    GET /api/notifications/announcements/ — public feed of active announcements.
    POST /api/notifications/announcements/ — create announcement (Super Admin/Officer only).
    """
    serializer_class = AnnouncementSerializer
    
    def get_permissions(self):
        if self.request.method == "POST":
            from core.permissions import IsOfficerOrAdmin
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return [] # public GET

    def get_queryset(self):
        from django.db.models import Q
        from django.utils import timezone
        qs = Announcement.objects.all()
        qs = qs.filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

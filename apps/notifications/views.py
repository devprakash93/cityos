"""
apps/notifications/views.py
==============================
DRF views for Notifications and Production-Grade Civic Announcements.
Supports public citizen endpoints and role-protected administrative endpoints.
"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q, Count
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from core.permissions import IsOfficerOrAdmin, IsSuperAdmin, _has_role, ROLE_SUPER_ADMIN
from core.utils import get_client_ip
from apps.accounts.models import ActivityLog
from .models import Notification, Announcement, AnnouncementInteraction
from .serializers import (
    NotificationSerializer,
    AnnouncementSerializer,
    AnnouncementPublicSerializer,
    AnnouncementAdminSerializer,
    AnnouncementInteractionSerializer,
)
from .services import NotificationService


# ===========================================================================
# NOTIFICATION VIEWS
# ===========================================================================

@extend_schema(tags=["notifications"])
class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/
    Returns notifications for the current authenticated user only.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        category = self.request.query_params.get("category")
        unread_only = self.request.query_params.get("unread")
        qs = Notification.objects.filter(recipient=self.request.user)
        if category:
            qs = qs.filter(category=category.upper())
        if unread_only and unread_only.lower() in ["1", "true", "yes"]:
            qs = qs.filter(is_read=False)
        return qs.order_by("-created_at")


@extend_schema(tags=["notifications"])
class NotificationMarkReadView(APIView):
    """PATCH /api/notifications/<id>/read/ — mark single notification read."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"success": True})


@extend_schema(tags=["notifications"])
class NotificationMarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/ — mark all read."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"success": True, "marked_read": updated, "updated_count": updated})


@extend_schema(tags=["notifications"])
class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})


# ===========================================================================
# PUBLIC ANNOUNCEMENTS ENDPOINTS
# ===========================================================================

@extend_schema(tags=["announcements"])
class FeaturedAnnouncementsView(generics.ListAPIView):
    """
    GET /api/announcements/featured/
    Returns active, published, and featured announcements for citizen homepage carousel.
    Scattered according to citizen's geographic scope.
    """
    serializer_class = AnnouncementPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user if self.request.user.is_authenticated else None
        qs = Announcement.objects.for_citizen(user=user)
        return qs.filter(is_featured=True).order_by("-is_pinned", "display_order", "-publish_at")[:10]


@extend_schema(tags=["announcements"])
class PublicAnnouncementListView(generics.ListAPIView):
    """
    GET /api/announcements/
    Public listing of active announcements with category filter, search, and geographic targeting.
    """
    serializer_class = AnnouncementPublicSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user if self.request.user.is_authenticated else None
        qs = Announcement.objects.for_citizen(user=user)

        category = self.request.query_params.get("category")
        if category and category.upper() != "ALL":
            qs = qs.filter(category=category.upper())

        priority = self.request.query_params.get("priority")
        if priority:
            qs = qs.filter(priority=priority.upper())

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search) |
                Q(department_name__icontains=search)
            )

        return qs.order_by("-is_pinned", "display_order", "-publish_at")


@extend_schema(tags=["announcements"])
class PublicAnnouncementDetailView(generics.GenericAPIView):
    """
    GET /api/announcements/<slug_or_id>/
    Returns full details for a public announcement by slug or numeric ID.
    Automatically increments detail view interaction telemetry.
    """
    serializer_class = AnnouncementPublicSerializer
    permission_classes = [AllowAny]

    def get(self, request, slug_or_id):
        user = request.user if request.user.is_authenticated else None
        
        # Look up by slug or numeric PK
        if slug_or_id.isdigit():
            announcement = Announcement.objects.filter(pk=int(slug_or_id)).first()
        else:
            announcement = Announcement.objects.filter(slug=slug_or_id).first()

        if not announcement:
            return Response({"error": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        # Allow admins to view drafts/scheduled/expired; regular public only sees active published
        is_admin_user = user and _has_role(request, ROLE_SUPER_ADMIN)
        if not is_admin_user and not announcement.is_currently_active if hasattr(announcement, 'is_currently_active') else False:
            if announcement.status != "PUBLISHED" or (announcement.publish_at and announcement.publish_at > timezone.now()):
                return Response({"error": "Announcement not found or not currently active."}, status=status.HTTP_404_NOT_FOUND)

        # Record detail view telemetry
        client_ip = get_client_ip(request)
        session_id = request.headers.get("X-Session-ID", request.query_params.get("session_id", ""))[:64]
        AnnouncementInteraction.objects.create(
            announcement=announcement,
            event_type="VIEW",
            user=user,
            ip_address=client_ip,
            session_id=session_id,
        )

        serializer = self.get_serializer(announcement)
        return Response(serializer.data)


@extend_schema(tags=["announcements"])
class RecordImpressionView(APIView):
    """
    POST /api/announcements/<id>/impressions/
    Records impression telemetry with deduplication safeguard.
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

        session_id = request.data.get("session_id") or request.headers.get("X-Session-ID", "")
        session_id = str(session_id)[:64]
        client_ip = get_client_ip(request)

        # Safeguard: Do not spam impressions from same IP/session within 2 minutes
        cutoff = timezone.now() - timezone.timedelta(minutes=2)
        recent_exists = AnnouncementInteraction.objects.filter(
            announcement=ann,
            event_type="IMPRESSION",
            timestamp__gte=cutoff,
            ip_address=client_ip,
        ).exists()

        if not recent_exists:
            AnnouncementInteraction.objects.create(
                announcement=ann,
                event_type="IMPRESSION",
                user=request.user if request.user.is_authenticated else None,
                ip_address=client_ip,
                session_id=session_id,
            )

        return Response({"success": True})


@extend_schema(tags=["announcements"])
class RecordClickView(APIView):
    """
    POST /api/announcements/<id>/clicks/
    Records CTA click telemetry.
    """
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found"}, status=status.HTTP_404_NOT_FOUND)

        destination = request.data.get("destination", ann.cta_destination)[:500]
        event_type = request.data.get("event_type", "CLICK")
        if event_type not in ["CLICK", "SECONDARY_CLICK"]:
            event_type = "CLICK"

        session_id = request.data.get("session_id") or request.headers.get("X-Session-ID", "")
        session_id = str(session_id)[:64]
        client_ip = get_client_ip(request)

        AnnouncementInteraction.objects.create(
            announcement=ann,
            event_type=event_type,
            destination=destination,
            user=request.user if request.user.is_authenticated else None,
            ip_address=client_ip,
            session_id=session_id,
        )

        return Response({"success": True})


# ===========================================================================
# ADMIN ANNOUNCEMENTS ENDPOINTS
# ===========================================================================

@extend_schema(tags=["admin-announcements"])
class AdminAnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET /api/admin/announcements/ — list all announcements with status, search, and metrics.
    POST /api/admin/announcements/ — create a new announcement (draft, scheduled, or published).
    """
    serializer_class = AnnouncementAdminSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get_queryset(self):
        qs = Announcement.objects.all()

        status_param = self.request.query_params.get("status")
        if status_param and status_param.upper() != "ALL":
            qs = qs.filter(status=status_param.upper())

        category = self.request.query_params.get("category")
        if category and category.upper() != "ALL":
            qs = qs.filter(category=category.upper())

        is_featured = self.request.query_params.get("is_featured")
        if is_featured in ["1", "true", "True"]:
            qs = qs.filter(is_featured=True)

        department_id = self.request.query_params.get("department")
        if department_id:
            qs = qs.filter(department_id=department_id)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search) |
                Q(department_name__icontains=search)
            )

        return qs.order_by("-is_pinned", "display_order", "-created_at")

    def perform_create(self, serializer):
        user = self.request.user
        priority = serializer.validated_data.get("priority", "NORMAL")
        category = serializer.validated_data.get("category", "ANNOUNCEMENT")

        # Emergency alerts require Super Admin permissions
        if (priority == "EMERGENCY" or category == "EMERGENCY_ALERT") and not _has_role(self.request, ROLE_SUPER_ADMIN):
            raise PermissionDenied("Only super administrators can publish Emergency Alerts.")

        ann = serializer.save(created_by=user, updated_by=user)

        # Audit log entry
        ActivityLog.objects.create(
            user=user,
            action="CREATE",
            model_name="Announcement",
            object_id=ann.pk,
            message=f"Created announcement '{ann.title}' ({ann.status})",
            ip_address=get_client_ip(self.request),
        )

        # If published immediately, notify eligible audience
        if ann.status == "PUBLISHED":
            NotificationService.notify_announcement_publication(ann)


@extend_schema(tags=["admin-announcements"])
class AdminAnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/admin/announcements/<id>/ — retrieve announcement with metrics.
    PATCH /api/admin/announcements/<id>/ — edit announcement.
    DELETE /api/admin/announcements/<id>/ — archive or delete announcement.
    """
    serializer_class = AnnouncementAdminSerializer
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]
    queryset = Announcement.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        ann = serializer.save(updated_by=user)

        # Audit log entry
        ActivityLog.objects.create(
            user=user,
            action="UPDATE",
            model_name="Announcement",
            object_id=ann.pk,
            message=f"Updated announcement '{ann.title}'",
            ip_address=get_client_ip(self.request),
        )

    def perform_destroy(self, instance):
        user = self.request.user
        ann_id = instance.pk
        ann_title = instance.title
        instance.delete()

        # Audit log entry
        ActivityLog.objects.create(
            user=user,
            action="DELETE",
            model_name="Announcement",
            object_id=ann_id,
            message=f"Deleted announcement '{ann_title}'",
            ip_address=get_client_ip(self.request),
        )


@extend_schema(tags=["admin-announcements"])
class AdminAnnouncementStatusView(APIView):
    """
    PATCH /api/admin/announcements/<id>/status/
    Transitions announcement status: DRAFT, SCHEDULED, PUBLISHED, EXPIRED, ARCHIVED.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def patch(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return Response({"error": "Announcement not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status", "").upper()
        if new_status not in ["DRAFT", "SCHEDULED", "PUBLISHED", "EXPIRED", "ARCHIVED"]:
            return Response({"error": f"Invalid status '{new_status}'."}, status=status.HTTP_400_BAD_REQUEST)

        old_status = ann.status
        ann.status = new_status
        ann.updated_by = request.user

        if new_status == "PUBLISHED" and not ann.published_at:
            ann.published_at = timezone.now()

        ann.save(update_fields=["status", "published_at", "updated_by", "updated_at"])

        # Audit Log
        ActivityLog.objects.create(
            user=request.user,
            action="STATUS_CHANGE",
            model_name="Announcement",
            object_id=ann.pk,
            message=f"Changed status from {old_status} to {new_status} for '{ann.title}'",
            ip_address=get_client_ip(request),
        )

        # If transitioned to PUBLISHED, send notification to eligible audience
        if new_status == "PUBLISHED" and old_status != "PUBLISHED":
            NotificationService.notify_announcement_publication(ann)

        serializer = AnnouncementAdminSerializer(ann)
        return Response(serializer.data)


@extend_schema(tags=["admin-announcements"])
class AdminAnnouncementAnalyticsView(APIView):
    """
    GET /api/admin/announcements/analytics/
    Aggregates performance analytics across all campaigns and announcements.
    """
    permission_classes = [IsAuthenticated, IsOfficerOrAdmin]

    def get(self, request):
        total_announcements = Announcement.objects.count()
        published_count = Announcement.objects.published().count()
        draft_count = Announcement.objects.filter(status="DRAFT").count()
        scheduled_count = Announcement.objects.filter(status="SCHEDULED").count()
        featured_count = Announcement.objects.filter(is_featured=True, status="PUBLISHED").count()

        total_impressions = AnnouncementInteraction.objects.filter(event_type="IMPRESSION").count()
        total_views = AnnouncementInteraction.objects.filter(event_type="VIEW").count()
        total_clicks = AnnouncementInteraction.objects.filter(event_type__in=["CLICK", "SECONDARY_CLICK"]).count()
        avg_ctr = round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0.0

        # Top campaigns by engagement
        top_announcements = (
            Announcement.objects.annotate(
                clicks_count=Count("interactions", filter=Q(interactions__event_type__in=["CLICK", "SECONDARY_CLICK"])),
                impressions_count=Count("interactions", filter=Q(interactions__event_type="IMPRESSION")),
            )
            .order_by("-clicks_count", "-impressions_count")[:5]
        )

        top_campaigns_data = []
        for a in top_announcements:
            ctr = round((a.clicks_count / a.impressions_count * 100), 1) if a.impressions_count > 0 else 0.0
            top_campaigns_data.append({
                "id": a.id,
                "title": a.title,
                "category": a.category,
                "category_display": a.get_category_display(),
                "status": a.status,
                "clicks": a.clicks_count,
                "impressions": a.impressions_count,
                "ctr": ctr,
            })

        # Category breakdown
        category_breakdown = (
            Announcement.objects.values("category")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({
            "overview": {
                "total_announcements": total_announcements,
                "active_published": published_count,
                "drafts": draft_count,
                "scheduled": scheduled_count,
                "featured": featured_count,
                "total_impressions": total_impressions,
                "total_views": total_views,
                "total_clicks": total_clicks,
                "overall_ctr": avg_ctr,
            },
            "top_campaigns": top_campaigns_data,
            "category_breakdown": list(category_breakdown),
        })


# Legacy view for backward compatibility
class AnnouncementListView(AdminAnnouncementListCreateView):
    """Legacy endpoint supporting GET /api/notifications/announcements/"""
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsOfficerOrAdmin()]
        return []

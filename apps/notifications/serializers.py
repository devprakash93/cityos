"""
apps/notifications/serializers.py
==================================
Serializers for notifications, announcements (public and admin), and interaction telemetry.
"""
import re
from urllib.parse import urlparse
from rest_framework import serializers
from django.utils import timezone
from .models import Notification, Announcement, AnnouncementInteraction
from apps.accounts.models import Department, Role
from apps.geography.models import District, City, Zone, Ward
from core.permissions import _has_role, ROLE_SUPER_ADMIN


class NotificationSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "title", "message", "category", "category_display",
            "is_read", "created_at", "object_id",
        ]
        read_only_fields = ["id", "title", "message", "category", "created_at", "object_id"]


class AnnouncementPublicSerializer(serializers.ModelSerializer):
    """
    Public-facing announcement serializer.
    Only returns verified public data. Excludes internal drafts, audit trails, and raw administrative flags.
    """
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    scope_display = serializers.CharField(source="get_audience_scope_display", read_only=True)
    effective_banner = serializers.CharField(read_only=True)
    effective_thumbnail = serializers.CharField(read_only=True)
    department_name = serializers.CharField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "message",
            "category",
            "category_display",
            "priority",
            "priority_display",
            "department",
            "department_name",
            "banner_image",
            "banner_image_url",
            "effective_banner",
            "thumbnail_image",
            "thumbnail_image_url",
            "effective_thumbnail",
            "audience_scope",
            "scope_display",
            "target_geography_name",
            "cta_label",
            "cta_type",
            "cta_destination",
            "secondary_cta_label",
            "secondary_cta_type",
            "secondary_cta_destination",
            "is_featured",
            "is_pinned",
            "display_order",
            "publish_at",
            "expires_at",
            "published_at",
            "created_at",
        ]


class AnnouncementAdminSerializer(serializers.ModelSerializer):
    """
    Authorized administrator serializer with full CRUD, scheduling, targeting, and analytics metrics.
    """
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    scope_display = serializers.CharField(source="get_audience_scope_display", read_only=True)
    effective_banner = serializers.CharField(read_only=True)
    effective_thumbnail = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    updated_by_name = serializers.CharField(source="updated_by.get_full_name", read_only=True)
    metrics = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "content",
            "message",
            "category",
            "category_display",
            "department",
            "department_name",
            "banner_image",
            "banner_image_url",
            "effective_banner",
            "thumbnail_image",
            "thumbnail_image_url",
            "effective_thumbnail",
            "audience_scope",
            "scope_display",
            "target_district",
            "target_city",
            "target_zone",
            "target_ward",
            "target_geography_name",
            "cta_label",
            "cta_type",
            "cta_destination",
            "secondary_cta_label",
            "secondary_cta_type",
            "secondary_cta_destination",
            "is_featured",
            "is_pinned",
            "display_order",
            "priority",
            "priority_display",
            "status",
            "status_display",
            "publish_at",
            "expires_at",
            "published_at",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
            "metrics",
        ]
        read_only_fields = ["id", "slug", "created_by", "updated_by", "created_at", "updated_at"]

    def get_metrics(self, obj):
        impressions = obj.interactions.filter(event_type="IMPRESSION").count()
        views = obj.interactions.filter(event_type="VIEW").count()
        clicks = obj.interactions.filter(event_type__in=["CLICK", "SECONDARY_CLICK"]).count()
        ctr = round((clicks / impressions * 100), 1) if impressions > 0 else 0.0
        return {
            "impressions": impressions,
            "views": views,
            "clicks": clicks,
            "ctr": ctr,
        }

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be blank.")
        return value.strip()

    def validate_cta_destination(self, value):
        if not value:
            return value
        v = value.strip()
        # Prevent javascript: and data: URIs
        if v.lower().startswith(("javascript:", "data:", "vbscript:")):
            raise serializers.ValidationError("Invalid CTA destination scheme.")
        return v

    def validate_secondary_cta_destination(self, value):
        if not value:
            return value
        v = value.strip()
        if v.lower().startswith(("javascript:", "data:", "vbscript:")):
            raise serializers.ValidationError("Invalid secondary CTA destination scheme.")
        return v

    def validate(self, attrs):
        cta_type = attrs.get("cta_type", getattr(self.instance, "cta_type", "INTERNAL"))
        cta_dest = attrs.get("cta_destination", getattr(self.instance, "cta_destination", ""))
        if cta_type == "EXTERNAL" and cta_dest:
            parsed = urlparse(cta_dest)
            if parsed.scheme not in ["http", "https"]:
                raise serializers.ValidationError({"cta_destination": "External CTA must start with http:// or https://"})

        sec_cta_type = attrs.get("secondary_cta_type", getattr(self.instance, "secondary_cta_type", "INTERNAL"))
        sec_cta_dest = attrs.get("secondary_cta_destination", getattr(self.instance, "secondary_cta_destination", ""))
        if sec_cta_type == "EXTERNAL" and sec_cta_dest:
            parsed = urlparse(sec_cta_dest)
            if parsed.scheme not in ["http", "https"]:
                raise serializers.ValidationError({"secondary_cta_destination": "External secondary CTA must start with http:// or https://"})

        # Date validations
        publish_at = attrs.get("publish_at", getattr(self.instance, "publish_at", None))
        expires_at = attrs.get("expires_at", getattr(self.instance, "expires_at", None))
        if publish_at and expires_at and expires_at <= publish_at:
            raise serializers.ValidationError({"expires_at": "Expiry date/time must be strictly after the publication date/time."})

        # Emergency alerts require Super Admin permissions
        priority = attrs.get("priority", getattr(self.instance, "priority", "NORMAL"))
        category = attrs.get("category", getattr(self.instance, "category", "ANNOUNCEMENT"))
        request = self.context.get("request")
        if (priority == "EMERGENCY" or category == "EMERGENCY_ALERT") and request:
            if not _has_role(request, ROLE_SUPER_ADMIN):
                raise serializers.ValidationError({"priority": "Only super administrators can publish Emergency Alerts."})

        # Sanitize HTML / scripts from content and summary
        for field in ["summary", "content"]:
            if field in attrs and attrs[field]:
                # Simple defense against inline scripts and iframe injections
                attrs[field] = re.sub(r'<\s*script[^>]*>.*?<\s*/\s*script\s*>', '', attrs[field], flags=re.IGNORECASE | re.DOTALL)
                attrs[field] = re.sub(r'on\w+\s*=', '', attrs[field], flags=re.IGNORECASE)

        return attrs


class AnnouncementSerializer(AnnouncementAdminSerializer):
    """Legacy alias for backward compatibility with existing tests and scripts."""
    pass


class AnnouncementInteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnouncementInteraction
        fields = ["id", "announcement", "event_type", "session_id", "destination", "timestamp"]
        read_only_fields = ["id", "timestamp"]

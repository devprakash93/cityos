"""
apps/notifications/serializers.py
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "title", "message", "category", "category_display",
            "is_read", "created_at", "object_id",
        ]
        read_only_fields = ["id", "title", "message", "category", "created_at", "object_id"]

class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    scope_display = serializers.CharField(source="get_scope_level_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        from .models import Announcement
        model = Announcement
        fields = "__all__"
        read_only_fields = ["created_by", "created_at"]

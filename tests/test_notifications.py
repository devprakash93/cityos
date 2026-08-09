"""
tests/test_notifications.py
Unit tests for the notification service and API endpoints.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService


@pytest.fixture
def notification(db, citizen_user):
    return Notification.objects.create(
        recipient=citizen_user,
        title="Test Notification",
        message="This is a test.",
        category="SYSTEM",
    )


@pytest.mark.django_db
class TestNotificationService:
    def test_notify_user_creates_record(self, citizen_user):
        NotificationService.notify_user(
            user=citizen_user,
            title="Test",
            message="Hello",
            category="SYSTEM",
        )
        assert Notification.objects.filter(recipient=citizen_user, title="Test").exists()

    def test_citizen_does_not_receive_department_notification(self, citizen_user):
        result = NotificationService.notify_user(
            user=citizen_user,
            title="Internal Notice",
            message="For officers only",
            category="DEPARTMENT",
        )
        assert result is None
        assert not Notification.objects.filter(recipient=citizen_user, category="DEPARTMENT").exists()

    def test_notify_department_officers(self, officer_user, department_traffic):
        count = NotificationService.notify_department_officers(
            department=department_traffic,
            title="Dept Alert",
            message="Alert for dept.",
        )
        assert count >= 1
        assert Notification.objects.filter(recipient=officer_user, title="Dept Alert").exists()

    def test_notify_all_admins(self, admin_user):
        count = NotificationService.notify_all_admins(
            title="Admin Alert",
            message="System-wide alert.",
        )
        assert Notification.objects.filter(recipient=admin_user, title="Admin Alert").exists()


@pytest.mark.django_db
class TestNotificationAPI:
    def test_citizen_can_list_own_notifications(self, citizen_client, notification):
        url = reverse("notification-list")
        response = citizen_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_mark_single_notification_read(self, citizen_client, notification):
        url = reverse("notification-read", kwargs={"pk": notification.pk})
        response = citizen_client.patch(url)
        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.is_read is True

    def test_mark_all_read(self, citizen_client, citizen_user):
        Notification.objects.create(recipient=citizen_user, title="A", message="msg", category="SYSTEM")
        Notification.objects.create(recipient=citizen_user, title="B", message="msg", category="SYSTEM")
        url = reverse("notification-mark-all-read")
        response = citizen_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["marked_read"] >= 2

    def test_unread_count(self, citizen_client, notification):
        url = reverse("notification-unread-count")
        response = citizen_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "unread_count" in response.data

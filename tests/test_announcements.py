"""
tests/test_announcements.py
===========================
End-to-end tests for the Official Announcements & Campaigns feature.
Tests public citizen feeds, admin lifecycle, role permissions, analytics, and audit logging.
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from apps.notifications.models import Announcement, AnnouncementInteraction
from apps.accounts.models import ActivityLog, Department


@pytest.mark.django_db
class TestPublicAnnouncements:
    """Tests for public citizen announcement endpoints."""

    def test_featured_returns_only_active_published_featured(self, api_client, admin_user):
        now = timezone.now()
        # Featured and active
        f1 = Announcement.objects.create(
            title="Mo Seva Kendra Mobile App",
            summary="Access all Odisha citizen welfare services on your smartphone.",
            category="WELFARE_SCHEME",
            status="PUBLISHED",
            is_featured=True,
            publish_at=now - timedelta(hours=1),
            created_by=admin_user,
        )
        # Featured but DRAFT -> must NOT appear
        Announcement.objects.create(
            title="Draft Campaign",
            summary="Secret draft.",
            category="CITY_CAMPAIGN",
            status="DRAFT",
            is_featured=True,
            publish_at=now,
            created_by=admin_user,
        )
        # Featured but EXPIRED -> must NOT appear
        Announcement.objects.create(
            title="Past Event",
            summary="Already ended.",
            category="EVENT",
            status="PUBLISHED",
            is_featured=True,
            publish_at=now - timedelta(days=5),
            expires_at=now - timedelta(days=1),
            created_by=admin_user,
        )
        # Not featured -> must NOT appear in /featured/
        Announcement.objects.create(
            title="Regular Notice",
            summary="Not featured.",
            category="PUBLIC_NOTICE",
            status="PUBLISHED",
            is_featured=False,
            publish_at=now,
            created_by=admin_user,
        )

        res = api_client.get("/api/announcements/featured/")
        assert res.status_code == 200
        items = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        titles = [a["title"] for a in items]
        assert "Mo Seva Kendra Mobile App" in titles
        assert "Draft Campaign" not in titles
        assert "Past Event" not in titles
        assert "Regular Notice" not in titles

    def test_public_list_with_category_and_search(self, api_client, admin_user):
        now = timezone.now()
        Announcement.objects.create(
            title="Clean Cuttack Green Campaign",
            summary="Join municipal ward tree plantation drive.",
            category="CITY_CAMPAIGN",
            status="PUBLISHED",
            created_by=admin_user,
        )
        Announcement.objects.create(
            title="Water Pipeline Replacement at CDA",
            summary="Water supply maintenance on Saturday.",
            category="WATER",
            status="PUBLISHED",
            created_by=admin_user,
        )

        # Search filter
        res = api_client.get("/api/announcements/?search=Plantation")
        assert res.status_code == 200
        items = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
        assert any(item["title"] == "Clean Cuttack Green Campaign" for item in items)

        # Category filter
        res_cat = api_client.get("/api/announcements/?category=WATER")
        assert res_cat.status_code == 200
        cat_items = res_cat.data.get("results", res_cat.data) if isinstance(res_cat.data, dict) else res_cat.data
        assert all(item["category"] == "WATER" for item in cat_items)
        assert any(item["title"] == "Water Pipeline Replacement at CDA" for item in cat_items)

    def test_announcement_detail_and_view_telemetry(self, api_client, admin_user):
        ann = Announcement.objects.create(
            title="Biju Swasthya Kalyan Yojana Update",
            summary="Smart health card annual benefit renewal.",
            content="Full details regarding the BSKY renewal process across Odisha.",
            category="WELFARE_SCHEME",
            status="PUBLISHED",
            created_by=admin_user,
        )

        res = api_client.get(f"/api/announcements/{ann.slug}/")
        assert res.status_code == 200
        assert res.data["title"] == ann.title
        assert res.data["category"] == "WELFARE_SCHEME"

        # Check telemetry recorded VIEW
        views_count = AnnouncementInteraction.objects.filter(
            announcement=ann, event_type="VIEW"
        ).count()
        assert views_count >= 1

    def test_record_impression_and_clicks(self, api_client, admin_user):
        ann = Announcement.objects.create(
            title="Bus Route Expansion Notice",
            summary="New Mo Bus routes connecting railway station.",
            category="TRANSPORT",
            status="PUBLISHED",
            cta_destination="/citizen/transport",
            created_by=admin_user,
        )

        # Record impression
        res_imp = api_client.post(f"/api/announcements/{ann.id}/impressions/", {"session_id": "test-session-1"})
        assert res_imp.status_code == 200
        assert AnnouncementInteraction.objects.filter(announcement=ann, event_type="IMPRESSION").exists()

        # Record click
        res_click = api_client.post(f"/api/announcements/{ann.id}/clicks/", {
            "session_id": "test-session-1",
            "destination": "/citizen/transport",
            "event_type": "CLICK",
        })
        assert res_click.status_code == 200
        assert AnnouncementInteraction.objects.filter(announcement=ann, event_type="CLICK").exists()


@pytest.mark.django_db
class TestAdminAnnouncements:
    """Tests for authorized administrative capabilities, lifecycle, and security."""

    def test_citizen_cannot_create_announcement(self, citizen_client):
        payload = {
            "title": "Unauthorized Citizen Announcement",
            "summary": "Should be rejected with 403.",
            "category": "ANNOUNCEMENT",
            "status": "PUBLISHED",
        }
        res = citizen_client.post("/api/admin/announcements/", payload)
        assert res.status_code == 403

    def test_admin_can_create_draft_and_publish(self, admin_client, admin_user):
        payload = {
            "title": "Kalia Scheme Farmer Assistance Distribution",
            "summary": "Direct benefit transfer for small farmers in Odisha.",
            "content": "Eligible farmers can check application status through citizen portal.",
            "category": "WELFARE_SCHEME",
            "status": "DRAFT",
            "cta_label": "Check Eligibility",
            "cta_type": "INTERNAL",
            "cta_destination": "/citizen/services",
            "is_featured": True,
            "display_order": 1,
            "priority": "HIGH",
        }
        res = admin_client.post("/api/admin/announcements/", payload)
        assert res.status_code == 201
        ann_id = res.data["id"]
        assert res.data["status"] == "DRAFT"
        assert res.data["slug"] == "kalia-scheme-farmer-assistance-distribution"

        # Verify audit log recorded creation
        audit_entry = ActivityLog.objects.filter(model_name="Announcement", object_id=ann_id, action="CREATE").first()
        assert audit_entry is not None
        assert "Created announcement" in audit_entry.message

        # Now publish via status endpoint
        res_status = admin_client.patch(f"/api/admin/announcements/{ann_id}/status/", {"status": "PUBLISHED"})
        assert res_status.status_code == 200
        assert res_status.data["status"] == "PUBLISHED"
        assert res_status.data["published_at"] is not None

        # Verify status change audit log
        audit_status = ActivityLog.objects.filter(model_name="Announcement", object_id=ann_id, action="STATUS_CHANGE").first()
        assert audit_status is not None

    def test_emergency_alert_super_admin_requirement(self, officer_user, admin_user):
        from rest_framework.test import APIClient
        officer_cli = APIClient()
        officer_cli.force_authenticate(user=officer_user)

        admin_cli = APIClient()
        admin_cli.force_authenticate(user=admin_user)

        payload = {
            "title": "Cyclone Warning Alert",
            "summary": "Severe cyclonic storm advisory.",
            "category": "EMERGENCY_ALERT",
            "priority": "EMERGENCY",
            "status": "PUBLISHED",
        }
        res_officer = officer_cli.post("/api/admin/announcements/", payload)
        assert res_officer.status_code in [400, 403]

        # Super Admin CAN create emergency alert
        res_admin = admin_cli.post("/api/admin/announcements/", payload)
        assert res_admin.status_code == 201
        assert res_admin.data["priority"] == "EMERGENCY"

    def test_admin_analytics_aggregation(self, admin_client, admin_user):
        ann = Announcement.objects.create(
            title="Tree Plantation Mission",
            summary="Green Odisha campaign.",
            category="CITY_CAMPAIGN",
            status="PUBLISHED",
            is_featured=True,
            created_by=admin_user,
        )
        # Create dummy telemetry
        AnnouncementInteraction.objects.create(announcement=ann, event_type="IMPRESSION")
        AnnouncementInteraction.objects.create(announcement=ann, event_type="IMPRESSION")
        AnnouncementInteraction.objects.create(announcement=ann, event_type="CLICK")

        res = admin_client.get("/api/admin/announcements/analytics/")
        assert res.status_code == 200
        assert "overview" in res.data
        assert res.data["overview"]["total_impressions"] >= 2
        assert res.data["overview"]["total_clicks"] >= 1
        assert len(res.data["top_campaigns"]) >= 1

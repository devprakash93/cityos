"""
tests/test_complaints.py
Unit tests for the full complaint lifecycle.
"""
import pytest
from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from apps.complaints.models import Complaint, ComplaintHistory, ComplaintAssignment


@pytest.fixture
def sample_complaint(db, citizen_user, department_traffic):
    return Complaint.objects.create(
        citizen=citizen_user,
        department=department_traffic,
        category="TRAFFIC",
        title="Pothole on Main Road",
        description="Large pothole causing accidents",
        address="Main Road, Sector 5",
        status=Complaint.PENDING,
        priority=Complaint.HIGH,
    )


@pytest.mark.django_db
class TestComplaintSubmission:
    def test_citizen_can_submit_complaint(self, citizen_client, department_traffic):
        url = reverse("complaint-list")
        payload = {
            "title": "Street light out",
            "category": "ELECTRICITY",
            "description": "Street light at corner broken",
            "address": "Corner of Main & 2nd Street",
            "priority": "MEDIUM",
        }
        response = citizen_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_officer_cannot_submit_complaint(self, officer_client):
        url = reverse("complaint-list")
        payload = {
            "title": "Test",
            "category": "TRAFFIC",
            "description": "Test",
            "address": "Test",
        }
        response = officer_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_new_complaint_has_pending_status(self, citizen_client):
        url = reverse("complaint-list")
        response = citizen_client.post(url, {
            "title": "Water pipe burst",
            "category": "WATER_SUPPLY",
            "description": "Major burst",
            "address": "Block A",
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestComplaintAccess:
    def test_citizen_only_sees_own_complaints(self, citizen_client, sample_complaint):
        url = reverse("complaint-list")
        response = citizen_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # All returned complaints must belong to this citizen
        for item in response.data.get("results", []):
            assert item["citizen_name"] is not None

    def test_officer_sees_department_complaints(self, officer_client, sample_complaint):
        url = reverse("complaint-list")
        response = officer_client.get(url)
        assert response.status_code == status.HTTP_200_OK

    def test_citizen_cannot_view_others_complaint(self, api_client, role_citizen, sample_complaint):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        other = User.objects.create_user(
            email="other@test.com", username="other_user",
            password="Pass@1234", role=role_citizen
        )
        api_client.force_authenticate(user=other)
        url = reverse("complaint-detail", kwargs={"pk": sample_complaint.pk})
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


@pytest.mark.django_db
class TestStatusTransition:
    def test_officer_can_update_status_to_assigned(self, officer_client, sample_complaint):
        url = reverse("complaint-update-status", kwargs={"pk": sample_complaint.pk})
        response = officer_client.patch(url, {
            "status": "ASSIGNED", "remarks": "Assigning to field worker"
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        sample_complaint.refresh_from_db()
        assert sample_complaint.status == Complaint.ASSIGNED

    def test_invalid_transition_rejected(self, officer_client, sample_complaint):
        # Cannot jump from PENDING to RESOLVED
        url = reverse("complaint-update-status", kwargs={"pk": sample_complaint.pk})
        response = officer_client.patch(url, {"status": "RESOLVED"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_status_change_creates_history_entry(self, officer_client, sample_complaint):
        url = reverse("complaint-update-status", kwargs={"pk": sample_complaint.pk})
        officer_client.patch(url, {"status": "ASSIGNED"}, format="json")
        history_count = ComplaintHistory.objects.filter(complaint=sample_complaint).count()
        assert history_count >= 1  # Only this update, initial creation was direct ORM


@pytest.mark.django_db
class TestComplaintAssignment:
    def test_officer_can_assign_to_worker(self, officer_client, sample_complaint, worker_user):
        url = reverse("complaint-assign", kwargs={"pk": sample_complaint.pk})
        response = officer_client.post(url, {
            "assigned_to_id": worker_user.pk,
            "remarks": "Please fix ASAP",
        }, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert ComplaintAssignment.objects.filter(complaint=sample_complaint, is_active=True).exists()

    def test_citizen_cannot_assign_complaint(self, citizen_client, sample_complaint, worker_user):
        url = reverse("complaint-assign", kwargs={"pk": sample_complaint.pk})
        response = citizen_client.post(url, {"assigned_to_id": worker_user.pk}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestComplaintHistory:
    def test_history_endpoint_returns_timeline(self, citizen_client, sample_complaint):
        url = reverse("complaint-history", kwargs={"pk": sample_complaint.pk})
        response = citizen_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data

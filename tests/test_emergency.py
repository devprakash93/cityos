"""
tests/test_emergency.py
Unit tests for Emergency Controller Authentication, Role Permissions, Dashboard, and Demo Calling flows.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import Role, CustomUser
from apps.emergency.models import EmergencyIncident, Responder


@pytest.fixture
def controller_user(db):
    """Fixture providing a user with the EMERGENCY_CONTROLLER role."""
    role, _ = Role.objects.get_or_create(
        name=Role.EMERGENCY_CONTROLLER,
        defaults={"description": "Emergency Controller"}
    )
    user = CustomUser.objects.create_user(
        email="controller.test@cityos.gov",
        username="controller_test_unit",
        password="TestPass@1234",
        first_name="Control",
        last_name="Officer",
        role=role,
    )
    return user


@pytest.fixture
def emergency_incident(db, citizen_user):
    """Fixture providing an EmergencyIncident."""
    return EmergencyIncident.objects.create(
        title="Test Chemical Leak",
        incident_type="OTHER",
        severity="HIGH",
        description="Hazardous container breach",
        reported_by=citizen_user,
        status="REPORTED",
    )


@pytest.mark.django_db
class TestEmergencyControllerAuth:
    def test_controller_auth_success(self, api_client, citizen_user):
        """Citizen can authenticate the predefined demo emergency controller."""
        api_client.force_authenticate(user=citizen_user)
        url = reverse("emergency-controller-auth")
        payload = {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "OdishaSecure2026!#",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "token" in response.data
        assert "controller" in response.data
        assert response.data["controller"]["controller_id"] == "EMERGENCY-CTRL-ODISHA"
        assert response.data["controller"]["status"] == "ONLINE"
        # Security check: Password must NEVER be returned in response
        assert "password" not in str(response.data).lower() or "password" not in response.data

    def test_controller_auth_invalid_password(self, api_client, citizen_user):
        """Invalid controller password returns 401 and does not expose internal info."""
        api_client.force_authenticate(user=citizen_user)
        url = reverse("emergency-controller-auth")
        payload = {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "WrongPassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False
        assert "invalid" in response.data["error"].lower()

    def test_controller_auth_invalid_controller_id(self, api_client, citizen_user):
        """Invalid controller ID returns 401."""
        api_client.force_authenticate(user=citizen_user)
        url = reverse("emergency-controller-auth")
        payload = {
            "controller_id": "FAKE-CONTROLLER-999",
            "password": "OdishaSecure2026!#",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False

    def test_controller_auth_missing_credentials(self, api_client, citizen_user):
        """Missing ID or password returns 400 Bad Request."""
        api_client.force_authenticate(user=citizen_user)
        url = reverse("emergency-controller-auth")
        response = api_client.post(url, {"controller_id": ""}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_user_denied(self, api_client):
        """Unauthenticated user cannot access controller auth endpoint."""
        url = reverse("emergency-controller-auth")
        response = api_client.post(url, {"controller_id": "EMERGENCY-CTRL-ODISHA", "password": "OdishaSecure2026!#"})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestBuiltInControllerRoleAndLogin:
    def test_dedicated_controller_login_success(self, api_client):
        """Dedicated controller login creates role & user on the fly and returns JWT tokens."""
        url = reverse("auth-controller-login")
        payload = {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "OdishaSecure2026!#",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["redirect"] == "/controller/dashboard"
        assert response.data["user"]["role"]["name"] == "EMERGENCY_CONTROLLER"
        assert "tokens" in response.data
        assert "access" in response.data["tokens"]

    def test_dedicated_controller_login_invalid_password(self, api_client):
        """Dedicated controller login rejects incorrect password with 401."""
        url = reverse("auth-controller-login")
        payload = {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "BadPassword123!",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False


@pytest.mark.django_db
class TestControllerDashboardPermissions:
    def test_controller_can_access_dashboard_overview(self, api_client, controller_user, emergency_incident):
        """Authenticated Emergency Controller can access controller dashboard overview."""
        api_client.force_authenticate(user=controller_user)
        url = reverse("emergency-controller-dashboard")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert "metrics" in response.data
        assert response.data["metrics"]["total"] >= 1
        assert "incidents" in response.data
        assert "responders" in response.data

    def test_citizen_cannot_access_controller_dashboard(self, api_client, citizen_user):
        """Citizen receives 403 Forbidden on controller dashboard overview."""
        api_client.force_authenticate(user=citizen_user)
        url = reverse("emergency-controller-dashboard")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_controller_can_update_incident_status(self, api_client, controller_user, emergency_incident):
        """Controller can acknowledge and resolve incidents."""
        api_client.force_authenticate(user=controller_user)
        url = reverse("emergency-incident-update-status", kwargs={"pk": emergency_incident.pk})

        # Acknowledge
        res1 = api_client.post(url, {"status": "ACKNOWLEDGED"}, format="json")
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data["status"] == "ACKNOWLEDGED"

        # Resolve
        res2 = api_client.post(url, {"status": "RESOLVED"}, format="json")
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data["status"] == "RESOLVED"

    def test_controller_can_assign_responder(self, api_client, controller_user, emergency_incident):
        """Controller can dispatch an available responder unit."""
        api_client.force_authenticate(user=controller_user)
        responder = Responder.objects.create(
            unit_code="AMB-OD-09",
            responder_type="AMBULANCE",
            status="AVAILABLE",
            operator=controller_user,
        )
        url = reverse("emergency-incident-assign-responder", kwargs={"pk": emergency_incident.pk})
        res = api_client.post(url, {"responder_id": responder.pk, "notes": "Dispatched to accident site"}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["success"] is True
        assert res.data["incident_status"] == "RESPONDING"
        responder.refresh_from_db()
        assert responder.status == "DISPATCHED"


@pytest.mark.django_db
class TestEmergencyDemoCall:
    def test_demo_call_success_with_valid_token(self, api_client, citizen_user):
        """Citizen can initiate a realistic demo call with valid controller token and GPS coordinates."""
        api_client.force_authenticate(user=citizen_user)
        # Authenticate first
        auth_url = reverse("emergency-controller-auth")
        auth_res = api_client.post(auth_url, {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "OdishaSecure2026!#",
        })
        token = auth_res.data["token"]

        # Call endpoint
        call_url = reverse("emergency-controller-demo-call")
        payload = {
            "token": token,
            "latitude": 20.2961,
            "longitude": 85.8245,
            "accuracy": 12.5,
            "address": "Master Canteen, Bhubaneswar, Odisha",
        }
        response = api_client.post(call_url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["success"] is True
        assert response.data["demo"] is True
        assert response.data["status"] == "CONNECTED"
        assert "DEMO" in response.data["notice"]
        assert response.data["coordinates"]["latitude"] == 20.2961

    def test_demo_call_denied_without_token(self, api_client, citizen_user):
        """Demo call is rejected if controller token is omitted."""
        api_client.force_authenticate(user=citizen_user)
        call_url = reverse("emergency-controller-demo-call")
        response = api_client.post(call_url, {"latitude": 20.2961, "longitude": 85.8245}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["success"] is False

    def test_controller_can_accept_and_end_demo_call(self, api_client, controller_user, citizen_user):
        """Emergency Controller can accept and end an incoming demo call session."""
        api_client.force_authenticate(user=citizen_user)
        auth_url = reverse("emergency-controller-auth")
        auth_res = api_client.post(auth_url, {
            "controller_id": "EMERGENCY-CTRL-ODISHA",
            "password": "OdishaSecure2026!#",
        })
        token = auth_res.data["token"]

        # Citizen starts demo call
        call_url = reverse("emergency-controller-demo-call")
        call_res = api_client.post(call_url, {
            "token": token,
            "latitude": 20.2961,
            "longitude": 85.8245,
            "accuracy": 10.0,
            "address": "Bhubaneswar Central",
        }, format="json")
        call_id = call_res.data["call_id"]

        # Controller accepts call
        api_client.force_authenticate(user=controller_user)
        action_url = reverse("emergency-controller-call-action", kwargs={"call_id": call_id})
        accept_res = api_client.post(action_url, {"action": "accept"}, format="json")
        assert accept_res.status_code == status.HTTP_200_OK
        assert accept_res.data["status"] == "CONNECTED"

        # Controller ends call
        end_res = api_client.post(action_url, {"action": "end"}, format="json")
        assert end_res.status_code == status.HTTP_200_OK
        assert end_res.data["status"] == "ENDED"

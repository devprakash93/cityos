"""
tests/test_emergency.py
Unit tests for Emergency Controller Authentication and Demo Calling flows.
"""
import pytest
from django.urls import reverse
from rest_framework import status


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

    def test_demo_call_denied_with_invalid_token(self, api_client, citizen_user):
        """Demo call is rejected if controller token is forged or invalid."""
        api_client.force_authenticate(user=citizen_user)
        call_url = reverse("emergency-controller-demo-call")
        response = api_client.post(call_url, {
            "token": "tampered.or.invalid.token",
            "latitude": 20.2961,
            "longitude": 85.8245,
        }, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

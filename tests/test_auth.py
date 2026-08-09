"""
tests/test_auth.py
Unit tests for authentication flows.
"""
import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestRegistration:
    def test_citizen_can_register(self, api_client):
        url = reverse("auth-register")
        payload = {
            "email": "newuser@example.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "password": "NewPass@1234",
            "password_confirm": "NewPass@1234",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert "tokens" in response.data
        assert response.data["user"]["role"]["name"] == "CITIZEN"

    def test_duplicate_email_rejected(self, api_client, citizen_user):
        url = reverse("auth-register")
        payload = {
            "email": citizen_user.email,
            "username": "another_user",
            "password": "AnotherPass@1234",
            "password_confirm": "AnotherPass@1234",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_password_mismatch_rejected(self, api_client):
        url = reverse("auth-register")
        payload = {
            "email": "unique@example.com",
            "username": "uniqueuser",
            "password": "Pass@1234",
            "password_confirm": "Different@1234",
        }
        response = api_client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogin:
    def test_valid_login_returns_tokens(self, api_client, citizen_user):
        url = reverse("auth-login")
        response = api_client.post(url, {"email": "citizen@test.com", "password": "TestPass@1234"})
        assert response.status_code == status.HTTP_200_OK
        assert "tokens" in response.data
        assert "redirect" in response.data

    def test_wrong_password_rejected(self, api_client, citizen_user):
        url = reverse("auth-login")
        response = api_client.post(url, {"email": "citizen@test.com", "password": "WrongPassword"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_inactive_user_rejected(self, api_client, citizen_user):
        citizen_user.is_active = False
        citizen_user.save()
        url = reverse("auth-login")
        response = api_client.post(url, {"email": "citizen@test.com", "password": "TestPass@1234"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestMeEndpoint:
    def test_authenticated_user_can_get_profile(self, citizen_client):
        url = reverse("auth-me")
        response = citizen_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["data"]["role"]["name"] == "CITIZEN"

    def test_unauthenticated_access_denied(self, api_client):
        url = reverse("auth-me")
        response = api_client.get(url)
        assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]

    def test_citizen_can_update_profile(self, citizen_client):
        url = reverse("auth-me")
        response = citizen_client.patch(url, {"first_name": "Updated"}, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestChangePassword:
    def test_password_change_succeeds(self, citizen_client, citizen_user):
        url = reverse("auth-change-password")
        response = citizen_client.post(url, {
            "old_password": "TestPass@1234",
            "new_password": "NewPass@5678",
            "new_password_confirm": "NewPass@5678",
        })
        assert response.status_code == status.HTTP_200_OK
        citizen_user.refresh_from_db()
        assert citizen_user.check_password("NewPass@5678")

    def test_wrong_old_password_rejected(self, citizen_client):
        url = reverse("auth-change-password")
        response = citizen_client.post(url, {
            "old_password": "WrongOldPassword",
            "new_password": "NewPass@5678",
            "new_password_confirm": "NewPass@5678",
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestStaffCreate:
    def test_admin_can_create_officer(self, admin_client, department_traffic, role_officer):
        url = reverse("auth-staff-create")
        response = admin_client.post(url, {
            "email": "newofficer@cityos.gov",
            "username": "new_officer",
            "first_name": "New",
            "last_name": "Officer",
            "password": "OfficerPass@1234",
            "role_id": role_officer.pk,
            "department_id": department_traffic.pk,
        }, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_citizen_cannot_create_staff(self, citizen_client, role_officer):
        url = reverse("auth-staff-create")
        response = citizen_client.post(url, {
            "email": "hack@cityos.gov",
            "username": "hacker",
            "password": "HackPass@1234",
            "role_id": role_officer.pk,
        }, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

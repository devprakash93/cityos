"""
conftest.py — pytest-django configuration and shared fixtures.
"""
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture(scope="session")
def django_db_setup():
    """Use the default test database."""
    pass


@pytest.fixture
def role_citizen(db):
    from apps.accounts.models import Role
    role, _ = Role.objects.get_or_create(name=Role.CITIZEN)
    return role


@pytest.fixture
def role_officer(db):
    from apps.accounts.models import Role
    role, _ = Role.objects.get_or_create(name=Role.OFFICER)
    return role


@pytest.fixture
def role_worker(db):
    from apps.accounts.models import Role
    role, _ = Role.objects.get_or_create(name=Role.FIELD_WORKER)
    return role


@pytest.fixture
def role_admin(db):
    from apps.accounts.models import Role
    role, _ = Role.objects.get_or_create(name=Role.SUPER_ADMIN)
    return role


@pytest.fixture
def department_traffic(db):
    from apps.accounts.models import Department
    dept, _ = Department.objects.get_or_create(
        code=Department.TRAFFIC, defaults={"name": "Traffic Management"}
    )
    return dept


@pytest.fixture
def citizen_user(db, role_citizen):
    return User.objects.create_user(
        email="citizen@test.com",
        username="test_citizen",
        password="TestPass@1234",
        role=role_citizen,
    )


@pytest.fixture
def officer_user(db, role_officer, department_traffic):
    return User.objects.create_user(
        email="officer@test.com",
        username="test_officer",
        password="TestPass@1234",
        role=role_officer,
        department=department_traffic,
    )


@pytest.fixture
def worker_user(db, role_worker, department_traffic):
    return User.objects.create_user(
        email="worker@test.com",
        username="test_worker",
        password="TestPass@1234",
        role=role_worker,
        department=department_traffic,
    )


@pytest.fixture
def admin_user(db, role_admin):
    return User.objects.create_user(
        email="admin@test.com",
        username="test_admin",
        password="TestPass@1234",
        role=role_admin,
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def citizen_client(api_client, citizen_user):
    api_client.force_authenticate(user=citizen_user)
    return api_client


@pytest.fixture
def officer_client(api_client, officer_user):
    api_client.force_authenticate(user=officer_user)
    return api_client


@pytest.fixture
def worker_client(api_client, worker_user):
    api_client.force_authenticate(user=worker_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client

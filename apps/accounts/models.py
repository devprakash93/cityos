"""
apps/accounts/models.py
=======================
Core user, role, department, profile, and activity log models.

Design decisions:
- CustomUser extends AbstractBaseUser so we own every field.
- Role is a standalone table so new roles can be added without code changes.
- Department links officers to their city department.
- UserProfile is a 1-to-1 extension for non-auth fields.
- ActivityLog records every important user action for audit trails.
"""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from core.utils import media_upload_path


# ---------------------------------------------------------------------------
# Role
# ---------------------------------------------------------------------------
class Role(models.Model):
    """
    System role. Pre-seeded with: CITIZEN, OFFICER, FIELD_WORKER, SUPER_ADMIN.
    Adding a new role only requires a DB insert — no code change needed.
    """
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"
    FIELD_WORKER = "FIELD_WORKER"
    SUPER_ADMIN = "SUPER_ADMIN"

    ROLE_CHOICES = [
        (CITIZEN, "Citizen"),
        (OFFICER, "Officer"),
        (FIELD_WORKER, "Field Worker"),
        (SUPER_ADMIN, "Super Admin"),
    ]

    name = models.CharField(max_length=30, unique=True, choices=ROLE_CHOICES, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roles"

    def __str__(self):
        return self.get_name_display()


# ---------------------------------------------------------------------------
# Department
# ---------------------------------------------------------------------------
class Department(models.Model):
    """City departments — each officer belongs to exactly one."""
    TRAFFIC = "TRAFFIC"
    WASTE = "WASTE"
    WATER = "WATER"
    ELECTRICITY = "ELECTRICITY"
    TRANSPORT = "TRANSPORT"
    EMERGENCY = "EMERGENCY"
    POLLUTION = "POLLUTION"
    CITIZEN_SERVICES = "CITIZEN_SERVICES"

    DEPT_CHOICES = [
        (TRAFFIC, "Traffic Management"),
        (WASTE, "Waste Management"),
        (WATER, "Water Supply"),
        (ELECTRICITY, "Electricity & Power"),
        (TRANSPORT, "Public Transport"),
        (EMERGENCY, "Emergency Services"),
        (POLLUTION, "Pollution Control"),
        (CITIZEN_SERVICES, "Citizen Services"),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=30, unique=True, choices=DEPT_CHOICES, db_index=True)
    description = models.TextField(blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    # head_officer is set after user creation — nullable to break circular FK
    head_officer = models.ForeignKey(
        "CustomUser",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="headed_departments",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "departments"
        indexes = [models.Index(fields=["code"])]

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Custom User Manager
# ---------------------------------------------------------------------------
class CustomUserManager(BaseUserManager):
    """Manager for CustomUser with email as the login identifier."""

    def create_user(self, email: str, username: str, password: str = None, **extra_fields):
        if not email:
            raise ValueError("Email address is required.")
        if not username:
            raise ValueError("Username is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, username: str, password: str = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if not extra_fields.get("is_staff"):
            raise ValueError("Superuser must have is_staff=True.")
        if not extra_fields.get("is_superuser"):
            raise ValueError("Superuser must have is_superuser=True.")

        # Assign SUPER_ADMIN role
        role, _ = Role.objects.get_or_create(name=Role.SUPER_ADMIN)
        extra_fields["role"] = role
        return self.create_user(email, username, password, **extra_fields)


# ---------------------------------------------------------------------------
# CustomUser
# ---------------------------------------------------------------------------
class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Primary user model. Login uses email + password.
    Role drives all permission decisions throughout the system.
    """
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, unique=True, db_index=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)

    # Role & department — indexed because almost every query filters on these
    role = models.ForeignKey(
        Role,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
        db_index=True,
    )
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="members",
        db_index=True,
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["department", "role"]),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def role_name(self) -> str:
        return self.role.name if self.role else ""

    def is_citizen(self) -> bool:
        return self.role_name == Role.CITIZEN

    def is_officer(self) -> bool:
        return self.role_name == Role.OFFICER

    def is_field_worker(self) -> bool:
        return self.role_name == Role.FIELD_WORKER

    def is_super_admin(self) -> bool:
        return self.role_name == Role.SUPER_ADMIN


# ---------------------------------------------------------------------------
# UserProfile
# ---------------------------------------------------------------------------
class UserProfile(models.Model):
    """
    Extended profile data. Separated from CustomUser to keep the auth
    table lean and allow profile data to evolve independently.

    Geographic fields (city/district) are FK references to apps.geography models.
    These are used by apps.geography.permissions.get_city_for_user() to derive
    the authoritative city scope for Citizens and Officers.
    """
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(
        upload_to=media_upload_path("avatars"), null=True, blank=True
    )
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    bio = models.TextField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)  # for officers/workers

    # Geographic references — used for backend authorization
    # city FK is the authoritative city scope for this user
    state_ref = models.ForeignKey(
        "geography.State",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="residents",
    )
    district_ref = models.ForeignKey(
        "geography.District",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="residents",
    )
    city_ref = models.ForeignKey(
        "geography.City",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="residents",
        help_text="Authoritative city — used for backend geographic filtering"
    )
    zone_ref = models.ForeignKey(
        "geography.Zone",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="residents",
    )
    ward_ref = models.ForeignKey(
        "geography.Ward",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="residents",
    )

    # Operational Availability
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    ON_TASK = "ON_TASK"
    OFFLINE = "OFFLINE"
    ON_LEAVE = "ON_LEAVE"

    AVAILABILITY_CHOICES = [
        (AVAILABLE, "Available"),
        (BUSY, "Busy"),
        (ON_TASK, "On Task"),
        (OFFLINE, "Offline"),
        (ON_LEAVE, "On Leave"),
    ]
    availability = models.CharField(
        max_length=20, 
        choices=AVAILABILITY_CHOICES, 
        default=AVAILABLE,
        help_text="Operational availability for field workers"
    )

    # Text fields for backward compatibility + non-Odisha fallbacks
    city = models.CharField(max_length=100, blank=True, help_text="Legacy/free-text city")
    state = models.CharField(max_length=100, default="Odisha", blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    language = models.CharField(
        max_length=5,
        choices=[("en", "English"), ("or", "Odia")],
        default="en"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"

    def __str__(self):
        return f"Profile of {self.user.email}"


# ---------------------------------------------------------------------------
# ActivityLog
# ---------------------------------------------------------------------------
class ActivityLog(models.Model):
    """
    Immutable audit trail. Never updated — only inserted.
    Records who did what to which object.
    """
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
        ("STATUS_CHANGE", "Status Change"),
        ("ASSIGN", "Assignment"),
        ("VIEW", "View"),
    ]

    user = models.ForeignKey(
        CustomUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="activity_logs",
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.BigIntegerField(null=True, blank=True)
    message = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "activity_logs"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "action"]),
            models.Index(fields=["model_name", "object_id"]),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.user} — {self.action} {self.model_name}#{self.object_id}"

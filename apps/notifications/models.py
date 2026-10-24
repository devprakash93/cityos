"""
apps/notifications/models.py
==============================
Role-aware notification model and production-grade civic announcements system.
"""
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.text import slugify
from django.utils import timezone
from apps.accounts.models import CustomUser
from core.utils import media_upload_path


class Notification(models.Model):
    """
    A notification sent to a specific user.
    - role-aware: service layer ensures citizens never see internal messages
    - related_object: generic FK allows linking to any model (Complaint, PowerOutage, etc.)
    """
    CATEGORY_CHOICES = [
        ("COMPLAINT", "Complaint Update"),
        ("SYSTEM", "System Alert"),
        ("EMERGENCY", "Emergency Alert"),
        ("IOT_ALERT", "IoT Threshold Alert"),
        ("DEPARTMENT", "Department Notice"),
    ]

    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="SYSTEM", db_index=True)
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # Generic FK — allows notifications to reference any model
    content_type = models.ForeignKey(ContentType, on_delete=models.SET_NULL, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    related_object = GenericForeignKey("content_type", "object_id")

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "category"]),
        ]

    def __str__(self):
        return f"[{self.category}] → {self.recipient.email}: {self.title[:50]}"


class AnnouncementQuerySet(models.QuerySet):
    """Custom queryset for active, public, and geographic filtering."""

    def published(self):
        """Active announcements that are published and not expired."""
        now = timezone.now()
        return self.filter(
            status="PUBLISHED",
            publish_at__lte=now,
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=now)
        )

    def featured(self):
        """Published and featured announcements ordered for carousel."""
        return self.published().filter(is_featured=True).order_by("-is_pinned", "display_order", "-publish_at")

    def for_citizen(self, user=None):
        """
        Filter announcements applicable to a citizen based on their configured geography.
        If no user or unauthenticated, return statewide / general announcements.
        """
        qs = self.published()
        if not user or not user.is_authenticated:
            return qs.filter(models.Q(audience_scope__in=["ALL", "STATE"]) | models.Q(scope_level="STATE"))

        profile = getattr(user, "profile", None)
        if not profile:
            return qs.filter(models.Q(audience_scope__in=["ALL", "STATE"]) | models.Q(scope_level="STATE"))

        q_filter = models.Q(audience_scope__in=["ALL", "STATE"]) | models.Q(scope_level="STATE")
        if profile.district_ref_id:
            q_filter |= models.Q(audience_scope="DISTRICT", target_district_id=profile.district_ref_id)
        if profile.city_ref_id:
            q_filter |= models.Q(audience_scope="CITY", target_city_id=profile.city_ref_id)
        if profile.ward_ref_id:
            q_filter |= models.Q(audience_scope="WARD", target_ward_id=profile.ward_ref_id)

        return qs.filter(q_filter)


class Announcement(models.Model):
    """
    Official civic announcements, campaigns, welfare notices, and emergency advisories.
    Supports rich media, audience targeting, analytics, and lifecycle management.
    """
    CATEGORY_CHOICES = [
        ("ANNOUNCEMENT", "Official Announcement"),
        ("PUBLIC_NOTICE", "Public Notice"),
        ("WELFARE_SCHEME", "Welfare Scheme"),
        ("CITY_CAMPAIGN", "City Campaign"),
        ("EMERGENCY_ALERT", "Emergency Alert"),
        ("TRAFFIC", "Traffic & Roadwork Notice"),
        ("WATER", "Water Supply Notice"),
        ("ELECTRICITY", "Electricity Notice"),
        ("TRANSPORT", "Public Transport Update"),
        ("CIVIC", "Civic Initiative"),
        ("EVENT", "Public Event"),
        ("WEATHER", "Weather Alert"),
        ("DISASTER", "Disaster Preparedness"),
    ]

    AUDIENCE_CHOICES = [
        ("ALL", "All Citizens (Statewide)"),
        ("STATE", "All Odisha"),
        ("DISTRICT", "District"),
        ("CITY", "City"),
        ("ZONE", "Zone"),
        ("WARD", "Ward"),
    ]

    PRIORITY_CHOICES = [
        ("LOW", "Low"),
        ("NORMAL", "Normal"),
        ("HIGH", "High"),
        ("EMERGENCY", "Emergency"),
    ]

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("SCHEDULED", "Scheduled"),
        ("PUBLISHED", "Published"),
        ("EXPIRED", "Expired"),
        ("ARCHIVED", "Archived"),
    ]

    CTA_TYPE_CHOICES = [
        ("INTERNAL", "Internal Route"),
        ("EXTERNAL", "External URL"),
    ]

    # Content & identity
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True, db_index=True)
    summary = models.TextField(blank=True, help_text="Short teaser description for banner and cards")
    content = models.TextField(blank=True, help_text="Full markdown or formatted announcement body")
    message = models.TextField(blank=True, help_text="Legacy message field for backward compatibility")
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="ANNOUNCEMENT", db_index=True)

    # Department & Attribution
    department = models.ForeignKey(
        "accounts.Department",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    department_name = models.CharField(max_length=150, blank=True, help_text="Cached department display name")

    # Visual Assets
    banner_image = models.ImageField(
        upload_to=media_upload_path("announcements/banners"),
        null=True,
        blank=True,
    )
    banner_image_url = models.CharField(max_length=500, blank=True, help_text="Direct URL or preset banner")
    thumbnail_image = models.ImageField(
        upload_to=media_upload_path("announcements/thumbnails"),
        null=True,
        blank=True,
    )
    thumbnail_image_url = models.CharField(max_length=500, blank=True, help_text="Direct URL or preset thumbnail")

    # Audience & Geographic Scope
    audience_scope = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default="ALL", db_index=True)
    scope_level = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default="CITY")  # Legacy compatibility
    target_district = models.ForeignKey(
        "geography.District",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    target_city = models.ForeignKey(
        "geography.City",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    target_zone = models.ForeignKey(
        "geography.Zone",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    target_ward = models.ForeignKey(
        "geography.Ward",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcements",
    )
    target_geography_name = models.CharField(max_length=150, blank=True)

    # Calls to action
    cta_label = models.CharField(max_length=80, blank=True, default="View Details")
    cta_type = models.CharField(max_length=20, choices=CTA_TYPE_CHOICES, default="INTERNAL")
    cta_destination = models.CharField(max_length=500, blank=True, default="/citizen/announcements")
    secondary_cta_label = models.CharField(max_length=80, blank=True)
    secondary_cta_type = models.CharField(max_length=20, choices=CTA_TYPE_CHOICES, default="INTERNAL")
    secondary_cta_destination = models.CharField(max_length=500, blank=True)

    # Display flags and ordering
    is_featured = models.BooleanField(default=False, db_index=True)
    is_pinned = models.BooleanField(default=False, db_index=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="NORMAL", db_index=True)

    # Lifecycle & Timestamps
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PUBLISHED", db_index=True)
    publish_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    # Auditing
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_announcements",
    )
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_announcements",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Legacy Generic FK support
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveBigIntegerField(null=True, blank=True)
    scope_object = GenericForeignKey("content_type", "object_id")

    objects = AnnouncementQuerySet.as_manager()

    class Meta:
        db_table = "announcements"
        ordering = ["-is_pinned", "display_order", "-publish_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "publish_at", "expires_at"]),
            models.Index(fields=["is_featured", "status"]),
            models.Index(fields=["category", "status"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title}"

    def save(self, *args, **kwargs):
        now = timezone.now()

        # Sync summary, content, and message
        if not self.summary and self.message:
            self.summary = self.message[:300]
        elif not self.summary and self.content:
            self.summary = self.content[:300]

        if not self.content and self.message:
            self.content = self.message
        elif not self.content and self.summary:
            self.content = self.summary

        if not self.message:
            self.message = self.summary or self.content or self.title

        # Sync scope_level and audience_scope
        if self.audience_scope and not self.scope_level:
            self.scope_level = "STATE" if self.audience_scope in ["ALL", "STATE"] else self.audience_scope
        elif self.scope_level and not self.audience_scope:
            self.audience_scope = "ALL" if self.scope_level == "STATE" else self.scope_level

        # Cache target geography name for fast display
        if self.target_ward:
            self.target_geography_name = f"Ward {self.target_ward.number} ({self.target_ward.city.name})"
        elif self.target_zone:
            self.target_geography_name = f"{self.target_zone.name} Zone ({self.target_zone.city.name})"
        elif self.target_city:
            self.target_geography_name = self.target_city.name
        elif self.target_district:
            self.target_geography_name = f"{self.target_district.name} District"
        else:
            self.target_geography_name = "All Odisha"

        # Cache department name
        if self.department:
            self.department_name = self.department.name
        elif not self.department_name:
            self.department_name = "Government of Odisha"

        # Auto-generate unique slug
        if not self.slug:
            base_slug = slugify(self.title)[:200] or "announcement"
            slug = base_slug
            counter = 1
            while Announcement.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug[:190]}-{counter}"
                counter += 1
            self.slug = slug

        # Handle publish_at and status transition
        if not self.publish_at:
            self.publish_at = now

        if self.status == "PUBLISHED" and not self.published_at:
            self.published_at = now

        # Auto-expire if past expiry date
        if self.expires_at and self.expires_at <= now and self.status == "PUBLISHED":
            self.status = "EXPIRED"

        super().save(*args, **kwargs)

    @property
    def effective_banner(self) -> str:
        """Returns the banner image URL or falls back to preset banner."""
        if self.banner_image:
            return self.banner_image.url
        if self.banner_image_url:
            return self.banner_image_url
        # Fallback to category-themed reliable banner SVG / image
        return f"/assets/banners/{self.category.lower()}.svg"

    @property
    def effective_thumbnail(self) -> str:
        """Returns the thumbnail image URL or falls back to preset banner/icon."""
        if self.thumbnail_image:
            return self.thumbnail_image.url
        if self.thumbnail_image_url:
            return self.thumbnail_image_url
        return self.effective_banner


class AnnouncementInteraction(models.Model):
    """
    Audit and analytics event model for announcement impressions, views, and clicks.
    Stores interaction telemetry without unbounded JSON arrays.
    """
    EVENT_CHOICES = [
        ("IMPRESSION", "Impression"),
        ("VIEW", "Detail View"),
        ("CLICK", "Primary CTA Click"),
        ("SECONDARY_CLICK", "Secondary CTA Click"),
    ]

    announcement = models.ForeignKey(
        Announcement,
        on_delete=models.CASCADE,
        related_name="interactions",
        db_index=True,
    )
    event_type = models.CharField(max_length=20, choices=EVENT_CHOICES, db_index=True)
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="announcement_interactions",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_id = models.CharField(max_length=64, blank=True, db_index=True)
    destination = models.CharField(max_length=500, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "announcement_interactions"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["announcement", "event_type"]),
            models.Index(fields=["timestamp", "event_type"]),
        ]

    def __str__(self):
        return f"{self.event_type} on #{self.announcement_id} at {self.timestamp:%Y-%m-%d %H:%M}"

"""
apps/notifications/services.py
================================
Centralised notification dispatch service.
All other apps call this service to send notifications.
Never import notification-producing code from here to avoid circular imports.
"""
from django.contrib.contenttypes.models import ContentType
from apps.accounts.models import CustomUser, Role, Department
from .models import Notification


class NotificationService:
    """Factory for creating role-aware notifications."""

    @staticmethod
    def notify_user(
        user: CustomUser,
        title: str,
        message: str,
        category: str = "SYSTEM",
        related_object=None,
    ) -> Notification:
        """
        Send a notification to a single user.
        Citizens never receive DEPARTMENT-category notifications.
        """
        role_name = user.role.name if user.role else ""
        if role_name == Role.CITIZEN and category == "DEPARTMENT":
            return None  # Citizens don't see internal department notices

        content_type = None
        object_id = None
        if related_object is not None:
            content_type = ContentType.objects.get_for_model(related_object)
            object_id = related_object.pk

        return Notification.objects.create(
            recipient=user,
            title=title,
            message=message,
            category=category,
            content_type=content_type,
            object_id=object_id,
        )

    @staticmethod
    def notify_department_officers(
        department: Department | None,
        title: str,
        message: str,
        related_object=None,
    ) -> int:
        """
        Notify all active officers in a given department.
        Returns the number of notifications created.
        """
        if department is None:
            # Fallback: notify all officers
            officers = CustomUser.objects.filter(
                role__name=Role.OFFICER, is_active=True
            )
        else:
            officers = CustomUser.objects.filter(
                role__name=Role.OFFICER,
                department=department,
                is_active=True,
            )

        count = 0
        for officer in officers:
            NotificationService.notify_user(
                user=officer,
                title=title,
                message=message,
                category="DEPARTMENT",
                related_object=related_object,
            )
            count += 1
        return count

    @staticmethod
    def notify_all_admins(
        title: str,
        message: str,
        category: str = "SYSTEM",
        related_object=None,
    ) -> int:
        """Broadcast a notification to all super admins."""
        admins = CustomUser.objects.filter(
            role__name=Role.SUPER_ADMIN, is_active=True
        )
        count = 0
        for admin in admins:
            NotificationService.notify_user(
                user=admin,
                title=title,
                message=message,
                category=category,
                related_object=related_object,
            )
            count += 1
        return count

    @staticmethod
    def notify_iot_alert(
        department_code: str,
        title: str,
        message: str,
        related_object=None,
    ) -> None:
        """
        IoT threshold breach: notify department officers + all admins.
        """
        dept = Department.objects.filter(code=department_code).first()
        NotificationService.notify_department_officers(
            department=dept,
            title=title,
            message=message,
            related_object=related_object,
        )
        NotificationService.notify_all_admins(
            title=f"[IoT Alert] {title}",
            message=message,
            category="IOT_ALERT",
            related_object=related_object,
        )

    @staticmethod
    def notify_emergency(title: str, message: str, related_object=None) -> None:
        """Broadcast emergency alert to all active users."""
        users = CustomUser.objects.filter(is_active=True)
        for user in users:
            NotificationService.notify_user(
                user=user,
                title=title,
                message=message,
                category="EMERGENCY",
                related_object=related_object,
            )

    @staticmethod
    def notify_announcement_publication(announcement) -> int:
        """
        Dispatches in-app notifications to eligible citizens when an announcement is published.
        Avoids duplicate notifications for the same announcement.
        """
        if announcement.status != "PUBLISHED":
            return 0

        content_type = ContentType.objects.get_for_model(announcement)
        existing_recipients = set(
            Notification.objects.filter(
                content_type=content_type,
                object_id=announcement.pk,
            ).values_list("recipient_id", flat=True)
        )

        users_qs = CustomUser.objects.filter(is_active=True, role__name=Role.CITIZEN)

        # Geographic targeting filter
        if announcement.audience_scope == "WARD" and announcement.target_ward_id:
            users_qs = users_qs.filter(profile__ward_ref_id=announcement.target_ward_id)
        elif announcement.audience_scope == "CITY" and announcement.target_city_id:
            users_qs = users_qs.filter(profile__city_ref_id=announcement.target_city_id)
        elif announcement.audience_scope == "DISTRICT" and announcement.target_district_id:
            users_qs = users_qs.filter(profile__district_ref_id=announcement.target_district_id)

        category = "EMERGENCY" if (announcement.priority == "EMERGENCY" or announcement.category == "EMERGENCY_ALERT") else "SYSTEM"
        title = f"📢 {announcement.title}" if category != "EMERGENCY" else f"🚨 EMERGENCY: {announcement.title}"
        message = announcement.summary or announcement.message or announcement.title

        created_count = 0
        for user in users_qs[:200]:  # Cap notification broadcast to reasonable batch
            if user.id not in existing_recipients:
                Notification.objects.create(
                    recipient=user,
                    title=title,
                    message=message[:200],
                    category=category,
                    content_type=content_type,
                    object_id=announcement.pk,
                )
                created_count += 1
        return created_count

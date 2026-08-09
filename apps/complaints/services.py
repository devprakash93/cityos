"""
apps/complaints/services.py
============================
Business logic for the complete complaint lifecycle.
All mutations go through this service — views are thin wrappers.
"""
from django.utils import timezone
from django.db import transaction
from apps.accounts.models import CustomUser, ActivityLog
from core.utils import get_client_ip
from .models import Complaint, ComplaintAssignment, ComplaintHistory, ComplaintMedia


class ComplaintService:
    """Handles creation, assignment, status transitions, and media uploads."""

    @staticmethod
    @transaction.atomic
    def create_complaint(citizen: CustomUser, serializer, request=None) -> Complaint:
        """
        1. Save the complaint with citizen and initial PENDING status.
        2. Write history entry.
        3. Fire notification signal.
        4. Write activity log.
        """
        from .models import SLAConfiguration
        
        # Try to find a matching SLA config
        sla = SLAConfiguration.objects.filter(
            category=serializer.validated_data.get('category'),
            priority=serializer.validated_data.get('priority')
        ).first()
        
        if not sla:
            # Fallback to priority only
            sla = SLAConfiguration.objects.filter(
                category__isnull=True,
                priority=serializer.validated_data.get('priority')
            ).first()
            
        if not sla:
            # Fallback to default
            sla = SLAConfiguration.objects.filter(
                category__isnull=True,
                priority__isnull=True
            ).first()

        sla_due = None
        if sla:
            from datetime import timedelta
            sla_due = timezone.now() + timedelta(minutes=sla.resolution_minutes)

        complaint = serializer.save(
            citizen=citizen, 
            status=Complaint.PENDING,
            sla_config=sla,
            sla_due_at=sla_due
        )

        # History
        ComplaintHistory.objects.create(
            complaint=complaint,
            changed_by=citizen,
            event_type="STATUS_CHANGE",
            old_value="",
            new_value=Complaint.PENDING,
            remarks="Complaint submitted by citizen.",
        )

        # Activity log
        ActivityLog.objects.create(
            user=citizen,
            action="CREATE",
            model_name="Complaint",
            object_id=complaint.pk,
            message=f"Citizen {citizen.email} submitted complaint {complaint.reference_number}.",
            ip_address=get_client_ip(request) if request else None,
        )

        # Notify department officers
        from apps.notifications.services import NotificationService
        NotificationService.notify_department_officers(
            department=complaint.department,
            title=f"New Complaint: {complaint.reference_number}",
            message=(
                f"A new {complaint.get_category_display()} complaint has been submitted. "
                f"Priority: {complaint.get_priority_display()}."
            ),
            related_object=complaint,
        )
        # Also notify the citizen (confirmation)
        NotificationService.notify_user(
            user=citizen,
            title="Complaint Submitted",
            message=(
                f"Your complaint '{complaint.title}' has been submitted with reference "
                f"{complaint.reference_number}. We will keep you informed."
            ),
            category="COMPLAINT",
            related_object=complaint,
        )

        return complaint

    @staticmethod
    @transaction.atomic
    def update_status(
        complaint: Complaint, new_status: str, changed_by: CustomUser, remarks: str = ""
    ) -> Complaint:
        """
        Transition complaint to a new status.
        Writes history entry and fires notification.
        """
        old_status = complaint.status
        complaint.status = new_status
        complaint.save(update_fields=["status", "updated_at"])

        # History entry
        ComplaintHistory.objects.create(
            complaint=complaint,
            changed_by=changed_by,
            event_type="STATUS_CHANGE",
            old_value=old_status,
            new_value=new_status,
            remarks=remarks,
        )

        # Notify citizen
        from apps.notifications.services import NotificationService
        NotificationService.notify_user(
            user=complaint.citizen,
            title=f"Complaint {complaint.reference_number} Updated",
            message=(
                f"Status changed from {old_status} to {new_status}. "
                f"{remarks}"
            ).strip(),
            category="COMPLAINT",
            related_object=complaint,
        )

        return complaint

    @staticmethod
    @transaction.atomic
    def assign_complaint(
        complaint: Complaint,
        assigned_to_id: int,
        assigned_by: CustomUser,
        deadline=None,
        remarks: str = "",
    ) -> ComplaintAssignment:
        """
        Officer assigns complaint to a field worker.
        Deactivates any previous assignment. Updates status to ASSIGNED.
        """
        from apps.accounts.models import CustomUser as User

        # Deactivate existing assignments
        ComplaintAssignment.objects.filter(complaint=complaint, is_active=True).update(is_active=False)

        worker = User.objects.get(pk=assigned_to_id)
        assignment = ComplaintAssignment.objects.create(
            complaint=complaint,
            assigned_to=worker,
            assigned_by=assigned_by,
            deadline=deadline,
            remarks=remarks,
        )

        # Update complaint status to ASSIGNED
        old_status = complaint.status
        complaint.status = Complaint.ASSIGNED
        complaint.save(update_fields=["status", "updated_at"])

        # History
        ComplaintHistory.objects.create(
            complaint=complaint,
            changed_by=assigned_by,
            event_type="ASSIGNMENT",
            old_value=old_status,
            new_value=Complaint.ASSIGNED,
            remarks=f"Assigned to {worker.full_name}. {remarks}".strip(),
        )

        # Notify field worker and citizen
        from apps.notifications.services import NotificationService
        NotificationService.notify_user(
            user=worker,
            title=f"New Task Assigned: {complaint.reference_number}",
            message=(
                f"You have been assigned complaint '{complaint.title}'. "
                f"Priority: {complaint.get_priority_display()}. "
                f"{'Deadline: ' + deadline.strftime('%Y-%m-%d %H:%M') if deadline else ''}"
            ).strip(),
            category="COMPLAINT",
            related_object=complaint,
        )
        NotificationService.notify_user(
            user=complaint.citizen,
            title=f"Complaint {complaint.reference_number} Assigned",
            message=f"Your complaint has been assigned to a field worker.",
            category="COMPLAINT",
            related_object=complaint,
        )

        return assignment

    @staticmethod
    @transaction.atomic
    def upload_media(
        complaint: Complaint,
        uploaded_by: CustomUser,
        file,
        media_type: str = "EVIDENCE",
        caption: str = "",
    ) -> ComplaintMedia:
        """Attach a file to a complaint and write a history entry."""
        media = ComplaintMedia.objects.create(
            complaint=complaint,
            file=file,
            media_type=media_type,
            uploaded_by=uploaded_by,
            caption=caption,
        )

        ComplaintHistory.objects.create(
            complaint=complaint,
            changed_by=uploaded_by,
            event_type="MEDIA_UPLOAD",
            old_value="",
            new_value=media_type,
            remarks=f"File: {file.name}",
        )
        return media

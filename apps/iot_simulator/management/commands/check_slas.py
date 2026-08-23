"""
Management command: check_slas
=================================
Scans all open complaints for SLA breaches and marks them.

Usage:
    python manage.py check_slas
    python manage.py check_slas --escalate   (also sends escalation notifications)
"""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Check and mark SLA breaches for open complaints."

    def add_arguments(self, parser):
        parser.add_argument(
            "--escalate", action="store_true",
            help="Also send escalation notifications for breached complaints."
        )

    def handle(self, *args, **options):
        from apps.complaints.models import Complaint, ComplaintHistory

        now = timezone.now()
        open_statuses = [
            Complaint.PENDING, Complaint.ASSIGNED, Complaint.ACCEPTED,
            Complaint.ON_SITE, Complaint.IN_PROGRESS, Complaint.REVIEW,
        ]

        newly_breached = 0
        already_breached = 0
        ok = 0

        qs = Complaint.objects.filter(
            status__in=open_statuses,
            sla_due_at__isnull=False,
        ).select_related("citizen", "department")

        for complaint in qs:
            if complaint.sla_due_at < now:
                if not complaint.sla_breached:
                    complaint.sla_breached = True
                    complaint.sla_breached_at = now
                    complaint.save(update_fields=["sla_breached", "sla_breached_at"])

                    ComplaintHistory.objects.create(
                        complaint=complaint,
                        event_type="REMARK",
                        old_value="",
                        new_value="SLA_BREACHED",
                        remarks=f"SLA deadline breached at {now.strftime('%Y-%m-%d %H:%M')}.",
                    )

                    if options.get("escalate"):
                        self._send_escalation(complaint)

                    newly_breached += 1
                else:
                    already_breached += 1
            else:
                ok += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"SLA Check complete: {newly_breached} newly breached, "
                f"{already_breached} already breached, {ok} within SLA."
            )
        )

    def _send_escalation(self, complaint):
        try:
            from apps.notifications.services import NotificationService
            NotificationService.notify_department_officers(
                department=complaint.department,
                title=f"⚠️ SLA Breach — {complaint.reference_number}",
                message=(
                    f"Complaint '{complaint.title}' (#{complaint.reference_number}) "
                    f"has breached its SLA deadline. Immediate action required."
                ),
                related_object=complaint,
            )
            NotificationService.notify_all_admins(
                title=f"[SLA Breach] {complaint.reference_number}",
                message=(
                    f"SLA breached for complaint '{complaint.title}' "
                    f"in department {complaint.department.name if complaint.department else 'N/A'}."
                ),
                related_object=complaint,
            )
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"  Notification error: {e}"))

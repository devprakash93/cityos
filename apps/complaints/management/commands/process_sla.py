import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.complaints.models import Complaint

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Processes all open complaints and marks them as breached if SLA deadline has passed.'

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Open complaints that have an SLA due date and have breached it
        breached_complaints = Complaint.objects.filter(
            status__in=[
                Complaint.PENDING, Complaint.ASSIGNED, Complaint.ACCEPTED, 
                Complaint.ON_SITE, Complaint.IN_PROGRESS, Complaint.REVIEW
            ],
            sla_due_at__lt=now,
            sla_breached=False
        )
        
        count = breached_complaints.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("No new SLA breaches detected."))
            return
            
        breached_complaints.update(
            sla_breached=True,
            sla_breached_at=now
        )
        
        self.stdout.write(self.style.WARNING(f"Marked {count} complaints as SLA breached!"))
        logger.info(f"SLA Process: Marked {count} complaints as breached.")

"""
apps/complaints/signals.py
===========================
Django signals for the complaints app.
Used to trigger side-effects without coupling models to services.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Complaint


@receiver(post_save, sender=Complaint)
def complaint_post_save(sender, instance, created, **kwargs):
    """
    Hook for post-save events. Actual business notifications
    are handled in ComplaintService (atomically with the transaction).
    This signal is reserved for lightweight, non-critical side-effects.
    """
    pass  # Notifications are dispatched from ComplaintService directly

"""Notifications URLs."""
from django.urls import path
from . import views

# Backward compatibility aliases
MarkAllReadView = views.NotificationMarkAllReadView
UnreadCountView = views.NotificationUnreadCountView

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/read/", views.NotificationMarkReadView.as_view(), name="notification-read"),
    path("mark-all-read/", views.NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", views.NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("announcements/", views.AnnouncementListView.as_view(), name="announcement-list"),
]

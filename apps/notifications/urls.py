"""Notifications URLs."""
from django.urls import path
from . import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<int:pk>/read/", views.NotificationMarkReadView.as_view(), name="notification-read"),
    path("mark-all-read/", views.MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("unread-count/", views.UnreadCountView.as_view(), name="notification-unread-count"),
    path("announcements/", views.AnnouncementListView.as_view(), name="announcement-list"),
]

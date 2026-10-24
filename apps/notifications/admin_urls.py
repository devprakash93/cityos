"""
apps/notifications/admin_urls.py
=================================
Authorized Administrative Announcements & Campaigns APIs.
"""
from django.urls import path
from . import views

urlpatterns = [
    path("", views.AdminAnnouncementListCreateView.as_view(), name="admin-announcements-list-create"),
    path("analytics/", views.AdminAnnouncementAnalyticsView.as_view(), name="admin-announcements-analytics"),
    path("<int:pk>/", views.AdminAnnouncementDetailView.as_view(), name="admin-announcements-detail"),
    path("<int:pk>/status/", views.AdminAnnouncementStatusView.as_view(), name="admin-announcements-status"),
]

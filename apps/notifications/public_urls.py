"""
apps/notifications/public_urls.py
==================================
Public Citizen Announcements APIs.
"""
from django.urls import path
from . import views

urlpatterns = [
    path("featured/", views.FeaturedAnnouncementsView.as_view(), name="announcements-featured"),
    path("", views.PublicAnnouncementListView.as_view(), name="announcements-list"),
    path("<int:pk>/impressions/", views.RecordImpressionView.as_view(), name="announcements-impressions"),
    path("<int:pk>/clicks/", views.RecordClickView.as_view(), name="announcements-clicks"),
    path("<str:slug_or_id>/", views.PublicAnnouncementDetailView.as_view(), name="announcements-detail"),
]

"""apps/accounts URL configuration."""
from django.urls import path
from . import views

urlpatterns = [
    # Users
    path("users/", views.UserListView.as_view(), name="user-list"),
    path("users/<int:pk>/", views.UserDetailView.as_view(), name="user-detail"),
    path("officer-workers/", views.OfficerWorkerListView.as_view(), name="officer-workers-list"),

    # Roles
    path("roles/", views.RoleListView.as_view(), name="role-list"),
    
    # Audit Logs
    path("activity-logs/", views.ActivityLogListView.as_view(), name="activity-log-list"),
]

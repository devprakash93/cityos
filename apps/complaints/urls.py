"""Complaints URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"tasks", views.TaskViewSet, basename="task")
router.register(r"worker/tasks", views.WorkerTaskViewSet, basename="worker-task")
router.register(r"", views.ComplaintViewSet, basename="complaint")

urlpatterns = [
    path("", include(router.urls)),
]

"""Dashboard URLs."""
from django.urls import path
from . import views

urlpatterns = [
    path("", views.DashboardView.as_view(), name="dashboard"),
    path("map/", views.OfficerMapDataView.as_view(), name="officer-map"),
]

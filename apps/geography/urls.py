"""apps/geography URL configuration."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("states", views.StateViewSet, basename="state")
router.register("districts", views.DistrictViewSet, basename="district")
router.register("cities", views.CityViewSet, basename="city")
router.register("zones", views.ZoneViewSet, basename="zone")
router.register("wards", views.WardViewSet, basename="ward")
router.register("facilities", views.FacilityViewSet, basename="facility")

urlpatterns = [path("", include(router.urls))]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("stations", views.AQIStationViewSet, basename="aqi-station")
router.register("alerts", views.PollutionAlertViewSet, basename="pollution-alert")

urlpatterns = [path("", include(router.urls))]

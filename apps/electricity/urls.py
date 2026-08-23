from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("zones", views.GridZoneViewSet, basename="grid-zone")
router.register("outages", views.PowerOutageViewSet, basename="power-outage")
router.register("notices", views.ElectricityNoticeViewSet, basename="electricity-notice")

urlpatterns = [path("", include(router.urls))]

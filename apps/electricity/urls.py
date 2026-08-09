from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("zones", views.GridZoneViewSet, basename="grid-zone")
router.register("outages", views.PowerOutageViewSet, basename="power-outage")

urlpatterns = [path("", include(router.urls))]

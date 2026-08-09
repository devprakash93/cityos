from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("zones", views.TrafficZoneViewSet, basename="traffic-zone")
router.register("incidents", views.TrafficIncidentViewSet, basename="traffic-incident")

urlpatterns = [path("", include(router.urls))]

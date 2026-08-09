from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("routes", views.BusRouteViewSet, basename="bus-route")
router.register("buses", views.BusViewSet, basename="bus")
router.register("schedules", views.BusScheduleViewSet, basename="bus-schedule")

urlpatterns = [path("", include(router.urls))]

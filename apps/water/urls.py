from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("sources", views.WaterSourceViewSet, basename="water-source")
router.register("alerts", views.WaterAlertViewSet, basename="water-alert")

urlpatterns = [path("", include(router.urls))]

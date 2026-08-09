from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("bins", views.WasteBinViewSet, basename="waste-bin")
router.register("routes", views.CollectionRouteViewSet, basename="collection-route")
router.register("logs", views.CollectionLogViewSet, basename="collection-log")

urlpatterns = [path("", include(router.urls))]

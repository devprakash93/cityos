from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("contacts", views.EmergencyContactViewSet, basename="emergency-contact")
router.register("incidents", views.EmergencyIncidentViewSet, basename="emergency-incident")
router.register("responders", views.ResponderViewSet, basename="responder")
router.register("alerts", views.EmergencyAlertViewSet, basename="emergency-alert")

urlpatterns = [
    path("controller/auth/", views.EmergencyControllerAuthView.as_view(), name="emergency-controller-auth"),
    path("controller/demo-call/", views.EmergencyDemoCallView.as_view(), name="emergency-controller-demo-call"),
    path("controller/dashboard/", views.EmergencyControllerDashboardView.as_view(), name="emergency-controller-dashboard"),
    path("controller/calls/<str:call_id>/action/", views.EmergencyControllerCallActionView.as_view(), name="emergency-controller-call-action"),
    path("", include(router.urls)),
]

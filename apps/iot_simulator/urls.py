from django.urls import path
from . import views

urlpatterns = [
    path("trigger/", views.SimulatorTickView.as_view(), name="simulator-trigger"),
    path("reset/", views.SimulatorResetView.as_view(), name="simulator-reset"),
    path("status/", views.SimulatorStatusView.as_view(), name="simulator-status"),
    path("demo-mode/", views.DemoModeConfigView.as_view(), name="simulator-demo-mode"),
    path("events/", views.SimulationEventView.as_view(), name="simulator-events"),
]

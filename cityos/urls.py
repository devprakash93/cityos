"""
CityOS root URL configuration.
API versioned under /api/
Documentation at /api/docs/ and /api/redoc/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Django admin
    path("admin/", admin.site.urls),

    # OpenAPI schema + docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # Application APIs
    path("api/auth/", include("apps.authentication.urls")),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/departments/", include("apps.departments.urls")),
    path("api/geography/", include("apps.geography.urls")),
    path("api/dashboard/", include("apps.dashboard.urls")),
    path("api/complaints/", include("apps.complaints.urls")),
    path("api/traffic/", include("apps.traffic.urls")),
    path("api/waste/", include("apps.waste.urls")),
    path("api/water/", include("apps.water.urls")),
    path("api/electricity/", include("apps.electricity.urls")),
    path("api/transport/", include("apps.transport.urls")),
    path("api/emergency/", include("apps.emergency.urls")),
    path("api/pollution/", include("apps.pollution.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/simulator/", include("apps.iot_simulator.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

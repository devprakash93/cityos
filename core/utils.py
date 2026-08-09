"""
core/utils.py
=============
Shared utility functions used across CityOS apps.
"""
import hashlib
import os
import uuid
from typing import Optional
from django.utils import timezone
from django.utils.deconstruct import deconstructible


def generate_unique_filename(original_filename: str) -> str:
    """
    Generate a collision-resistant filename while preserving the original
    file extension.

    Example: 'photo.jpg' → 'a3f2bc89-4d12-4a5e-9b3c-abc123456789.jpg'
    """
    ext = os.path.splitext(original_filename)[1].lower()
    return f"{uuid.uuid4()}{ext}"


@deconstructible
class media_upload_path:
    """
    Class for upload_to callables. Files are stored as:
        media/<subfolder>/<YYYY>/<MM>/<unique_name>
    """
    def __init__(self, subfolder: str):
        self.subfolder = subfolder

    def __call__(self, instance, filename):
        now = timezone.now()
        unique_name = generate_unique_filename(filename)
        return os.path.join(self.subfolder, str(now.year), f"{now.month:02d}", unique_name)


def success_response(data=None, message: str = "Success", status_code: int = 200) -> dict:
    """Standard success envelope used in service layers."""
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return payload


def get_client_ip(request) -> Optional[str]:
    """Extract the real client IP, respecting X-Forwarded-For."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def calculate_aqi(pm25: float, pm10: float, co2: float = 0, no2: float = 0, so2: float = 0) -> tuple[float, str]:
    """
    Simplified AQI calculation based on dominant pollutant.
    Returns (aqi_value: float, category: str).

    Categories: GOOD, MODERATE, UNHEALTHY, VERY_UNHEALTHY, HAZARDOUS
    """
    # Use PM2.5 as the dominant indicator
    aqi = pm25 * 4.0 + pm10 * 0.5

    if aqi <= 50:
        category = "GOOD"
    elif aqi <= 100:
        category = "MODERATE"
    elif aqi <= 150:
        category = "UNHEALTHY"
    elif aqi <= 200:
        category = "VERY_UNHEALTHY"
    else:
        category = "HAZARDOUS"

    return round(aqi, 2), category


def paginate_queryset(queryset, page: int = 1, page_size: int = 20):
    """Simple in-memory pagination for service-layer queries."""
    start = (page - 1) * page_size
    end = start + page_size
    total = queryset.count()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": queryset[start:end],
    }

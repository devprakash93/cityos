"""CityOS ASGI application entry point (for async / WebSocket support)."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cityos.settings.development")
application = get_asgi_application()

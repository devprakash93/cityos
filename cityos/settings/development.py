"""
CityOS Django Settings — Development (SQLite override for quick local start)
When MySQL is available, update .env with DB_* variables and this override can be removed.
"""
from .base import *  # noqa: F401, F403

DEBUG = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# --- SQLite fallback for development without MySQL ---
# Comment out this block when you have MySQL configured in .env
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "cityos_dev.sqlite3",  # noqa: F405
    }
}

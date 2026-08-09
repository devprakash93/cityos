"""
CityOS Django Settings — Production
"""
from .base import *  # noqa: F401, F403
import dj_database_url
import os

DEBUG = False

# In production, explicitly list allowed hosts
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])  # noqa: F405
if "RENDER_EXTERNAL_HOSTNAME" in os.environ:
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

# Database configuration for Render / production
if "DATABASE_URL" in os.environ:
    DATABASES["default"] = dj_database_url.config(  # noqa: F405
        conn_max_age=600,
        conn_health_checks=True,
    )

# HTTPS security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Strict CORS in production
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])  # noqa: F405

# Email: use SMTP in production
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
WHITENOISE_MANIFEST_STRICT = False

"""
CityOS Django Settings — Production
"""
from .base import *  # noqa: F401, F403

DEBUG = False

# In production, explicitly list allowed hosts
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")  # noqa: F405

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

"""
CityOS Django Settings — Production
"""
from .base import *  # noqa: F401, F403
import dj_database_url
import os

DEBUG = False

# Reverse proxy SSL header for Render / Cloudflare
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# In production, explicitly list allowed hosts or allow any with env override
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])  # noqa: F405
if "RENDER_EXTERNAL_HOSTNAME" in os.environ:
    ALLOWED_HOSTS.append(os.environ["RENDER_EXTERNAL_HOSTNAME"])

# Database configuration for Render / production
if "DATABASE_URL" in os.environ:
    DATABASES["default"] = dj_database_url.config(  # noqa: F405
        conn_max_age=600,
        conn_health_checks=True,
    )

# HTTPS security settings
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS and CSRF configurations for Cloudflare Pages and Render
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)  # noqa: F405
CORS_ALLOWED_ORIGINS = env.list(  # noqa: F405
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
)
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.pages\.dev$",
    r"^https:\/\/.*\.onrender\.com$",
]

CSRF_TRUSTED_ORIGINS = env.list(  # noqa: F405
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://*.pages.dev",
        "https://*.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
)

# Email: use SMTP in production
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
WHITENOISE_MANIFEST_STRICT = False

SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"

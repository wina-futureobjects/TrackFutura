"""
Production settings for Upsun deployment.
"""

from .settings import *
import os
import dj_database_url

# Override DEBUG for production
DEBUG = False

# Security settings for production
SECRET_KEY = os.getenv('PLATFORM_PROJECT_ENTROPY', SECRET_KEY)

# Database configuration for Upsun
if os.getenv('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.parse(os.getenv('DATABASE_URL'))
    }
else:
    # Fallback to individual environment variables
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DATABASE_NAME', 'postgres'),
            'USER': os.getenv('DATABASE_USERNAME', 'postgres'),
            'PASSWORD': os.getenv('DATABASE_PASSWORD', 'postgres'),
            'HOST': os.getenv('DATABASE_HOST', 'postgresql'),
            'PORT': os.getenv('DATABASE_PORT', '5432'),
        }
    }

# Static files for production
STATIC_ROOT = '/app/backend/staticfiles'
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Security settings for production
ALLOWED_HOSTS = [
    'trackfutura.futureobjects.io',
    'api.trackfutura.futureobjects.io',
    'localhost',
    '127.0.0.1',
    '.platformsh.site',
    '.upsun.app',
]

# Add dynamic hosts from Upsun environment
if os.getenv('PLATFORM_ROUTES'):
    try:
        import json
        routes = json.loads(os.getenv('PLATFORM_ROUTES'))
        for route_url in routes.keys():
            if route_url.startswith(('http://', 'https://')):
                from urllib.parse import urlparse
                parsed = urlparse(route_url)
                if parsed.hostname:
                    ALLOWED_HOSTS.append(parsed.hostname)
    except (json.JSONDecodeError, AttributeError):
        pass

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    'https://trackfutura.futureobjects.io',
    'https://api.trackfutura.futureobjects.io',
]

# Add dynamic CORS origins from Upsun
if os.getenv('PLATFORM_ROUTES'):
    try:
        import json
        routes = json.loads(os.getenv('PLATFORM_ROUTES'))
        for route_url in routes.keys():
            if route_url.startswith('https://'):
                CORS_ALLOWED_ORIGINS.append(route_url.rstrip('/'))
    except (json.JSONDecodeError, AttributeError):
        pass

# CSRF settings for production - Keep permissive to avoid conflicts
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS.copy()
CSRF_COOKIE_SECURE = False  # Keep permissive for deployment
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = None

# Security headers for production - Relaxed for deployment
SECURE_SSL_REDIRECT = False  # Let proxy handle SSL
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_SECONDS = 0  # Disable HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_CONTENT_TYPE_NOSNIFF = False
SECURE_BROWSER_XSS_FILTER = False
SECURE_REFERRER_POLICY = None

# Session security - Relaxed for deployment
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False
SESSION_COOKIE_SAMESITE = None

# Logging configuration for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# BrightData configuration for production
BRIGHTDATA_BASE_URL = os.getenv('BRIGHTDATA_BASE_URL', 'https://trackfutura.futureobjects.io')
BRIGHTDATA_WEBHOOK_TOKEN = os.getenv('BRIGHTDATA_WEBHOOK_TOKEN', '8af6995e-3baa-4b69-9df7-8d7671e621eb')

# OpenAI configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Email configuration for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)

# Cache configuration for production
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'default-cache',
        'TIMEOUT': 300,
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
            'CULL_FREQUENCY': 3,
        }
    },
    'webhook_cache': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'webhook-cache',
        'TIMEOUT': 3600,
        'OPTIONS': {
            'MAX_ENTRIES': 10000,
            'CULL_FREQUENCY': 3,
        }
    }
}

# Webhook configuration
WEBHOOK_RATE_LIMIT = int(os.environ.get('WEBHOOK_RATE_LIMIT', 100))
WEBHOOK_MAX_TIMESTAMP_AGE = int(os.environ.get('WEBHOOK_MAX_TIMESTAMP_AGE', 300))
WEBHOOK_MAX_EVENTS = int(os.environ.get('WEBHOOK_MAX_EVENTS', 1000))
WEBHOOK_METRICS_RETENTION = int(os.environ.get('WEBHOOK_METRICS_RETENTION', 3600))
WEBHOOK_ERROR_THRESHOLD = float(os.environ.get('WEBHOOK_ERROR_THRESHOLD', 0.1))
WEBHOOK_RESPONSE_TIME_THRESHOLD = float(os.environ.get('WEBHOOK_RESPONSE_TIME_THRESHOLD', 5.0))
WEBHOOK_ENABLE_CERT_PINNING = os.environ.get('WEBHOOK_ENABLE_CERT_PINNING', 'False').lower() == 'true'

# Webhook IP whitelist
WEBHOOK_ALLOWED_IPS = [ip.strip() for ip in os.environ.get('WEBHOOK_ALLOWED_IPS', '').split(',') if ip.strip()]

print(f"Production settings loaded. BRIGHTDATA_BASE_URL: {BRIGHTDATA_BASE_URL}")

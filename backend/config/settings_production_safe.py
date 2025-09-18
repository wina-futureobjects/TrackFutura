# Safe production settings for demo deployment
import os
from .settings import *

# Override problematic settings for stable demo
DEBUG = True  # Enable debug for demo to see errors
ALLOWED_HOSTS = ['*']

# Simplified database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('PGDATABASE', 'main'),
        'USER': os.environ.get('PGUSER', 'main'),
        'PASSWORD': os.environ.get('PGPASSWORD', ''),
        'HOST': os.environ.get('PGHOST', 'localhost'),
        'PORT': os.environ.get('PGPORT', '5432'),
        'OPTIONS': {
            'sslmode': 'prefer',
        },
    }
}

# Safe API keys with fallbacks
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', 'demo-key-not-configured')
APIFY_TOKEN = os.environ.get('APIFY_TOKEN', 'demo-token-not-configured')
APIFY_USER_ID = os.environ.get('APIFY_USER_ID', 'demo-user-not-configured')

# Disable problematic middleware for demo stability
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Enable CORS for demo
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = [
    "https://trackfutura.futureobjects.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Logging configuration for debugging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
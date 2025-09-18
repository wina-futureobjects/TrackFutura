"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.http import JsonResponse, HttpResponse
from django.db import connection
from django.conf import settings
from django.conf.urls.static import static


def api_status(request):
    """Simple API status endpoint for root path"""
    return JsonResponse({
        'status': 'Track-Futura API is running',
        'version': '1.0',
        'endpoints': {
            'users': '/api/users/',
            'reports': '/api/reports/',
            'analytics': '/api/analytics/',
            'admin': '/admin/',
        }
    })

def health_check(request):
    """Health check endpoint for Docker container monitoring"""
    try:
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")

        return JsonResponse({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=503)

def favicon_view(request):
    """Return empty response for favicon to prevent 404s"""
    return HttpResponse(status=204)  # No Content



urlpatterns = [
    path("", api_status, name="api_status"),  # Handle root path
    path("api/health/", health_check, name="health_check"),  # Health check endpoint
    path("health/", health_check, name="health_check_alt"),  # Alternative health check for Upsun
    path("favicon.ico", favicon_view, name="favicon"),  # Handle favicon
    path("admin/", admin.site.urls),
    path("api/users/", include("users.urls")),
    path("api/admin/", include("users.urls_admin")),
    path("api/reports/", include("reports.urls")),
    path("api/analytics/", include("analytics.urls")),
    path("api/data-collector/", include("data_collector.urls")),
    path("api/query-builder/", include("query_builder.urls")),
    path("api/instagram_data/", include("instagram_data.urls")),
    path("api/instagram-data/", include("instagram_data.urls")),  # Support both formats
    path("api/facebook-data/", include("facebook_data.urls")),
    path("api/track-accounts/", include("track_accounts.urls")),
    path("api/linkedin-data/", include("linkedin_data.urls")),
    path("api/tiktok-data/", include("tiktok_data.urls")),
    path("api/brightdata/", include("brightdata_integration.urls")),
    path("api/scrapy/", include("scrapy_integration.urls")),  # New Scrapy-based scraper
    path("api/chat/", include("chat.urls")),
    path("api/workflow/", include("workflow.urls")),
    path("api/", RedirectView.as_view(url="/api/users/", permanent=False)),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import os


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    Health check endpoint for Upsun deployment
    """
    try:
        # Check database connectivity
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        
        # Check if we're in production
        is_production = os.getenv('PLATFORM_APPLICATION_NAME') is not None
        
        return JsonResponse({
            'status': 'healthy',
            'environment': 'production' if is_production else 'development',
            'database': 'connected',
            'platform': 'upsun' if is_production else 'local'
        })
    except Exception as e:
        return JsonResponse({
            'status': 'unhealthy',
            'error': str(e)
        }, status=500)

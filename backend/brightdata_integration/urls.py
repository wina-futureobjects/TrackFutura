from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'configs', views.BrightdataConfigViewSet)
router.register(r'config', views.BrightdataConfigViewSet, basename='brightdataconfig-alt')  # Support both formats
router.register(r'requests', views.ScraperRequestViewSet)
router.register(r'scraper-requests', views.ScraperRequestViewSet, basename='scraperrequest-alt')  # Support both formats
router.register(r'batch-jobs', views.BatchScraperJobViewSet)
router.register(r'notifications', views.BrightdataNotificationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/', views.brightdata_webhook, name='brightdata_webhook'),
    path('webhook', views.brightdata_webhook, name='brightdata_webhook_no_slash'),  # Handle without trailing slash
    path('webhook/test/', views.webhook_test, name='webhook_test'),  # Test endpoint
    path('notify/', views.brightdata_notify, name='brightdata_notify'),
    path('job-status/', views.brightdata_notify, name='brightdata_job_status'),  # Alternative endpoint for job status
    path('comments/scrape/', views.scrape_comments, name='scrape_comments'),

    # Webhook monitoring endpoints
    path('webhook-metrics/', views.webhook_metrics, name='webhook_metrics'),
    path('webhook/metrics/', views.webhook_metrics, name='webhook_metrics_alt'),
    path('webhook/health/', views.webhook_health, name='webhook_health'),
    path('webhook/events/', views.webhook_events, name='webhook_events'),
    path('webhook/alerts/', views.webhook_alerts, name='webhook_alerts'),
    path('webhook/analytics/', views.webhook_analytics, name='webhook_analytics'),
    path('webhook/test/', views.test_webhook_security, name='test_webhook_security'),
]

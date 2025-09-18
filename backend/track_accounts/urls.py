from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'sources', views.TrackSourceViewSet, basename='track-source')
# Keep accounts endpoint for backward compatibility - point to same viewset
router.register(r'accounts', views.TrackSourceViewSet, basename='track-account')
router.register(r'reports', views.ReportFolderViewSet, basename='report-folder')
router.register(r'report-folders', views.UnifiedRunFolderViewSet, basename='unified-run-folder')

urlpatterns = [
    path('', include(router.urls)),
] 
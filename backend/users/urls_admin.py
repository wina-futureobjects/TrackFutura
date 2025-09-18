from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminUserViewSet, AdminOrganizationViewSet, AdminStatsView, AdminCompanyViewSet

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='admin-user')
router.register(r'organizations', AdminOrganizationViewSet, basename='admin-organization')
router.register(r'companies', AdminCompanyViewSet, basename='admin-company')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
] 
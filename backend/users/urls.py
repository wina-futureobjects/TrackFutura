from django.urls import path
from .views import (
    RegisterView, CustomAuthToken, UserProfileView,
    ProjectListCreateView, ProjectDetailView,
    OrganizationListCreateView, OrganizationDetailView,
    OrganizationMembershipView, OrganizationMembershipDetailView,
    UserSearchView, OrganizationStatsView, ProjectStatsView, CSRFTokenView,
    CurrentUserView, PlatformViewSet, ServiceViewSet, PlatformServiceViewSet,
    AvailablePlatformsViewSet, UnifiedUserRecordViewSet
)
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomAuthToken.as_view(), name='login'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('csrf-token/', CSRFTokenView.as_view(), name='csrf-token'),

    # User search
    path('search/', UserSearchView.as_view(), name='user-search'),

    # Organization routes
    path('organizations/', OrganizationListCreateView.as_view(), name='organization-list'),
    path('organizations/<int:pk>/', OrganizationDetailView.as_view(), name='organization-detail'),
    path('organizations/<int:organization_id>/members/', OrganizationMembershipView.as_view(), name='organization-members'),
    path('organizations/<int:organization_id>/members/<int:pk>/', OrganizationMembershipDetailView.as_view(), name='organization-member-detail'),
    path('organizations/<int:organization_id>/stats/', OrganizationStatsView.as_view(), name='organization-stats'),

    # Project routes
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:project_id>/stats/', ProjectStatsView.as_view(), name='project-stats'),
]

# Platform and Service Management URLs
router.register(r'platforms', PlatformViewSet, basename='platform')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'platform-services', PlatformServiceViewSet, basename='platform-service')
router.register(r'available-platforms', AvailablePlatformsViewSet, basename='available-platform')
router.register(r'unified-users', UnifiedUserRecordViewSet, basename='unified-user')

# Include router URLs
urlpatterns += router.urls

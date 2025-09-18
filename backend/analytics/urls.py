from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
# Add analytics viewsets here

urlpatterns = [
    path('', include(router.urls)),
    # Add other analytics-specific URLs here
] 
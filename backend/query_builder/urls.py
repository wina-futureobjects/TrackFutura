from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
# Add query builder viewsets here

urlpatterns = [
    path('', include(router.urls)),
    # Add other query builder specific URLs here
] 
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkflowViewSet, WorkflowTaskViewSet, ScheduledScrapingTaskViewSet, ScrapingRunViewSet, ScrapingJobViewSet

router = DefaultRouter()
router.register(r'input-collections', WorkflowViewSet, basename='input-collection')
router.register(r'workflow-tasks', WorkflowTaskViewSet, basename='workflow-task')
router.register(r'scheduled-tasks', ScheduledScrapingTaskViewSet, basename='scheduled-task')
router.register(r'scraping-runs', ScrapingRunViewSet, basename='scraping-run')
router.register(r'scraping-jobs', ScrapingJobViewSet, basename='scraping-job')

urlpatterns = [
    path('', include(router.urls)),
] 
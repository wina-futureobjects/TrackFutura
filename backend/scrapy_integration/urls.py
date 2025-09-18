from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, chat_views

router = DefaultRouter()
router.register(r'configs', views.ScrapyConfigViewSet)
router.register(r'jobs', views.ScrapyJobViewSet)
router.register(r'results', views.ScrapyResultViewSet)
router.register(r'chat/threads', chat_views.ChatThreadViewSet, basename='chat-threads')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/ai-analysis/', views.ai_analysis_view, name='ai_analysis'),
    path('api/enhanced-sentiment-analysis/', views.enhanced_sentiment_analysis_view, name='enhanced_sentiment_analysis'),
    path('api/ai-chat-analysis/', chat_views.ai_chat_analysis_view, name='ai_chat_analysis'),
    path('api/project-data-summary/', chat_views.project_data_summary_view, name='project_data_summary'),
    path('dashboard/', views.scraping_dashboard, name='scraping_dashboard'),
    path('stats/platform/', views.platform_stats, name='platform_stats'),
]
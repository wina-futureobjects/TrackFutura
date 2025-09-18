from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'posts', views.InstagramPostViewSet, basename='instagram-posts')
router.register(r'folders', views.FolderViewSet, basename='instagram-folders')
router.register(r'comments', views.InstagramCommentViewSet, basename='instagram-comments')
router.register(r'comment-scraping-jobs', views.CommentScrapingJobViewSet, basename='instagram-comment-scraping-jobs')

urlpatterns = [
    path('', include(router.urls)),
] 
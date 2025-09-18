from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'posts', views.FacebookPostViewSet, basename='facebook-post')
router.register(r'folders', views.FolderViewSet, basename='folder')
router.register(r'comments', views.FacebookCommentViewSet, basename='facebook-comment')
router.register(r'comment-scraping-jobs', views.CommentScrapingJobViewSet, basename='comment-scraping-job')

urlpatterns = [
    path('', include(router.urls)),
] 
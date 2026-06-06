from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView,
    UserRegistrationView,
    UserProfileView,
    PostListCreateView,
    PostDetailView,
    CollabRequestListCreateView,
    CollabRequestStatusUpdateView,
    NotificationListView,
    PostSEOTitleView,
    PostCommentsSummaryView,
    SystemStatusView
)

urlpatterns = [
    # Authentication routes
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', UserRegistrationView.as_view(), name='user_register'),
    
    # Creator Profile route
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    
    # Posts CRUD routes (MySQL)
    path('posts/', PostListCreateView.as_view(), name='post_list_create'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    
    # Collaboration Request routes (MongoDB / JSON fallback)
    path('collab/', CollabRequestListCreateView.as_view(), name='collab_list_create'),
    path('collab/<str:doc_id>/status/', CollabRequestStatusUpdateView.as_view(), name='collab_status_update'),
    
    # Notifications route (MongoDB / JSON fallback)
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    
    # Gemini AI routes
    path('posts/<int:pk>/seo/', PostSEOTitleView.as_view(), name='post_seo_title'),
    path('posts/<int:pk>/comments-summary/', PostCommentsSummaryView.as_view(), name='post_comments_summary'),
    
    # System Status check route
    path('status/', SystemStatusView.as_view(), name='system_status'),
]

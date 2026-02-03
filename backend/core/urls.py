from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'applications', views.OpenCourtApplicationViewSet)
router.register(r'video-feedback', views.VideoFeedbackViewSet)  # ⭐ NEW

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/user/', views.current_user, name='current_user'),
    path('upload-excel/', views.upload_excel, name='upload_excel'),
    path('dashboard-stats/', views.dashboard_stats, name='dashboard_stats'),
    path('police-stations/', views.police_stations, name='police_stations'),
    path('categories/', views.categories, name='categories'),
    
    # Staff Management Endpoints
    path('staff/', views.staff_management, name='staff_management'),
    path('staff/<int:user_id>/', views.staff_detail, name='staff_detail'),
    path('divisions/', views.divisions_list, name='divisions_list'),
    
    # ⚡ NEW: Export endpoint (no pagination limit)
    path('export-applications/', views.export_applications, name='export_applications'),
    
    # Video Feedback
    path('video-feedback-stats/', views.video_feedback_stats, name='video_feedback_stats'),
]
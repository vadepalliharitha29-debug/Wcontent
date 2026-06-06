from django.contrib import admin
from .models import UserProfile, Post

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'creator_type', 'portfolio_url', 'created_at']
    search_fields = ['user__username', 'creator_type']
    list_filter = ['creator_type']

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'status', 'created_at']
    search_fields = ['title', 'content', 'author__username']
    list_filter = ['status', 'created_at']

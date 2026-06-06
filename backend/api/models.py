from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

# 1. UserProfile Model (relational data in MySQL)
class UserProfile(models.Model):
    CREATOR_CHOICES = [
        ('video', 'Video Creator'),
        ('writer', 'Writer / Blogger'),
        ('podcaster', 'Podcaster'),
        ('designer', 'Designer / Artist'),
        ('other', 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    bio = models.TextField(blank=True, default='')
    creator_type = models.CharField(max_length=20, choices=CREATOR_CHOICES, default='other')
    portfolio_url = models.URLField(blank=True, default='')
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"


# 2. Post Model (relational data in MySQL)
class Post(models.Model):
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Published', 'Published'),
        ('Scheduled', 'Scheduled'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=200)
    content = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft')
    
    # These will be populated by the Google Gemini AI
    seo_title_suggestion = models.CharField(max_length=250, blank=True, default='')
    comments_summary = models.TextField(blank=True, default='')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


# ----------------------------------------------------
# SIGNALS: Auto-create UserProfile when a User is made
# ----------------------------------------------------
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically creates a UserProfile object when a new Django User is saved.
    This guarantees that every user has an associated profile record.
    """
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """
    Saves the user profile whenever the user object is updated.
    """
    instance.profile.save()

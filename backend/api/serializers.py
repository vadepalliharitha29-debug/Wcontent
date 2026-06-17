from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, Post
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

# Custom JWT Serializer to add profile info to token
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['bio'] = user.profile.bio
        token['creator_type'] = user.profile.creator_type
        token['portfolio_url'] = user.profile.portfolio_url
        
        if user.profile.profile_picture:
            token['profile_picture'] = user.profile.profile_picture.url
        else:
            token['profile_picture'] = ''
            
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Include profile details in auth response
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['creator_type'] = self.user.profile.creator_type
        data['bio'] = self.user.profile.bio
        data['portfolio_url'] = self.user.profile.portfolio_url
        
        if self.user.profile.profile_picture:
            data['profile_picture'] = self.user.profile.profile_picture.url
        else:
            data['profile_picture'] = ''
            
        return data


# User Profile Serializer
class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'bio', 'creator_type', 'portfolio_url', 'profile_picture', 'created_at']


# User Registration Serializer
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    creator_type = serializers.ChoiceField(choices=UserProfile.CREATOR_CHOICES, write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'creator_type']

    def create(self, validated_data):
        creator_type = validated_data.pop('creator_type', 'other')
        
        # Create django user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password']
        )
        
        # Update profile creator type
        profile = user.profile
        profile.creator_type = creator_type
        profile.save()
        
        return user


# Post Serializer
class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'title', 'content', 
            'status', 'seo_title_suggestion', 'comments_summary', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'seo_title_suggestion', 'comments_summary']


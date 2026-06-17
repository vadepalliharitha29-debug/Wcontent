from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView
from datetime import datetime

from .models import UserProfile, Post
from .serializers import (
    UserRegistrationSerializer, 
    UserProfileSerializer, 
    PostSerializer, 
    CustomTokenObtainPairSerializer
)
from .db_fallback import ResilientMongoStore
from .ai_utils import generate_seo_title, summarize_comments

# DB Store client instance
db_store = ResilientMongoStore()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Token view for JWT login containing user profile details."""
    serializer_class = CustomTokenObtainPairSerializer


class UserRegistrationView(generics.CreateAPIView):
    """User signup endpoint."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve and edit user profile."""
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user.profile


class PostListCreateView(generics.ListCreateAPIView):
    """List or create posts."""
    serializer_class = PostSerializer

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """View/edit/delete a post."""
    serializer_class = PostSerializer

    def get_queryset(self):
        return Post.objects.filter(author=self.request.user)


class CollabRequestListCreateView(APIView):
    """Manage collaboration requests."""
    def get(self, request):
        username = request.user.username
        sent_requests = db_store.get_documents("collaboration_requests", {"sender": username})
        received_requests = db_store.get_documents("collaboration_requests", {"recipient": username})
        
        return Response({
            "sent": sent_requests,
            "received": received_requests
        })

    def post(self, request):
        username = request.user.username
        recipient_username = request.data.get("recipient")
        message = request.data.get("message", "")
        project_details = request.data.get("project_details", "")

        if not recipient_username:
            return Response({"error": "Recipient username is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if recipient user exists
        if not User.objects.filter(username=recipient_username).exists():
            return Response({"error": f"User '{recipient_username}' does not exist."}, status=status.HTTP_404_NOT_FOUND)

        if recipient_username == username:
            return Response({"error": "You cannot send a collaboration request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        collab_doc = {
            "sender": username,
            "recipient": recipient_username,
            "message": message,
            "project_details": project_details,
            "status": "Pending",
            "created_at": datetime.utcnow()
        }

        doc_id = db_store.insert_document("collaboration_requests", collab_doc)
        
        # Send notification
        notification_doc = {
            "recipient": recipient_username,
            "message": f"New collaboration request from {username}!",
            "type": "collab",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        db_store.insert_document("notifications", notification_doc)

        return Response({
            "message": "Collaboration request sent successfully.",
            "id": doc_id,
            "status": "Pending"
        }, status=status.HTTP_201_CREATED)


class CollabRequestStatusUpdateView(APIView):
    """Accept or reject collaboration requests."""
    def put(self, request, doc_id):
        new_status = request.data.get("status")
        if new_status not in ["Accepted", "Rejected"]:
            return Response({"error": "Invalid status. Must be Accepted or Rejected."}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve request
        collabs = db_store.get_documents("collaboration_requests", {"id": doc_id})
        if not collabs:
            collabs = db_store.get_documents("collaboration_requests")
            collabs = [c for c in collabs if c.get("id") == doc_id]
            
        if not collabs:
            return Response({"error": "Collaboration request not found."}, status=status.HTTP_404_NOT_FOUND)
        
        collab_req = collabs[0]
        
        # Verify permissions
        if collab_req.get("recipient") != request.user.username:
            return Response({"error": "You do not have permission to modify this request."}, status=status.HTTP_403_FORBIDDEN)

        updated = db_store.update_document("collaboration_requests", doc_id, {"status": new_status})
        if not updated:
            return Response({"error": "Database update failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Send notification to sender
        notification_doc = {
            "recipient": collab_req.get("sender"),
            "message": f"{request.user.username} has {new_status.lower()} your collaboration request.",
            "type": "collab_response",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        db_store.insert_document("notifications", notification_doc)

        return Response({"message": f"Collaboration request {new_status.lower()} successfully."})


class NotificationListView(APIView):
    """Retrieve and clear user notifications."""
    def get(self, request):
        username = request.user.username
        notifications = db_store.get_documents("notifications", {"recipient": username})
        notifications = sorted(notifications, key=lambda x: x.get("created_at", ""), reverse=True)
        return Response(notifications)

    def put(self, request):
        username = request.user.username
        unread_notifications = db_store.get_documents("notifications", {"recipient": username, "is_read": False})
        
        updated_count = 0
        for notification in unread_notifications:
            doc_id = notification.get("id")
            if doc_id:
                db_store.update_document("notifications", doc_id, {"is_read": True})
                updated_count += 1
                
        return Response({"message": f"Marked {updated_count} notifications as read."})


class PostSEOTitleView(APIView):
    """Generate and save Gemini SEO titles."""
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk, author=request.user)
        
        if len(post.content.strip()) < 20:
            return Response(
                {"error": "Content is too short to generate a high quality SEO title recommendation. Add more details first!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        ai_suggestion = generate_seo_title(post.content)
        
        post.seo_title_suggestion = ai_suggestion
        post.save()

        return Response({
            "post_id": post.id,
            "seo_title_suggestion": ai_suggestion
        })


class PostCommentsSummaryView(APIView):
    """Generate and save Gemini comments sentiment analysis."""
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk, author=request.user)
        comments = request.data.get("comments", [])

        if not comments:
            return Response({"error": "No comments list provided to summarize."}, status=status.HTTP_400_BAD_REQUEST)
        
        summary_result = summarize_comments(comments)

        post.comments_summary = summary_result
        post.save()

        return Response({
            "post_id": post.id,
            "comments_summary": summary_result
        })


class SystemStatusView(APIView):
    """Check status of MongoDB / Fallback local store connection."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "timestamp": datetime.utcnow().isoformat(),
            "mongodb_connected": not db_store.is_using_fallback(),
            "database_mode": "Local JSON Cache (MongoDB Offline)" if db_store.is_using_fallback() else "Cloud/Local MongoDB Connection Active"
        })

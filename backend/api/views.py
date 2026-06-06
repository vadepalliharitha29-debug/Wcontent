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

# Instantiate the resilient database wrapper as a module-level singleton.
# This prevents opening database socket connections on every single request.
db_store = ResilientMongoStore()


# ----------------------------------------------------
# 1. AUTHENTICATION VIEWS
# ----------------------------------------------------

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Overridden JWT Login view that uses our customized serializer
    to return user profiles directly inside the token and response.
    """
    serializer_class = CustomTokenObtainPairSerializer


class UserRegistrationView(generics.CreateAPIView):
    """
    Allows guest users to register a new account.
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Allows users to view and update their creator profiles.
    """
    serializer_class = UserProfileSerializer

    def get_object(self):
        # Always return the profile of the currently logged-in user
        return self.request.user.profile


# ----------------------------------------------------
# 2. POST VIEWS (MySQL Database)
# ----------------------------------------------------

class PostListCreateView(generics.ListCreateAPIView):
    """
    List creator posts or create a new one.
    """
    serializer_class = PostSerializer

    def get_queryset(self):
        # Creators should only see their own posts
        return Post.objects.filter(author=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Associate the post with the authenticated user automatically
        serializer.save(author=self.request.user)


class PostDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Manage, update, or delete a specific post.
    """
    serializer_class = PostSerializer

    def get_queryset(self):
        # Creators can only manipulate their own posts
        return Post.objects.filter(author=self.request.user)


# ----------------------------------------------------
# 3. COLLABORATION REQUEST VIEWS (MongoDB / JSON Fallback)
# ----------------------------------------------------

class CollabRequestListCreateView(APIView):
    """
    Create a collaboration request document or list requests.
    """
    def get(self, request):
        username = request.user.username
        # Find collab requests where user is either sender or recipient
        # MongoDB queries are structured as dicts
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
        
        # Verify the recipient user exists in our relational database
        if not User.objects.filter(username=recipient_username).exists():
            return Response({"error": f"User '{recipient_username}' does not exist."}, status=status.HTTP_404_NOT_FOUND)

        if recipient_username == username:
            return Response({"error": "You cannot send a collaboration request to yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # Create Collab Document Structure
        collab_doc = {
            "sender": username,
            "recipient": recipient_username,
            "message": message,
            "project_details": project_details,
            "status": "Pending",  # Pending, Accepted, Rejected
            "created_at": datetime.utcnow()
        }

        # Insert to Mongo or JSON fallback
        doc_id = db_store.insert_document("collaboration_requests", collab_doc)
        
        # Also generate a notification document for the recipient
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
    """
    Update collaboration request status (Accept/Reject).
    """
    def put(self, request, doc_id):
        new_status = request.data.get("status")  # "Accepted" or "Rejected"
        if new_status not in ["Accepted", "Rejected"]:
            return Response({"error": "Invalid status. Must be Accepted or Rejected."}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve request details to verify recipient
        collabs = db_store.get_documents("collaboration_requests", {"id": doc_id})
        if not collabs:
            # If not found via our custom JSON ID, try MongoDB ObjectID format (for MongoDB)
            collabs = db_store.get_documents("collaboration_requests")
            collabs = [c for c in collabs if c.get("id") == doc_id]
            
        if not collabs:
            return Response({"error": "Collaboration request not found."}, status=status.HTTP_404_NOT_FOUND)
        
        collab_req = collabs[0]
        
        # Verify permissions: only recipient can accept/reject
        if collab_req.get("recipient") != request.user.username:
            return Response({"error": "You do not have permission to modify this request."}, status=status.HTTP_403_FORBIDDEN)

        # Perform update
        updated = db_store.update_document("collaboration_requests", doc_id, {"status": new_status})
        if not updated:
            return Response({"error": "Database update failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Notify the sender of the choice
        notification_doc = {
            "recipient": collab_req.get("sender"),
            "message": f"{request.user.username} has {new_status.lower()} your collaboration request.",
            "type": "collab_response",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        db_store.insert_document("notifications", notification_doc)

        return Response({"message": f"Collaboration request {new_status.lower()} successfully."})


# ----------------------------------------------------
# 4. NOTIFICATION VIEWS (MongoDB / JSON Fallback)
# ----------------------------------------------------

class NotificationListView(APIView):
    """
    Fetch notifications for current user, and mark them as read.
    """
    def get(self, request):
        username = request.user.username
        notifications = db_store.get_documents("notifications", {"recipient": username})
        # Sort notifications by created_at desc (newest first)
        notifications = sorted(notifications, key=lambda x: x.get("created_at", ""), reverse=True)
        return Response(notifications)

    def put(self, request):
        # Mark all unread notifications as read
        username = request.user.username
        unread_notifications = db_store.get_documents("notifications", {"recipient": username, "is_read": False})
        
        updated_count = 0
        for notification in unread_notifications:
            doc_id = notification.get("id")
            if doc_id:
                db_store.update_document("notifications", doc_id, {"is_read": True})
                updated_count += 1
                
        return Response({"message": f"Marked {updated_count} notifications as read."})


# ----------------------------------------------------
# 5. GOOGLE GEMINI AI VIEWS
# ----------------------------------------------------

class PostSEOTitleView(APIView):
    """
    Triggers Google Gemini LLM to generate an SEO title based on post content.
    Saves the recommended title directly into MySQL database record.
    """
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk, author=request.user)
        
        # Check if content is too short
        if len(post.content.strip()) < 20:
            return Response(
                {"error": "Content is too short to generate a high quality SEO title recommendation. Add more details first!"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Query Google Gemini
        ai_suggestion = generate_seo_title(post.content)
        
        # Save recommendation inside post model record (MySQL)
        post.seo_title_suggestion = ai_suggestion
        post.save()

        return Response({
            "post_id": post.id,
            "seo_title_suggestion": ai_suggestion
        })


class PostCommentsSummaryView(APIView):
    """
    Triggers Google Gemini LLM to summarize user comments.
    Saves the output summary inside the MySQL database post record.
    """
    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk, author=request.user)
        comments = request.data.get("comments", [])

        if not comments:
            return Response({"error": "No comments list provided to summarize."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Call Google Gemini
        summary_result = summarize_comments(comments)

        # Save summary in post model record (MySQL)
        post.comments_summary = summary_result
        post.save()

        return Response({
            "post_id": post.id,
            "comments_summary": summary_result
        })


# ----------------------------------------------------
# 6. SYSTEM DB MONITOR VIEW
# ----------------------------------------------------

class SystemStatusView(APIView):
    """
    Exposes connectivity status of the NoSQL database fallback.
    Can be loaded by guest users or the dashboard to verify health.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "timestamp": datetime.utcnow().isoformat(),
            "mongodb_connected": not db_store.is_using_fallback(),
            "database_mode": "Local JSON Cache (MongoDB Offline)" if db_store.is_using_fallback() else "Cloud/Local MongoDB Connection Active"
        })

import os
import json
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import AccessToken

from api.models import UserProfile, Post
from api.db_fallback import ResilientMongoStore, FALLBACK_FILE_PATH

# 1. TEST CASE FOR USER REGISTRATION & DJANGO SIGNALS
class UserAuthTests(APITestCase):
    def test_user_registration_creates_profile(self):
        """
        Verify that registering a new user creates a User instance 
        and automatically creates an associated UserProfile via Django Signals.
        """
        url = '/api/auth/register/'
        data = {
            "username": "tester",
            "email": "tester@example.com",
            "password": "SecurePassword123",
            "creator_type": "writer"
        }
        
        response = self.client.post(url, data, format='json')
        
        # Check registration succeeded
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user was saved in MySQL User table
        user_exists = User.objects.filter(username="tester").exists()
        self.assertTrue(user_exists)
        
        # Verify profile was automatically created by the post_save signal
        user = User.objects.get(username="tester")
        self.assertIsNotNone(user.profile)
        self.assertEqual(user.profile.creator_type, "writer")


# 2. TEST CASE FOR CUSTOM JWT METADATA CLAIMS
class JWTClaimsTests(APITestCase):
    def setUp(self):
        # Create a test user in database
        self.user = User.objects.create_user(
            username="jwt_tester",
            email="jwttest@example.com",
            password="testpassword"
        )
        # Update profile details
        profile = self.user.profile
        profile.bio = "I am a test creator."
        profile.creator_type = "podcaster"
        profile.portfolio_url = "https://myportfolio.com"
        profile.save()

    def test_custom_jwt_contains_profile_metadata(self):
        """
        Asserts that requesting a login token returns access and refresh tokens,
        and that decoding the access token contains our custom profile claims.
        """
        url = '/api/auth/login/'
        data = {
            "username": "jwt_tester",
            "password": "testpassword"
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Assert tokens are returned
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Assert profile data was returned in HTTP login body
        self.assertEqual(response.data['email'], "jwttest@example.com")
        self.assertEqual(response.data['creator_type'], "podcaster")
        self.assertEqual(response.data['bio'], "I am a test creator.")
        
        # Decode access token claims using SimpleJWT's decoder
        access_token = response.data['access']
        decoded_token = AccessToken(access_token)
        
        # Assert custom claims are present in token payload
        self.assertEqual(decoded_token['username'], "jwt_tester")
        self.assertEqual(decoded_token['email'], "jwttest@example.com")
        self.assertEqual(decoded_token['bio'], "I am a test creator.")
        self.assertEqual(decoded_token['creator_type'], "podcaster")
        self.assertEqual(decoded_token['portfolio_url'], "https://myportfolio.com")


# 3. TEST CASE FOR RESILIENT DATABASE FALLBACK (MongoDB Offline)
class DatabaseFallbackTests(TestCase):
    def setUp(self):
        # Remove any existing test JSON database files to ensure clean runs
        if os.path.exists(FALLBACK_FILE_PATH):
            os.remove(FALLBACK_FILE_PATH)
            
        # Simulate MongoDB offline: change the local env variable to an invalid port
        self.original_mongo_uri = os.environ.get("MONGO_URI")
        os.environ["MONGO_URI"] = "mongodb://localhost:9999/test_db_does_not_exist"
        
        # Initialize store (should switch to JSON fallback automatically)
        self.store = ResilientMongoStore()

    def tearDown(self):
        # Restore original MONGO_URI and clean up generated test JSON databases
        if self.original_mongo_uri:
            os.environ["MONGO_URI"] = self.original_mongo_uri
        else:
            del os.environ["MONGO_URI"]
            
        if os.path.exists(FALLBACK_FILE_PATH):
            os.remove(FALLBACK_FILE_PATH)

    def test_offline_mongo_switches_to_json_fallback(self):
        """
        Verify that when Mongo URI is invalid, the wrapper does not crash,
        marks 'use_fallback' as True, and successfully reads/writes to local JSON file.
        """
        self.assertTrue(self.store.is_using_fallback())
        
        # Insert test document into collaboration requests
        collab_doc = {
            "sender": "sender_user",
            "recipient": "recipient_user",
            "message": "Hey! Want to write a post together?",
            "status": "Pending"
        }
        
        doc_id = self.store.insert_document("collaboration_requests", collab_doc)
        self.assertIsNotNone(doc_id)
        
        # Verify that the JSON file was created on disk
        self.assertTrue(os.path.exists(FALLBACK_FILE_PATH))
        
        # Fetch document from the JSON store
        retrieved_docs = self.store.get_documents("collaboration_requests", {"sender": "sender_user"})
        self.assertEqual(len(retrieved_docs), 1)
        self.assertEqual(retrieved_docs[0]["recipient"], "recipient_user")
        self.assertEqual(retrieved_docs[0]["message"], "Hey! Want to write a post together?")
        self.assertEqual(retrieved_docs[0]["id"], doc_id)

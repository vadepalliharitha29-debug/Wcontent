import os
import json
import uuid
import logging
from datetime import datetime
from django.conf import settings
# pyrefly: ignore [missing-import]
from pymongo import MongoClient
# pyrefly: ignore [missing-import]
from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

# Fallback JSON file path
FALLBACK_FILE_PATH = os.path.join(settings.BASE_DIR, 'local_db_fallback.json')

class ResilientMongoStore:
    def __init__(self):
        self.mongo_client = None
        self.db = None
        self.use_fallback = False
        
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/wcontent')
        
        try:
            # Short timeout (2 seconds) so it fails quickly if MongoDB isn't running
            self.mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            # Send a ping command to test the connection
            self.mongo_client.admin.command('ping')
            self.db = self.mongo_client.get_database()
            logger.info("Successfully connected to MongoDB.")
        except (PyMongoError, ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.warning(f"MongoDB connection failed: {e}. Switching to localized JSON Fallback database.")
            self.use_fallback = True
            self._init_fallback_file()

    def is_using_fallback(self):
        return self.use_fallback

    def _init_fallback_file(self):
        # Create empty fallback file if missing
        if not os.path.exists(FALLBACK_FILE_PATH):
            default_data = {
                "collaboration_requests": [],
                "notifications": []
            }
            with open(FALLBACK_FILE_PATH, 'w') as f:
                json.dump(default_data, f, indent=4)

    def _read_fallback_data(self):
        self._init_fallback_file()
        try:
            with open(FALLBACK_FILE_PATH, 'r') as f:
                return json.load(f)
        except Exception:
            return {"collaboration_requests": [], "notifications": []}

    def _write_fallback_data(self, data):
        try:
            with open(FALLBACK_FILE_PATH, 'w') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            logger.error(f"Error writing to file: {e}")
            return False

    def insert_document(self, collection_name, document):
        document = dict(document)
        # format timestamp for JSON compatibility
        if 'created_at' in document and isinstance(document['created_at'], datetime):
            document['created_at'] = document['created_at'].isoformat()
        elif 'created_at' not in document:
            document['created_at'] = datetime.utcnow().isoformat()

        # Try inserting to MongoDB first if MongoDB is online
        if not self.use_fallback:
            try:
                collection = self.db[collection_name]
                result = collection.insert_one(document)
                return str(result.inserted_id)
            except PyMongoError as e:
                logger.warning(f"MongoDB failed on insertion: {e}. Falling back to JSON write.")
                self.use_fallback = True
                self._init_fallback_file()

        # Fallback JSON Implementation
        doc_id = str(uuid.uuid4())
        document['id'] = doc_id  # Assign a unique string ID
        data = self._read_fallback_data()
        
        if collection_name not in data:
            data[collection_name] = []
            
        data[collection_name].append(document)
        self._write_fallback_data(data)
        return doc_id

    def get_documents(self, collection_name, query_filter=None):
        if not self.use_fallback:
            try:
                collection = self.db[collection_name]
                # Query records and format ObjectID to string ID
                cursor = collection.find(query_filter or {})
                results = []
                for doc in cursor:
                    doc['id'] = str(doc.get('_id'))
                    if '_id' in doc:
                        del doc['_id']
                    results.append(doc)
                return results
            except PyMongoError as e:
                logger.warning(f"MongoDB failed on retrieval: {e}. Falling back to JSON read.")
                self.use_fallback = True

        # Fallback JSON Implementation
        data = self._read_fallback_data()
        records = data.get(collection_name, [])
        
        if not query_filter:
            return records
            
        # Simple local filtering for JSON
        filtered_records = []
        for record in records:
            match = True
            for key, val in query_filter.items():
                if record.get(key) != val:
                    match = False
                    break
            if match:
                filtered_records.append(record)
        return filtered_records

    def update_document(self, collection_name, doc_id, update_dict):
        if not self.use_fallback:
            try:
                # pyrefly: ignore [missing-import]
                from bson.objectid import ObjectId
                collection = self.db[collection_name]
                
                # Check if it's a valid MongoDB ObjectId
                try:
                    mongo_id = ObjectId(doc_id)
                    result = collection.update_one({'_id': mongo_id}, {'$set': update_dict})
                    return result.modified_count > 0
                except Exception:
                    # If it's a local JSON UUID, search by the string field
                    result = collection.update_one({'id': doc_id}, {'$set': update_dict})
                    return result.modified_count > 0
            except PyMongoError as e:
                logger.warning(f"MongoDB failed on update: {e}. Falling back to JSON update.")
                self.use_fallback = True

        # Fallback JSON Implementation
        data = self._read_fallback_data()
        records = data.get(collection_name, [])
        updated = False
        
        for record in records:
            if record.get('id') == doc_id:
                record.update(update_dict)
                updated = True
                break
                
        if updated:
            self._write_fallback_data(data)
        return updated

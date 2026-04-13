# firebase_helper.py
import firebase_admin
import requests
import os
from firebase_admin import credentials, firestore, auth
from config import FIREBASE_CREDENTIALS_PATH, FIREBASE_WEB_API_KEY
from datetime import datetime

# ── Notifications ─────────────────────────────────────────────

# Initialize Firebase Admin
if not firebase_admin._apps:
    try:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        print(" Firebase initialized successfully")
    except Exception as e:
        print(f" Firebase initialization error: {e}")
        raise

# Get Firestore client
db = firestore.client()

def create_user(email, password, username):
    #Create a new user with Firebase Authentication and Firestore
    try:
        # Create Firebase Auth user
        user = auth.create_user(
            email=email,
            password=password,
            display_name=username
        )
        
        
        # Create Firestore user document
        user_ref = db.collection('users').document(user.uid)
        user_ref.set({
            'username': username,
            'email': email,
            'displayName': username,
            'createdAt': datetime.now(),
            'streamingServices': {
                'netflix': False,
                'hulu': False,
                'disneyPlus': False,
                'hboMax': False,
                'amazonPrime': False,
                'appleTV': False,
                'paramount': False,
                'peacock': False
            }
        })
        
        # Create empty lists subcollection with documents such as watchlist, facorites, and watched.
        user_ref.collection('lists').document('watchlist').set({'movies': []})
        user_ref.collection('lists').document('favorites').set({'movies': []})
        user_ref.collection('lists').document('watched').set({'movies': []})
        
        return {
            'success': True,
            'user_id': user.uid,
            'message': 'User created successfully'
        }
    

    #trying to make a new account whenever one already exists.
    except auth.EmailAlreadyExistsError:
        return {
            'success': False,
            'message': 'Email already exists'
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }

# Check if an email is already registered in Firebase Authentication
def check_email_exists(email):
    try:
        auth.get_user_by_email(email)
        return {'success': True}
    except auth.UserNotFoundError:
        return {'success': False, 'message': 'User not found'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# Verify user credentials with Firebase Authentication and return user data if valid
def verify_user(email, password):
    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
        response = requests.post(url, json={"email": email, "password": password, "returnSecureToken": True})
        data = response.json()

        if "error" in data:
            error_msg = data["error"]["message"]
            if error_msg in ("EMAIL_NOT_FOUND", "INVALID_EMAIL"):
                return {'success': False, 'message': 'User not found'}
            return {'success': False, 'message': 'Invalid email or password'}

        user = auth.get_user_by_email(email)
        return {
            'success': True,
            'user_id': data['localId'],
            'email': data['email'],
            'username': user.display_name
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }

def send_password_reset_email(email):
    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_WEB_API_KEY}"

        response = requests.post(url, json={
            "requestType": "PASSWORD_RESET",
            "email": email
        })

        data = response.json()

        if response.status_code != 200 or "error" in data:
            return {
                "success": False,
                "message": data.get("error", {}).get("message", "Failed to send reset email")
            }

        return {
            "success": True,
            "message": "Password reset email sent"
        }

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }

def update_streaming_services(user_id, services):
    #updating our users streaming service prefrences in firestore.
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update({
            'streamingServices': services
        })
        return {
            'success': True,
            'message': 'Streaming services updated'
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }

def get_user_streaming_services(user_id):
    #get our users streaming service prefrences from firestore.
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            user_data = user_doc.to_dict()
            return user_data.get('streamingServices', {})
        else:
            return {}
    except Exception as e:
        print(f"Error getting streaming services: {e}")
        return {}

def get_user_data(user_id):
    #get all user data.
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            return user_doc.to_dict()
        else:
            return None
    except Exception as e:
        print(f"Error getting user data: {e}")
        return None

def add_to_watchlist(user_id, movie_id):
    #add movies to watchlist.
    try:
        watchlist_ref = db.collection('users').document(user_id).collection('lists').document('watchlist')
        watchlist_ref.update({
            'movies': firestore.ArrayUnion([str(movie_id)])
        })
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def get_watchlist(user_id):
    #get users watchlist.
    try:
        watchlist_ref = db.collection('users').document(user_id).collection('lists').document('watchlist')
        watchlist_doc = watchlist_ref.get()

        if watchlist_doc.exists:
            return watchlist_doc.to_dict().get('movies', [])
        return []
    except Exception as e:
        print(f"Error getting watchlist: {e}")
        return []

#Add a movie to the user's watched list with all relevant details and the user's rating. This will be stored in a subcollection under the user document for easy retrieval and management of watched movies.
def add_watched_movie(user_id, movie, user_rating, comment=''):
    try:
        movie_doc = {
            'movie_id': movie['movie_id'],
            'title': movie['title'],
            'year': movie['year'],
            'tmdb_rating': movie['rating'],
            'overview': movie['overview'],
            'poster': movie.get('poster'),
            'director': movie['director'],
            'actors': movie.get('Popular Actors', movie.get('actors', [])),
            'genres': movie.get('genres', []),
            'services': movie.get('services', []),
            'user_rating': user_rating,
            'comment': comment,
            'watched_at': datetime.now()
        }
        (db.collection('users').document(user_id)
           .collection('watched_movies').document(str(movie['movie_id']))
           .set(movie_doc))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


#Returns a users watched movies.
def get_watched_movies(user_id):
    try:
        docs = (db.collection('users').document(user_id)
                  .collection('watched_movies')
                  .order_by('watched_at', direction=firestore.Query.DESCENDING)
                  .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting watched movies: {e}")
        return []


#Checks if a movie is in the users watch list, and returns true or false. This is used to prevent duplicates in the watchlist and to check if a movie has already been watched.
def is_movie_watched(user_id, movie_id):
    try:
        doc = (db.collection('users').document(user_id)
                 .collection('watched_movies').document(str(movie_id))
                 .get())
        return doc.exists
    except Exception:
        return False

#Returns a single watched movie document for the user, or None if not found.
def get_watched_movie(user_id, movie_id):
    try:
        doc = (db.collection('users').document(user_id)
                 .collection('watched_movies').document(str(movie_id))
                 .get())
        return doc.to_dict() if doc.exists else None
    except Exception:
        return None

#Updates a users rating for a movie in their watched list. This allows users to change their rating after watching a movie, and keeps the data up to date in Firestore.
def update_watched_rating(user_id, movie_id, new_rating, comment=None):
    try:
        update_data = {'user_rating': new_rating}
        if comment is not None:
            update_data['comment'] = comment
        (db.collection('users').document(user_id)
           .collection('watched_movies').document(str(movie_id))
           .update(update_data))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# ── Social Feed ───────────────────────────────────────────────

# creates a new post in the global feed with the movie info and user's message
def create_post(user_id, username, message, movie_title, movie_id, rating):
    try:
        post_ref = db.collection('posts').document()
        post_ref.set({
            'post_id': post_ref.id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'movie_title': movie_title,
            'movie_id': str(movie_id),
            'rating': rating,
            'likes': 0,
            'liked_by': [],
            'created_at': datetime.now()
        })
        return {'success': True, 'post_id': post_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# pulls the most recent posts from the feed, newest first
def get_feed(limit=20):
    try:
        docs = (db.collection('posts')
                  .order_by('created_at', direction=firestore.Query.DESCENDING)
                  .limit(limit)
                  .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting feed: {e}")
        return []

# toggle like on a post — likes if not already liked, unlikes if already liked
def like_post(post_id, user_id, from_username=''):
    try:
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            return {'success': False, 'message': 'Post not found'}

        post_data = post_doc.to_dict()
        liked_by = post_data.get('liked_by', [])
        owner_id = post_data.get('user_id')

        if user_id in liked_by:
            post_ref.update({
                'likes': firestore.Increment(-1),
                'liked_by': firestore.ArrayRemove([user_id])
            })
            return {'success': True, 'action': 'unliked'}
        else:
            post_ref.update({
                'likes': firestore.Increment(1),
                'liked_by': firestore.ArrayUnion([user_id])
            })
            # Notify the post owner, but not if they liked their own post
            if owner_id and owner_id != user_id:
                create_notification(owner_id, 'like', {
                    'from_username': from_username,
                    'post_id': post_id,
                    'movie_title': post_data.get('movie_title', ''),
                })
            return {'success': True, 'action': 'liked'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# adds a reply to a post's replies subcollection
def add_reply(post_id, user_id, username, message):
    try:
        post_doc = db.collection('posts').document(post_id).get()
        post_data = post_doc.to_dict() if post_doc.exists else {}
        owner_id = post_data.get('user_id')

        reply_ref = db.collection('posts').document(post_id).collection('replies').document()
        reply_ref.set({
            'reply_id': reply_ref.id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'created_at': datetime.now()
        })

        # Notify the post owner, but not if they replied to their own post
        if owner_id and owner_id != user_id:
            create_notification(owner_id, 'reply', {
                'from_username': username,
                'post_id': post_id,
                'movie_title': post_data.get('movie_title', ''),
                'message': message,
            })

        return {'success': True, 'reply_id': reply_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# fetches all replies for a given post, oldest first
def get_replies(post_id):
    try:
        docs = (db.collection('posts').document(post_id)
                  .collection('replies')
                  .order_by('created_at', direction=firestore.Query.ASCENDING)
                  .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting replies: {e}")
        return []

def create_notification(user_id, type_, data):
    """Create a notification document for the given user."""
    try:
        notif_ref = db.collection('notifications').document()
        notif_ref.set({
            'notification_id': notif_ref.id,
            'user_id': user_id,
            'type': type_,
            'from_username': data.get('from_username', ''),
            'post_id': data.get('post_id', ''),
            'movie_title': data.get('movie_title', ''),
            'message': data.get('message', ''),
            'conversation_id': data.get('conversation_id', ''),
            'conv_name': data.get('conv_name', ''),
            'read': False,
            'created_at': datetime.now(),
        })
    except Exception as e:
        print(f"Error creating notification: {e}")


def get_notifications(user_id, limit=30):
    """Return the most recent notifications for a user, newest first."""
    try:
        docs = (
            db.collection('notifications')
            .where('user_id', '==', user_id)
            .order_by('created_at', direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting notifications: {e}")
        return []


def mark_all_notifications_read(user_id):
    """Mark every unread notification for a user as read."""
    try:
        docs = (
            db.collection('notifications')
            .where('user_id', '==', user_id)
            .where('read', '==', False)
            .stream()
        )
        batch = db.batch()
        for doc in docs:
            batch.update(doc.reference, {'read': True})
        batch.commit()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# deletes a post — only works if the requesting user owns it
def delete_post(post_id, user_id):
    try:
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            return {'success': False, 'message': 'Post not found'}

        if post_doc.to_dict().get('user_id') != user_id:
            return {'success': False, 'message': 'You can only delete your own posts'}

        post_ref.delete()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# ── Messaging ─────────────────────────────────────────────────

def search_users(query, exclude_user_id=None, limit=10):
    """Case-insensitive substring search on usernames (fetches up to 100, filters in Python)."""
    try:
        q = query.lower()
        docs = db.collection('users').limit(100).stream()
        results = []
        for doc in docs:
            if doc.id == exclude_user_id:
                continue
            username = doc.to_dict().get('username', '')
            if q in username.lower():
                results.append({'user_id': doc.id, 'username': username})
                if len(results) >= limit:
                    break
        return results
    except Exception as e:
        print(f"Error searching users: {e}")
        return []


def get_or_create_dm(user_a_id, user_a_name, user_b_id, user_b_name):
    """Return the existing DM between two users, or create a new one."""
    try:
        existing = (
            db.collection('conversations')
            .where('members', 'array_contains', user_a_id)
            .stream()
        )
        for doc in existing:
            data = doc.to_dict()
            if data.get('type') == 'dm' and user_b_id in data.get('members', []):
                return {'success': True, 'conversation_id': doc.id}

        conv_ref = db.collection('conversations').document()
        conv_ref.set({
            'conversation_id': conv_ref.id,
            'type': 'dm',
            'name': '',
            'members': [user_a_id, user_b_id],
            'member_names': {user_a_id: user_a_name, user_b_id: user_b_name},
            'last_message': '',
            'last_message_at': None,
            'created_at': datetime.now(),
            'created_by': user_a_id,
        })
        return {'success': True, 'conversation_id': conv_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def create_group_chat(creator_id, creator_name, members, group_name):
    """members = list of {user_id, username} dicts (not including the creator)."""
    try:
        all_ids = [creator_id] + [m['user_id'] for m in members]
        name_map = {creator_id: creator_name}
        for m in members:
            name_map[m['user_id']] = m['username']

        conv_ref = db.collection('conversations').document()
        conv_ref.set({
            'conversation_id': conv_ref.id,
            'type': 'group',
            'name': group_name,
            'members': all_ids,
            'member_names': name_map,
            'last_message': '',
            'last_message_at': None,
            'created_at': datetime.now(),
            'created_by': creator_id,
        })
        return {'success': True, 'conversation_id': conv_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_conversations(user_id):
    """All conversations for a user, sorted by last_message_at DESC."""
    try:
        docs = (
            db.collection('conversations')
            .where('members', 'array_contains', user_id)
            .stream()
        )
        convs = [doc.to_dict() for doc in docs]
        # Sort in Python to avoid Firestore composite-index requirements with nullable field
        convs.sort(key=lambda c: c.get('last_message_at') or datetime.min, reverse=True)
        return convs
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return []


def get_messages(conversation_id, limit=50):
    """Messages for a conversation, oldest first, capped at `limit`."""
    try:
        docs = (
            db.collection('conversations')
            .document(conversation_id)
            .collection('messages')
            .order_by('created_at', direction=firestore.Query.ASCENDING)
            .stream()
        )
        messages = [doc.to_dict() for doc in docs]
        return messages[-limit:] if len(messages) > limit else messages
    except Exception as e:
        print(f"Error getting messages: {e}")
        return []


def send_message(conversation_id, user_id, username, text):
    """Append a message, update conversation metadata, and notify other members."""
    try:
        conv_ref = db.collection('conversations').document(conversation_id)
        conv_doc = conv_ref.get()
        if not conv_doc.exists:
            return {'success': False, 'message': 'Conversation not found'}

        conv_data = conv_doc.to_dict()
        members = conv_data.get('members', [])
        conv_name = conv_data.get('name', '')

        msg_ref = conv_ref.collection('messages').document()
        msg_ref.set({
            'message_id': msg_ref.id,
            'user_id': user_id,
            'username': username,
            'text': text,
            'created_at': datetime.now(),
        })

        conv_ref.update({
            'last_message': text[:100],
            'last_message_at': datetime.now(),
        })

        for member_id in members:
            if member_id != user_id:
                create_notification(member_id, 'message', {
                    'from_username': username,
                    'conversation_id': conversation_id,
                    'conv_name': conv_name,
                    'message': text[:100],
                })

        return {'success': True, 'message_id': msg_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}
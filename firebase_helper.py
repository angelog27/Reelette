# firebase_helper.py
import firebase_admin
import requests
import os
import tempfile
import json
from firebase_admin import credentials, firestore, auth
from datetime import datetime

try:
    from config import FIREBASE_CREDENTIALS_PATH, FIREBASE_WEB_API_KEY
except ImportError:
    FIREBASE_CREDENTIALS_PATH = os.environ.get("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY", "")

# Initialize Firebase Admin
if not firebase_admin._apps:
    try:
        firebase_credentials_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if firebase_credentials_json:
            # On Render: credentials are stored as an env var (JSON string)
            cred_dict = json.loads(firebase_credentials_json)
            tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
            json.dump(cred_dict, tmp)
            tmp.close()
            cred = credentials.Certificate(tmp.name)
        else:
            # Local dev: read from file path
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

def remove_from_watchlist(user_id, movie_id):
    try:
        watchlist_ref = db.collection('users').document(user_id).collection('lists').document('watchlist')
        watchlist_ref.update({
            'movies': firestore.ArrayRemove([str(movie_id)])
        })
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}

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
def like_post(post_id, user_id):
    try:
        post_ref = db.collection('posts').document(post_id)
        post_doc = post_ref.get()

        if not post_doc.exists:
            return {'success': False, 'message': 'Post not found'}

        liked_by = post_doc.to_dict().get('liked_by', [])

        if user_id in liked_by:
            # already liked, so remove the like
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
            return {'success': True, 'action': 'liked'}
    except Exception as e:
        return {'success': False, 'message': str(e)}

# adds a reply to a post's replies subcollection
def add_reply(post_id, user_id, username, message):
    try:
        reply_ref = db.collection('posts').document(post_id).collection('replies').document()
        reply_ref.set({
            'reply_id': reply_ref.id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'created_at': datetime.now()
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


# ── User Profile ──────────────────────────────────────────────────

def update_user_profile(user_id, data):
    """Update editable profile fields: displayName, bio, username"""
    try:
        allowed = {'displayName', 'bio', 'username'}
        update_data = {k: v for k, v in data.items() if k in allowed}
        if not update_data:
            return {'success': False, 'message': 'No valid fields to update'}
        db.collection('users').document(user_id).update(update_data)
        if 'displayName' in update_data:
            auth.update_user(user_id, display_name=update_data['displayName'])
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def search_users(query, exclude_user_id=None, limit=10):
    """Prefix search on username field — Firestore range query"""
    try:
        query_lower = query.lower()
        docs = (db.collection('users')
                  .where('username', '>=', query_lower)
                  .where('username', '<=', query_lower + '\uf8ff')
                  .limit(limit)
                  .stream())
        users = []
        for doc in docs:
            if doc.id == exclude_user_id:
                continue
            d = doc.to_dict()
            users.append({
                'user_id': doc.id,
                'username': d.get('username', ''),
                'displayName': d.get('displayName', d.get('username', ''))
            })
        return users
    except Exception as e:
        print(f"Error searching users: {e}")
        return []


# ── Friends ───────────────────────────────────────────────────────

def send_friend_request(from_user_id, from_username, to_user_id):
    """Send a friend request from one user to another"""
    try:
        # Already friends?
        if db.collection('users').document(to_user_id).collection('friends').document(from_user_id).get().exists:
            return {'success': False, 'message': 'Already friends'}
        # Request already pending?
        if db.collection('users').document(to_user_id).collection('friend_requests').document(from_user_id).get().exists:
            return {'success': False, 'message': 'Friend request already sent'}
        db.collection('users').document(to_user_id).collection('friend_requests').document(from_user_id).set({
            'from_user_id': from_user_id,
            'from_username': from_username,
            'status': 'pending',
            'created_at': datetime.now()
        })
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_friend_requests(user_id):
    """Get pending incoming friend requests for a user"""
    try:
        docs = (db.collection('users').document(user_id)
                  .collection('friend_requests')
                  .where('status', '==', 'pending')
                  .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting friend requests: {e}")
        return []


def accept_friend_request(user_id, user_username, from_user_id, from_username):
    """Accept a friend request — adds both users to each other's friends sub-collection"""
    try:
        req_ref = db.collection('users').document(user_id).collection('friend_requests').document(from_user_id)
        if not req_ref.get().exists:
            return {'success': False, 'message': 'Friend request not found'}
        now = datetime.now()
        db.collection('users').document(user_id).collection('friends').document(from_user_id).set({
            'friend_id': from_user_id,
            'friend_username': from_username,
            'since': now
        })
        db.collection('users').document(from_user_id).collection('friends').document(user_id).set({
            'friend_id': user_id,
            'friend_username': user_username,
            'since': now
        })
        req_ref.delete()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def reject_friend_request(user_id, from_user_id):
    """Decline/delete a pending friend request"""
    try:
        db.collection('users').document(user_id).collection('friend_requests').document(from_user_id).delete()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def remove_friend(user_id, friend_id):
    """Remove a friend — deletes both sides of the friendship"""
    try:
        db.collection('users').document(user_id).collection('friends').document(friend_id).delete()
        db.collection('users').document(friend_id).collection('friends').document(user_id).delete()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_friends(user_id):
    """Return the list of accepted friends for a user"""
    try:
        docs = db.collection('users').document(user_id).collection('friends').stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting friends: {e}")
        return []


# ── Groups ────────────────────────────────────────────────────────

def create_group(name, description, creator_id, creator_username):
    """Create a new movie group; creator is automatically a member"""
    try:
        group_ref = db.collection('groups').document()
        group_ref.set({
            'group_id': group_ref.id,
            'name': name,
            'description': description,
            'created_by': creator_id,
            'created_by_username': creator_username,
            'members': [creator_id],
            'member_usernames': {creator_id: creator_username},
            'watchlist': [],
            'created_at': datetime.now()
        })
        return {'success': True, 'group_id': group_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_group(group_id):
    """Fetch a single group document by ID"""
    try:
        doc = db.collection('groups').document(group_id).get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        print(f"Error getting group: {e}")
        return None


def get_user_groups(user_id):
    """Return all groups the user belongs to"""
    try:
        docs = (db.collection('groups')
                  .where('members', 'array_contains', user_id)
                  .stream())
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting user groups: {e}")
        return []


def add_group_member(group_id, new_member_id, new_member_username):
    """Add a new member to an existing group"""
    try:
        group_ref = db.collection('groups').document(group_id)
        if not group_ref.get().exists:
            return {'success': False, 'message': 'Group not found'}
        group_ref.update({
            'members': firestore.ArrayUnion([new_member_id]),
            f'member_usernames.{new_member_id}': new_member_username
        })
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def remove_group_member(group_id, user_id):
    """Remove a member from a group (creator cannot be removed)"""
    try:
        group_ref = db.collection('groups').document(group_id)
        group_doc = group_ref.get()
        if not group_doc.exists:
            return {'success': False, 'message': 'Group not found'}
        if group_doc.to_dict().get('created_by') == user_id:
            return {'success': False, 'message': 'Group creator cannot be removed; delete the group instead'}
        group_ref.update({
            'members': firestore.ArrayRemove([user_id]),
            f'member_usernames.{user_id}': firestore.DELETE_FIELD
        })
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def delete_group(group_id, user_id):
    """Delete a group — only the creator can do this"""
    try:
        group_ref = db.collection('groups').document(group_id)
        group_doc = group_ref.get()
        if not group_doc.exists:
            return {'success': False, 'message': 'Group not found'}
        if group_doc.to_dict().get('created_by') != user_id:
            return {'success': False, 'message': 'Only the group creator can delete the group'}
        group_ref.delete()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def add_to_group_watchlist(group_id, movie_id, movie_title, user_id, username):
    """Add a movie to the group's shared watchlist"""
    try:
        group_ref = db.collection('groups').document(group_id)
        group_doc = group_ref.get()
        if not group_doc.exists:
            return {'success': False, 'message': 'Group not found'}
        watchlist = group_doc.to_dict().get('watchlist', [])
        if any(m['movie_id'] == str(movie_id) for m in watchlist):
            return {'success': False, 'message': 'Movie already in group watchlist'}
        new_entry = {
            'movie_id': str(movie_id),
            'movie_title': movie_title,
            'added_by': user_id,
            'added_by_username': username,
            'added_at': datetime.now().isoformat()
        }
        group_ref.update({'watchlist': firestore.ArrayUnion([new_entry])})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def remove_from_group_watchlist(group_id, movie_id):
    """Remove a movie from the group watchlist by movie_id"""
    try:
        group_ref = db.collection('groups').document(group_id)
        group_doc = group_ref.get()
        if not group_doc.exists:
            return {'success': False, 'message': 'Group not found'}
        updated = [m for m in group_doc.to_dict().get('watchlist', []) if m['movie_id'] != str(movie_id)]
        group_ref.update({'watchlist': updated})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def spin_group_reelette(group_id):
    """Pick a random movie from the group's watchlist"""
    import random
    try:
        group_doc = db.collection('groups').document(group_id).get()
        if not group_doc.exists:
            return {'success': False, 'message': 'Group not found'}
        watchlist = group_doc.to_dict().get('watchlist', [])
        if not watchlist:
            return {'success': False, 'message': 'Group watchlist is empty — add some movies first!'}
        chosen = random.choice(watchlist)
        return {'success': True, 'movie': chosen}
    except Exception as e:
        return {'success': False, 'message': str(e)}
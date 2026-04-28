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
            'bio': '',
            'phone': '',
            'quizCompleted': False,
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
            },
            'moviePreferences': {
                'favoriteGenres': [],
                'favoritePeople': [],
                'contentRating': 'All Ratings',
                'watchlistSettings': {
                    'autoSortByReleaseDate': False,
                    'hideWatchedContent': True
                }
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
        custom_token = auth.create_custom_token(data['localId']).decode('utf-8')
        return {
            'success': True,
            'user_id': data['localId'],
            'email': data['email'],
            'username': user.display_name,
            'customToken': custom_token,
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
    
def update_movie_preferences(user_id, preferences):
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update({
            'moviePreferences': {
                'favoriteGenres': preferences.get('favoriteGenres', []),
                'favoritePeople': preferences.get('favoritePeople', []),
                'contentRating': preferences.get('contentRating', 'All Ratings'),
                'watchlistSettings': preferences.get('watchlistSettings', {
                    'autoSortByReleaseDate': False,
                    'hideWatchedContent': True
                })
            }
        })
        return {
            'success': True,
            'message': 'Movie preferences updated'
        }
    except Exception as e:
        return {
            'success': False,
            'message': str(e)
        }    

def get_user_movie_preferences(user_id):
    try:
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            user_data = user_doc.to_dict()
            return user_data.get('moviePreferences', {
                'favoriteGenres': [],
                'favoritePeople': [],
                'contentRating': 'All Ratings',
                'watchlistSettings': {
                    'autoSortByReleaseDate': False,
                    'hideWatchedContent': True
                }
            })
        else:
            return {
                'favoriteGenres': [],
                'favoritePeople': [],
                'contentRating': 'All Ratings',
                'watchlistSettings': {
                    'autoSortByReleaseDate': False,
                    'hideWatchedContent': True
                }
            }
    except Exception as e:
        print(f"Error getting movie preferences: {e}")
        return {
            'favoriteGenres': [],
            'favoritePeople': [],
            'contentRating': 'All Ratings',
            'watchlistSettings': {
                'autoSortByReleaseDate': False,
                'hideWatchedContent': True
            }
        }    

def get_user_data(user_id):
    """Return Firestore profile, optionally enriched with Firebase Auth metadata.

    Firestore is always the primary source. Auth data is layered on top as
    fallbacks (avatar, display name, provider list). If the Auth call fails
    for any reason the Firestore data is still returned intact.
    """
    import datetime as dt
    from datetime import timezone

    try:
        # ── 1. Firestore document (primary source) ──
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            data = user_doc.to_dict()
        else:
            data = None  # will try to seed from Auth below

        # ── 2. Firebase Auth record (enrichment / fallback) ──
        auth_user = None
        provider_data = []
        provider_photo = ''
        joined_at = ''

        try:
            auth_user = auth.get_user(user_id)
            provider_data = [
                {
                    'providerId': p.provider_id,
                    'email': p.email or '',
                    'displayName': p.display_name or '',
                    'photoUrl': p.photo_url or '',
                }
                for p in (auth_user.provider_data or [])
            ]
            provider_photo = next(
                (p['photoUrl'] for p in provider_data if p['photoUrl']), ''
            )
            if auth_user.user_metadata and auth_user.user_metadata.creation_timestamp:
                joined_at = dt.datetime.fromtimestamp(
                    auth_user.user_metadata.creation_timestamp / 1000, tz=timezone.utc
                ).isoformat()
        except Exception as auth_err:
            print(f"Warning: Auth enrichment skipped for {user_id}: {auth_err}")

        # ── 3. Seed Firestore doc for OAuth users who bypassed /register ──
        if data is None:
            if auth_user is None:
                # No Firestore doc and no Auth record — user truly doesn't exist
                return None
            seed = {
                'username': (auth_user.display_name or '').lower().replace(' ', '') or user_id[:8],
                'displayName': auth_user.display_name or '',
                'email': auth_user.email or '',
                'bio': '',
                'phone': '',
                'avatarUrl': provider_photo,
                'profileBannerBg': 'default',
                'createdAt': datetime.now(),
                'streamingServices': {
                    'netflix': False, 'hulu': False, 'disneyPlus': False,
                    'hboMax': False, 'amazonPrime': False, 'appleTV': False,
                    'paramount': False, 'peacock': False,
                },
                'moviePreferences': {
                    'favoriteGenres': [], 'favoritePeople': [],
                    'contentRating': 'All Ratings',
                    'watchlistSettings': {'autoSortByReleaseDate': False, 'hideWatchedContent': True},
                },
            }
            user_ref.set(seed)
            data = seed

        # ── 4. Fill gaps from Auth (only when Auth call succeeded) ──
        if auth_user is not None:
            if not data.get('email') and auth_user.email:
                data['email'] = auth_user.email
            if not data.get('displayName') and auth_user.display_name:
                data['displayName'] = auth_user.display_name
            if not data.get('avatarUrl') and provider_photo:
                data['avatarUrl'] = provider_photo

        # ── 5. Attach Auth metadata (empty defaults when Auth unavailable) ──
        data['emailVerified'] = auth_user.email_verified if auth_user else False
        data['providerData'] = provider_data
        data['joinedAt'] = joined_at

        return data

    except Exception as e:
        print(f"Error getting user data for {user_id}: {e}")
        raise   # let the caller (app.py route) handle 503 vs 500 vs 404

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


#Returns a users watched movies with optional limit and cursor-based pagination.
def get_watched_movies(user_id, limit=20, start_after_time=None):
    from datetime import datetime as _dt
    try:
        q = (db.collection('users').document(user_id)
               .collection('watched_movies')
               .order_by('watched_at', direction=firestore.Query.DESCENDING)
               .limit(limit))
        if start_after_time:
            try:
                # Accept ISO strings with or without timezone suffix
                cursor_dt = _dt.fromisoformat(start_after_time.replace('Z', '+00:00'))
                q = q.start_after(cursor_dt)
            except (ValueError, AttributeError):
                pass
        docs = q.stream()
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
def create_post(user_id, username, message, movie_title, movie_id, movie_poster, rating):
    try:
        post_ref = db.collection('posts').document()
        post_ref.set({
            'post_id': post_ref.id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'movie_title': movie_title,
            'movie_id': str(movie_id),
            'movie_poster': movie_poster or '',
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
        post_ref = db.collection('posts').document(post_id)
        reply_ref = post_ref.collection('replies').document()
        reply_ref.set({
            'reply_id': reply_ref.id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'created_at': datetime.now()
        })
        post_ref.update({'reply_count': firestore.Increment(1)})
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
    """Update editable profile fields: displayName, bio, username, phone, socialSettings"""
    try:
        allowed = {'displayName', 'bio', 'username', 'phone', 'profileBannerBg', 'socialSettings'}
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
                  .select(['username', 'displayName', 'avatarUrl'])
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


def add_to_group_watchlist(group_id, movie_id, movie_title, movie_poster, user_id, username):
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
            'movie_poster': movie_poster or '',
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


# ── Avatar & Presence ─────────────────────────────────────────────

def update_user_avatar(user_id, avatar_url):
    """Store a custom avatar (data URI or external URL) on the user document"""
    try:
        db.collection('users').document(user_id).update({'avatarUrl': avatar_url})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def update_user_last_seen(user_id):
    """Stamp the user's lastSeen timestamp — called as a heartbeat from the client"""
    try:
        db.collection('users').document(user_id).update({'lastSeen': datetime.now()})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# ── Public Profile ────────────────────────────────────────────────

def get_user_public_profile(user_id):
    """Return a user's public profile including computed stats"""
    try:
        doc = db.collection('users').document(user_id).get(
            field_paths=['username', 'displayName', 'bio', 'avatarUrl', 'createdAt', 'lastSeen', 'socialSettings']
        )
        if not doc.exists:
            return None
        d = doc.to_dict()
        user_ref = db.collection('users').document(user_id)
        watched_count = user_ref.collection('watched_movies').count().get()[0][0].value
        watchlist_doc = user_ref.collection('lists').document('watchlist').get(field_paths=['movies'])
        friends_count = user_ref.collection('friends').count().get()[0][0].value
        social = d.get('socialSettings', {})
        return {
            'user_id':             user_id,
            'username':            d.get('username', ''),
            'displayName':         d.get('displayName', d.get('username', '')),
            'bio':                 d.get('bio', ''),
            'avatarUrl':           d.get('avatarUrl'),
            'createdAt':           d.get('createdAt'),
            'lastSeen':            d.get('lastSeen'),
            'watchedCount':        watched_count,
            'watchlistCount':      len(watchlist_doc.to_dict().get('movies', [])) if watchlist_doc.exists else 0,
            'friendsCount':        friends_count,
            'showMyStuffPublicly': social.get('showMyStuffPublicly', False),
            'showOnlineStatus':    social.get('showOnlineStatus', True),
        }
    except Exception as e:
        print(f"Error getting public profile: {e}")
        return None


# ── Group Member Helpers ──────────────────────────────────────────

def get_group_member_profiles(group_id):
    """Return lightweight profile data (including lastSeen) for every group member"""
    try:
        group_doc = db.collection('groups').document(group_id).get()
        if not group_doc.exists:
            return []
        member_ids = group_doc.to_dict().get('members', [])
        if not member_ids:
            return []
        refs = [db.collection('users').document(uid) for uid in member_ids]
        docs = db.get_all(refs, field_paths=['username', 'displayName', 'avatarUrl', 'lastSeen'])
        profiles = []
        for u in docs:
            if u.exists:
                d = u.to_dict()
                profiles.append({
                    'user_id':     u.id,
                    'username':    d.get('username', ''),
                    'displayName': d.get('displayName', d.get('username', '')),
                    'avatarUrl':   d.get('avatarUrl'),
                    'lastSeen':    d.get('lastSeen'),
                })
        return profiles
    except Exception as e:
        print(f"Error getting member profiles: {e}")
        return []


def get_members_streaming_services(group_id):
    """Return streaming service prefs for every member of a group"""
    try:
        group_doc = db.collection('groups').document(group_id).get()
        if not group_doc.exists:
            return {}
        member_ids = group_doc.to_dict().get('members', [])
        if not member_ids:
            return {}
        refs = [db.collection('users').document(uid) for uid in member_ids]
        docs = db.get_all(refs, field_paths=['username', 'streamingServices'])
        result = {}
        for u in docs:
            if u.exists:
                d = u.to_dict()
                result[u.id] = {
                    'username': d.get('username', ''),
                    'services': d.get('streamingServices', {})
                }
        return result
    except Exception as e:
        print(f"Error getting member services: {e}")
        return {}


# ── Roulette Spin History ─────────────────────────────────────────

def log_roulette_spin(user_id, movie_id, movie_title, poster_url):
    """Prepend a spin to /users/{user_id}/roulette, keep max 20 entries.

    Uses a _meta counter doc so we read 1 doc per spin instead of streaming
    the entire subcollection. The cleanup query (streaming all docs) only runs
    when the counter exceeds 20, which is rare after the first fill.
    Firestore excludes _meta from get_roulette_history automatically because
    order_by('spun_at') skips documents that lack that field.
    """
    try:
        roulette_ref = db.collection('users').document(user_id).collection('roulette')
        meta_ref = roulette_ref.document('_meta')

        # Write the new spin entry
        roulette_ref.document().set({
            'movie_id':    str(movie_id),
            'movie_title': movie_title,
            'poster_url':  poster_url or '',
            'spun_at':     datetime.now()
        })

        # Atomically increment counter (initialises to 1 if _meta doesn't exist yet)
        meta_ref.set({'count': firestore.Increment(1)}, merge=True)

        # 1 read to decide whether pruning is needed
        count = (meta_ref.get().to_dict() or {}).get('count', 0)

        if count > 20:
            # Rare path: stream only the spin docs (order_by excludes _meta),
            # delete anything beyond position 20, reset counter.
            all_spins = list(
                roulette_ref
                    .order_by('spun_at', direction=firestore.Query.DESCENDING)
                    .stream()
            )
            for doc in all_spins[20:]:
                doc.reference.delete()
            meta_ref.set({'count': min(count, 20)}, merge=True)

        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def get_roulette_history(user_id, limit=10):
    """Return the most recent `limit` spins for a user, newest first."""
    try:
        docs = (
            db.collection('users').document(user_id)
              .collection('roulette')
              .order_by('spun_at', direction=firestore.Query.DESCENDING)
              .limit(limit)
              .stream()
        )
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting roulette history: {e}")
        return []


def get_friends_roulette_history(user_id, limit=1):
    """Return the most recent `limit` spins for each of the user's friends."""
    try:
        friends = get_friends(user_id)
        result = []
        for friend in friends:
            friend_id = friend.get('friend_id')
            if not friend_id:
                continue
            spins = get_roulette_history(friend_id, limit=limit)
            if spins:
                # Look up the friend's avatar from their user document directly
                try:
                    user_doc = db.collection('users').document(friend_id).get()
                    avatar_url = user_doc.to_dict().get('avatarUrl') if user_doc.exists else None
                except Exception:
                    avatar_url = None
                result.append({
                    'friend_id': friend_id,
                    'friend_username': friend.get('friend_username', ''),
                    'avatarUrl': avatar_url,
                    'spins': spins,
                })
        return result
    except Exception as e:
        print(f"Error getting friends roulette history: {e}")
        return []
    
# ── Notifications ────────────────────────────────────────────────
def get_notifications(user_id, limit=30):
    """Return the most recent notifications for a user, newest first."""
    try:
        docs = (
            db.collection('users').document(user_id)
              .collection('notifications')
              .order_by('created_at', direction=firestore.Query.DESCENDING)
              .limit(limit)
              .stream()
        )
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"Error getting notifications: {e}")
        return []


def mark_notification_read(user_id, notification_id):
    """Mark a single notification as read."""
    try:
        db.collection('users').document(user_id) \
          .collection('notifications').document(notification_id) \
          .update({'read': True})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


def mark_all_notifications_read(user_id):
    """Mark all of a user's notifications as read."""
    try:
        notif_ref = db.collection('users').document(user_id).collection('notifications')
        unread = notif_ref.where('read', '==', False).stream()
        batch = db.batch()
        for doc in unread:
            batch.update(doc.reference, {'read': True})
        batch.commit()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# ── Direct Messages ───────────────────────────────────────────────

def _conv_id(uid1, uid2):
    return '_'.join(sorted([uid1, uid2]))

def get_or_create_conversation(uid1, uid2, username1, username2):
    try:
        conv_id = _conv_id(uid1, uid2)
        ref = db.collection('conversations').document(conv_id)
        if not ref.get().exists:
            ref.set({
                'participants': [uid1, uid2],
                'usernames': {uid1: username1, uid2: username2},
                'last_message': '',
                'last_sender_id': '',
                'updated_at': datetime.now(),
                'unread': {uid1: 0, uid2: 0},
            })
        return {'success': True, 'conversation_id': conv_id}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def get_conversations(user_id):
    try:
        docs = (db.collection('conversations')
                  .where('participants', 'array_contains', user_id)
                  .order_by('updated_at', direction=firestore.Query.DESCENDING)
                  .limit(30)
                  .stream())
        result = []
        for doc in docs:
            d = doc.to_dict()
            result.append({
                'conversation_id': doc.id,
                'participants':    d.get('participants', []),
                'usernames':       d.get('usernames', {}),
                'last_message':    d.get('last_message', ''),
                'last_sender_id':  d.get('last_sender_id', ''),
                'updated_at':      d['updated_at'].isoformat() if d.get('updated_at') else '',
                'unread':          d.get('unread', {}),
            })
        return result
    except Exception as e:
        return []

def get_messages(conversation_id, limit=50):
    try:
        docs = (db.collection('conversations').document(conversation_id)
                  .collection('messages')
                  .order_by('sent_at', direction=firestore.Query.DESCENDING)
                  .limit(limit)
                  .stream())
        msgs = []
        for doc in docs:
            d = doc.to_dict()
            msgs.append({
                'message_id': doc.id,
                'sender_id':  d.get('sender_id', ''),
                'text':       d.get('text', ''),
                'sent_at':    d['sent_at'].isoformat() if d.get('sent_at') else '',
            })
        return list(reversed(msgs))  # oldest first
    except Exception as e:
        return []

def send_message(conversation_id, sender_id, text):
    try:
        conv_ref = db.collection('conversations').document(conversation_id)
        conv_doc = conv_ref.get()
        if not conv_doc.exists:
            return {'success': False, 'message': 'Conversation not found'}
        participants = conv_doc.to_dict().get('participants', [])
        msg_ref = conv_ref.collection('messages').document()
        msg_ref.set({'sender_id': sender_id, 'text': text.strip(), 'sent_at': datetime.now()})
        unread_update = {f'unread.{uid}': firestore.Increment(1) for uid in participants if uid != sender_id}
        conv_ref.update({
            'last_message': text.strip(),
            'last_sender_id': sender_id,
            'updated_at': datetime.now(),
            **unread_update,
        })
        return {'success': True, 'message_id': msg_ref.id}
    except Exception as e:
        return {'success': False, 'message': str(e)}

def mark_conversation_read(conversation_id, user_id):
    try:
        db.collection('conversations').document(conversation_id).update({f'unread.{user_id}': 0})
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}


# ── Quiz ──────────────────────────────────────────────────────────
def save_quiz_result(uid, top_genre, answers):
    """Save quiz completion status and top genre to the user's Firestore document"""
    try:
        db.collection('users').document(uid).set({
            'quizCompleted': True,
            'topGenre': top_genre,
        }, merge=True)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}
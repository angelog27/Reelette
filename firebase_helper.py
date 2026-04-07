# firebase_helper.py
import firebase_admin
import requests
import os
from firebase_admin import credentials, firestore, auth
from config import FIREBASE_CREDENTIALS_PATH, FIREBASE_WEB_API_KEY
from datetime import datetime

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
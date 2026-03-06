# firebase_helper.py
import firebase_admin
import requests
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
def add_watched_movie(user_id, movie, user_rating):
    try:
        movie_doc = {
            'movie_id': movie['movie_id'],
            'title': movie['title'],
            'year': movie['year'],
            'tmdb_rating': movie['rating'],
            'overview': movie['overview'],
            'poster': movie.get('poster'),
            'director': movie['director'],
            'actors': movie.get('Popular Actors', []),
            'genres': movie.get('genres', []),
            'services': movie.get('services', []),
            'user_rating': user_rating,
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

#Updates a users rating for a movie in their watched list. This allows users to change their rating after watching a movie, and keeps the data up to date in Firestore.
def update_watched_rating(user_id, movie_id, new_rating):
    try:
        (db.collection('users').document(user_id)
           .collection('watched_movies').document(str(movie_id))
           .update({'user_rating': new_rating}))
        return {'success': True}
    except Exception as e:
        return {'success': False, 'message': str(e)}
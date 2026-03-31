# config.example.py
# Copy this file to config.py and fill in your actual values

# TMDb API Configuration
TMDB_API_KEY = "your_tmdb_api_key_here"
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Image Configuration
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p"
TMDB_POSTER_SIZE = "w500"
TMDB_BACKDROP_SIZE = "w1280"

# Firebase Configuration
# Download your Firebase credentials JSON file and save as firebase-credentials.json
FIREBASE_CREDENTIALS_PATH = "firebase-credentials.json"
FIREBASE_WEB_API_KEY = "your_firebase_web_api_key"  # Firebase Console > Project Settings > General


# Flask Configuration
SECRET_KEY = "change-this-to-a-random-string"

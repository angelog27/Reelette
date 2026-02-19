# tmdb_api.py
import requests
from config import TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE

def search_movies(query, page=1):
    """Search for movies by title"""
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "language": "en-US",
        "page": page,
        "include_adult": False
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error searching movies: {e}")
        return None

def get_movie_details(movie_id):
    """Get detailed information about a specific movie"""
    url = f"{TMDB_BASE_URL}/movie/{movie_id}"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "append_to_response": "credits,videos,watch/providers,similar,keywords"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting movie details: {e}")
        return None

def get_popular_movies(page=1):
    """Get currently popular movies"""
    url = f"{TMDB_BASE_URL}/movie/popular"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting popular movies: {e}")
        return None

def discover_movies(genre_id=None, year=None, min_rating=None, sort_by="popularity.desc", page=1):
    """Discover movies with filters"""
    url = f"{TMDB_BASE_URL}/discover/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": sort_by,
        "include_adult": False,
        "page": page
    }
    
    if genre_id:
        params["with_genres"] = genre_id
    if year:
        params["year"] = year
    if min_rating:
        params["vote_average.gte"] = min_rating
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error discovering movies: {e}")
        return None
    

def get_movie_director(movie_details):
    """Extract director from movie credits"""
    if 'credits' in movie_details and 'crew' in movie_details['credits']:
        for crew_member in movie_details['credits']['crew']:
            if crew_member['job'] == 'Director':
                return crew_member['name']
    return "Unknown"

def get_movie_genres(movie_details):
    """Extract genre names from movie details"""
    genres = movie_details.get('genres', [])
    return [genre['name'] for genre in genres]

def get_streaming_providers(movie_id):
    """Get streaming availability (Netflix, Hulu, etc.) for a movie"""
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/watch/providers"
    params = {
        "api_key": TMDB_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        # Return US streaming providers
        return data.get('results', {}).get('US', {})
    except requests.exceptions.RequestException as e:
        print(f"Error getting streaming providers: {e}")
        return None

def get_genres():
    """Get list of all movie genres"""
    url = f"{TMDB_BASE_URL}/genre/movie/list"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US"
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting genres: {e}")
        return None


def get_trending_movies(time_window="week"):
    """Get trending movies (day or week)"""
    url = f"{TMDB_BASE_URL}/trending/movie/{time_window}"
    params = {
        "api_key": TMDB_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting trending movies: {e}")
        return None

def get_poster_url(poster_path, size="w500"):
    """Build full URL for movie poster"""
    if poster_path:
        return f"{TMDB_IMAGE_BASE}/{size}{poster_path}"
    return None

def get_backdrop_url(backdrop_path, size="w1280"):
    """Build full URL for movie backdrop"""
    if backdrop_path:
        return f"{TMDB_IMAGE_BASE}/{size}{backdrop_path}"
    return None
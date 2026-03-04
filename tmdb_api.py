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

def search_person(name):
    """Search for a person (actor or director) by name, returns list of results"""
    url = f"{TMDB_BASE_URL}/search/person"
    params = {
        "api_key": TMDB_API_KEY,
        "query": name,
        "language": "en-US"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error searching person: {e}")
        return None


def discover_movies(genre_id=None, year=None, year_from=None, year_to=None,
                    min_rating=None, min_vote_count=None,
                    with_cast=None, with_crew=None,
                    sort_by="popularity.desc", page=1):
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
        params["primary_release_year"] = year
    if year_from:
        params["primary_release_date.gte"] = f"{year_from}-01-01"
    if year_to:
        params["primary_release_date.lte"] = f"{year_to}-12-31"
    if min_rating:
        params["vote_average.gte"] = min_rating
    if min_vote_count:
        params["vote_count.gte"] = min_vote_count
    if with_cast:
        params["with_cast"] = with_cast
    if with_crew:
        params["with_crew"] = with_crew
    
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

def get_movie_actors(movie_details, max_actors=5):
    """Extract main actors from movie credits"""
    actors = []
    if 'credits' in movie_details and 'cast' in movie_details['credits']:
        for cast_member in movie_details['credits']['cast'][:max_actors]:
            actors.append(cast_member['name'])
    return actors

def get_backdrop_url(backdrop_path, size="w1280"):
    """Build full URL for movie backdrop"""
    if backdrop_path:
        return f"{TMDB_IMAGE_BASE}/{size}{backdrop_path}"
    return None

def user_rate_movies(user_id, movie_id, rating, review):
    """Allow a user to rate a movie"""
    # Implementation for user rating functionality
    pass

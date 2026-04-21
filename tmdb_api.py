# tmdb_api.py
import requests
import os
import time

# ── In-memory TTL cache ───────────────────────────────────────────
_tmdb_cache: dict = {}

def _cache_get(key: str):
    entry = _tmdb_cache.get(key)
    if entry and time.time() < entry['expires']:
        return entry['value']
    return None

def _cache_set(key: str, value, ttl: int):
    _tmdb_cache[key] = {'value': value, 'expires': time.time() + ttl}
# ─────────────────────────────────────────────────────────────────

try:
    from config import TMDB_API_KEY, TMDB_BASE_URL, TMDB_IMAGE_BASE
except ImportError:
    TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
    TMDB_BASE_URL = os.environ.get("TMDB_BASE_URL", "https://api.themoviedb.org/3")
    TMDB_IMAGE_BASE = os.environ.get("TMDB_IMAGE_BASE", "https://image.tmdb.org/t/p")


#Query TMDB API for movies, genres, actors, etc. and return results as JSON
def search_movies(query, page=1):
    cache_key = f"search:{query}:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

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
        result = response.json()
        _cache_set(cache_key, result, 300)  # 5 min
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error searching movies: {e}")
        return None


#Get detailed information about a specific movie, including credits, videos, streaming providers, similar movies, and keywords
def get_movie_details(movie_id):
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


#Get top-rated movies of all time from the API. This can be used to show an "All Time Greats" section.
def get_top_rated_movies(page=1):
    url = f"{TMDB_BASE_URL}/movie/top_rated"
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
        print(f"Error getting top rated movies: {e}")
        return None


#Get currently popular movies from the API, with pagination support. This can be used to show trending movies on the home page or in a "Popular Movies" section.
def get_popular_movies(page=1):
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


#Searches for a person (actor or director) by name, returns list of results. This can be used to allow users to search for movies by actor or director.
def search_person(name):
    cache_key = f"person:{name}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{TMDB_BASE_URL}/search/person"
    params = {
        "api_key": TMDB_API_KEY,
        "query": name,
        "language": "en-US"
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 3600)  # 1 hour
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error searching person: {e}")
        return None


#Discover movies from the API using various filters of the users choice, like genre, actor, and more...
def discover_movies(genre_id=None, year=None, year_from=None, year_to=None,
                    min_rating=None, min_vote_count=None,
                    with_cast=None, with_crew=None,
                    with_watch_providers=None, watch_region="US",
                    sort_by="popularity.desc", page=1):
    cache_key = (f"discover:{genre_id}:{year}:{year_from}:{year_to}:{min_rating}:"
                 f"{min_vote_count}:{with_cast}:{with_crew}:{with_watch_providers}:"
                 f"{watch_region}:{sort_by}:{page}")
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

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
    if with_watch_providers:
        params["with_watch_providers"] = with_watch_providers
        params["watch_region"] = watch_region

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 300)  # 5 min
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error discovering movies: {e}")
        return None
    
#Extract director from movie credits
def get_movie_director(movie_details):
    if 'credits' in movie_details and 'crew' in movie_details['credits']:
        for crew_member in movie_details['credits']['crew']:
            if crew_member['job'] == 'Director':
                return crew_member['name']
    return "Unknown"


#Get the actual movie genres from the movie details, which are returned as a list of genre objects with id and name. This can be used to display the genres of a movie on the movie details page.
def get_movie_genres(movie_details):
    genres = movie_details.get('genres', [])
    return [genre['name'] for genre in genres]

#Get the actual streaming providers for a movie, which are returned as a list of provider objects with id, name, and logo. This can be used to show users where they can watch a movie online.
def get_streaming_providers(movie_id):
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

#Get the actual movie genres 
def get_genres():
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

#Get trending movies (day or week) from the API, which can be used to show users what movies are currently popular and trending.
def get_trending_movies(time_window="week"):
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

#Get the full URL for a movie poster...
def get_poster_url(poster_path, size="w500"):
    if poster_path:
        return f"{TMDB_IMAGE_BASE}/{size}{poster_path}"
    return None

#Returns the 5 most prominent actors in a movie, can be adjusted for more than 5
def get_movie_actors(movie_details, max_actors=5):
    actors = []
    if 'credits' in movie_details and 'cast' in movie_details['credits']:
        for cast_member in movie_details['credits']['cast'][:max_actors]:
            actors.append(cast_member['name'])
    return actors

#Get the full URL for a movie backdrop, which can be used to display a large background image on the movie details page or in a carousel of movies.
def get_backdrop_url(backdrop_path, size="w1280"):
    if backdrop_path:
        return f"{TMDB_IMAGE_BASE}/{size}{backdrop_path}"
    return None

#Allow's a user to rate a movie, which is stored in firebase.
def user_rate_movies(user_id, movie_id, rating, review):
    # Implementation for user rating functionality
    pass


def watch_later(user_id, movie_id):
    # Implementation for watch later functionality
    pass


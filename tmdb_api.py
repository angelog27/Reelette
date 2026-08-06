# tmdb_api.py
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import os
import time

# ── Shared HTTP session ───────────────────────────────────────────
# A single pooled Session reuses TCP+TLS connections across every TMDB
# call instead of doing a fresh DNS+handshake each time. Combined with a
# connection pool large enough for the streaming-provider fan-out, this
# is the single biggest per-request latency win.
#
# (connect, read) timeout — applied to every request so a hung TMDB call
# can never block a worker indefinitely.
_TMDB_TIMEOUT = (3.05, 8)

_session = requests.Session()
_retry = Retry(
    total=2,
    backoff_factor=0.3,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=frozenset(["GET"]),
    raise_on_status=False,
)
_adapter = HTTPAdapter(pool_connections=20, pool_maxsize=50, max_retries=_retry)
_session.mount("https://", _adapter)
_session.mount("http://", _adapter)

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
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
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
        "append_to_response": "credits,videos,watch/providers,similar,keywords,images",
        "include_image_language": "en,null",
    }
    
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting movie details: {e}")
        return None


#Get top-rated movies of all time from the API. This can be used to show an "All Time Greats" section.
def get_top_rated_movies(page=1):
    cache_key = f"top_rated:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/top_rated"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)  # 20 min
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting top rated movies: {e}")
        return None


#Get currently popular movies from the API, with pagination support. This can be used to show trending movies on the home page or in a "Popular Movies" section.
def get_popular_movies(page=1):
    cache_key = f"popular:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/popular"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)  # 20 min
        return result
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
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 3600)  # 1 hour
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error searching person: {e}")
        return None


#Returns a person's movie credits (everything they've acted in). Used to let
#users tap a cast member and browse the actor's other films.
def get_person_movie_credits(person_id):
    cache_key = f"person_credits:{person_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{TMDB_BASE_URL}/person/{person_id}/movie_credits"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US"
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 86400)  # 24 h — a filmography rarely changes
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error fetching person credits: {e}")
        return None


#Discover movies from the API using various filters of the users choice, like genre, actor, and more...
def discover_movies(genre_id=None, year=None, year_from=None, year_to=None,
                    min_rating=None, min_vote_count=None,
                    with_cast=None, with_crew=None,
                    with_watch_providers=None, watch_region="US",
                    with_companies=None, with_keywords=None,
                    sort_by="popularity.desc", page=1):
    cache_key = (f"discover:{genre_id}:{year}:{year_from}:{year_to}:{min_rating}:"
                 f"{min_vote_count}:{with_cast}:{with_crew}:{with_watch_providers}:"
                 f"{watch_region}:{with_companies}:{with_keywords}:{sort_by}:{page}")
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    url = f"{TMDB_BASE_URL}/discover/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": sort_by,
        "include_adult": False,
        "with_original_language": "en",
        "vote_count.gte": 100,
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
    if with_companies:
        params["with_companies"] = with_companies
    if with_keywords:
        params["with_keywords"] = with_keywords

    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
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
    cache_key = f"providers:{movie_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/watch/providers"
    params = {
        "api_key": TMDB_API_KEY
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        result = data.get('results', {}).get('US', {})
        _cache_set(cache_key, result, 21600)  # 6 h — matches _PROVIDER_TTL in app.py
        return result
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
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error getting genres: {e}")
        return None

#Get trending movies (day or week) from the API, which can be used to show users what movies are currently popular and trending.
def get_trending_movies(time_window="week"):
    cache_key = f"trending:{time_window}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/trending/movie/{time_window}"
    params = {
        "api_key": TMDB_API_KEY
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)  # 20 min
        return result
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

def get_movie_images(movie_id):
    """Return ALL backdrop URLs for a movie with no language filtering, sorted by vote_average desc."""
    cache_key = f"movie_images_v3:{movie_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/images"
    # include_image_language=null gets language-neutral backdrops (the vast majority);
    # omitting `language` entirely avoids TMDB's default en-US filter.
    params = {"api_key": TMDB_API_KEY, "include_image_language": "en,null,xx"}
    try:
        r = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        backdrops = sorted(data.get('backdrops', []), key=lambda x: x.get('vote_average', 0), reverse=True)
        result = [get_backdrop_url(b['file_path']) for b in backdrops if b.get('file_path')]
        _cache_set(cache_key, result, 86400)  # 24 h — backdrops rarely change
        return result
    except Exception as e:
        print(f"[images] movie {movie_id} error: {e}")
        return []


def get_show_images(show_id):
    """Return ALL backdrop URLs for a TV show with no language filtering, sorted by vote_average desc."""
    cache_key = f"show_images_v3:{show_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/{show_id}/images"
    params = {"api_key": TMDB_API_KEY, "include_image_language": "en,null,xx"}
    try:
        r = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        backdrops = sorted(data.get('backdrops', []), key=lambda x: x.get('vote_average', 0), reverse=True)
        result = [get_backdrop_url(b['file_path']) for b in backdrops if b.get('file_path')]
        _cache_set(cache_key, result, 86400)  # 24 h
        return result
    except Exception as e:
        print(f"[images] show {show_id} error: {e}")
        return []


def get_movie_logo(movie_id):
    """Return the best English logo URL for a movie, or None."""
    cache_key = f"movie_logo_v1:{movie_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/images"
    params = {"api_key": TMDB_API_KEY, "include_image_language": "en,null"}
    try:
        r = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        logos = data.get('logos', [])
        eng = [l for l in logos if l.get('iso_639_1') == 'en']
        best = max(eng or logos, key=lambda x: x.get('vote_average', 0), default=None)
        result = f"https://image.tmdb.org/t/p/w500{best['file_path']}" if best else None
        _cache_set(cache_key, result, 86400)
        return result
    except Exception as e:
        print(f"[logo] movie {movie_id} error: {e}")
        return None


def get_show_logo(show_id):
    """Return the best English logo URL for a TV show, or None."""
    cache_key = f"show_logo_v1:{show_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/{show_id}/images"
    params = {"api_key": TMDB_API_KEY, "include_image_language": "en,null"}
    try:
        r = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        logos = data.get('logos', [])
        eng = [l for l in logos if l.get('iso_639_1') == 'en']
        best = max(eng or logos, key=lambda x: x.get('vote_average', 0), default=None)
        result = f"https://image.tmdb.org/t/p/w500{best['file_path']}" if best else None
        _cache_set(cache_key, result, 86400)
        return result
    except Exception as e:
        print(f"[logo] show {show_id} error: {e}")
        return None


def get_upcoming_movies(page=1):
    cache_key = f"upcoming:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/upcoming"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting upcoming movies: {e}")
        return None


def get_now_playing_movies(page=1):
    cache_key = f"now_playing:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/now_playing"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)  # 20 min
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting now playing movies: {e}")
        return None


def get_movie_recommendations(movie_id, page=1):
    cache_key = f"recommendations:{movie_id}:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/movie/{movie_id}/recommendations"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "page": page
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)  # 20 min
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting movie recommendations: {e}")
        return None


#Allow's a user to rate a movie, which is stored in firebase.
def user_rate_movies(user_id, movie_id, rating, review):
    # Implementation for user rating functionality
    pass


def watch_later(user_id, movie_id):
    # Implementation for watch later functionality
    pass


# ── TV Show Functions ─────────────────────────────────────────────

def search_tv_shows(query, page=1):
    cache_key = f"tv_search:{query}:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/search/tv"
    params = {"api_key": TMDB_API_KEY, "query": query, "language": "en-US", "page": page, "include_adult": False}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 300)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error searching TV shows: {e}")
        return None


def get_popular_tv_shows(page=1):
    cache_key = f"tv_popular:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/popular"
    params = {"api_key": TMDB_API_KEY, "language": "en-US", "page": page}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting popular TV shows: {e}")
        return None


def get_top_rated_tv_shows(page=1):
    cache_key = f"tv_top_rated:{page}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/top_rated"
    params = {"api_key": TMDB_API_KEY, "language": "en-US", "page": page}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting top rated TV shows: {e}")
        return None


def get_trending_tv_shows(time_window="week"):
    cache_key = f"tv_trending:{time_window}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/trending/tv/{time_window}"
    params = {"api_key": TMDB_API_KEY}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 1200)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting trending TV shows: {e}")
        return None


def get_tv_show_details(show_id):
    cache_key = f"tv_detail:{show_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/{show_id}"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "append_to_response": "credits,videos,watch/providers,similar,aggregate_credits,images",
        "include_image_language": "en,null",
    }
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 43200)  # 12 h
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting TV show details: {e}")
        return None


def discover_tv_shows(genre_id=None, year_from=None, year_to=None,
                      min_rating=None, min_vote_count=None,
                      with_watch_providers=None, watch_region="US",
                      sort_by="popularity.desc", page=1):
    cache_key = (f"tv_discover:{genre_id}:{year_from}:{year_to}:{min_rating}:"
                 f"{min_vote_count}:{with_watch_providers}:{watch_region}:{sort_by}:{page}")
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/discover/tv"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "en-US",
        "sort_by": sort_by,
        "include_adult": False,
        "page": page,
    }
    if genre_id:
        params["with_genres"] = genre_id
    if year_from:
        params["first_air_date.gte"] = f"{year_from}-01-01"
    if year_to:
        params["first_air_date.lte"] = f"{year_to}-12-31"
    if min_rating:
        params["vote_average.gte"] = min_rating
    if min_vote_count:
        params["vote_count.gte"] = min_vote_count
    if with_watch_providers:
        params["with_watch_providers"] = with_watch_providers
        params["watch_region"] = watch_region
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 300)
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error discovering TV shows: {e}")
        return None


def get_tv_genres():
    cache_key = "tv_genres"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/genre/tv/list"
    params = {"api_key": TMDB_API_KEY, "language": "en-US"}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        result = response.json()
        _cache_set(cache_key, result, 86400)  # 24 h — genres rarely change
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting TV genres: {e}")
        return None


def get_tv_streaming_providers(show_id):
    cache_key = f"tv_providers:{show_id}"
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached
    url = f"{TMDB_BASE_URL}/tv/{show_id}/watch/providers"
    params = {"api_key": TMDB_API_KEY}
    try:
        response = _session.get(url, params=params, timeout=_TMDB_TIMEOUT)
        response.raise_for_status()
        data = response.json()
        result = data.get('results', {}).get('US', {})
        _cache_set(cache_key, result, 21600)  # 6 h
        return result
    except requests.exceptions.RequestException as e:
        print(f"Error getting TV streaming providers: {e}")
        return None


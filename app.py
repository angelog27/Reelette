from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import time
import json
from datetime import datetime, timezone

try:
    from config import SECRET_KEY
except ImportError:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret")

try:
    from config import CORS_ORIGINS
except ImportError:
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
from firebase_helper import (
    create_user, verify_user, get_user_data,
    update_streaming_services, get_user_streaming_services,
    add_to_watchlist, get_watchlist, remove_from_watchlist,
    add_watched_movie, get_watched_movies, get_watched_movie, update_watched_rating,
    create_post, get_feed, like_post, add_reply, get_replies, delete_post, send_password_reset_email,
    update_user_profile, get_user_movie_preferences, update_movie_preferences, search_users,
    send_friend_request, get_friend_requests, accept_friend_request, reject_friend_request,
    remove_friend, get_friends,
    create_group, get_group, get_user_groups, add_group_member, remove_group_member, delete_group,
    add_to_group_watchlist, remove_from_group_watchlist, spin_group_reelette,
    update_user_avatar, update_user_last_seen,
    get_user_public_profile, get_group_member_profiles, get_members_streaming_services,
    log_roulette_spin, get_roulette_history, get_friends_roulette_history, save_quiz_result,
    get_notifications, mark_notification_read, mark_all_notifications_read,
    get_or_create_conversation, get_conversations, get_messages, send_message, mark_conversation_read,
)
from tmdb_api import (
    search_movies, discover_movies, get_popular_movies, get_movie_details,
    get_streaming_providers, get_genres, get_trending_movies, get_top_rated_movies,
    get_poster_url, get_backdrop_url, search_person,
    get_now_playing_movies, get_movie_recommendations, get_upcoming_movies,
)

app = Flask(__name__)

import re
# Convert string patterns starting with "regex:" into compiled regex objects
_cors_origins = [
    re.compile(o[6:]) if o.startswith("regex:") else o
    for o in CORS_ORIGINS
]
CORS(app, origins=_cors_origins)


app.secret_key = SECRET_KEY

# ── Genre cache ──────────────────────────────────────────────────
_genre_cache = {}

def get_genre_map():
    global _genre_cache
    if not _genre_cache:
        result = get_genres()
        if result and 'genres' in result:
            _genre_cache = {g['id']: g['name'] for g in result['genres']}
    return _genre_cache

# ── Streaming provider constants ─────────────────────────────────
# Maps Firebase service keys → TMDB provider IDs
STREAMING_PROVIDER_IDS = {
    'netflix':     8,
    'hulu':        15,
    'disneyPlus':  337,
    'hboMax':      1899,
    'amazonPrime': 9,
    'appleTV':     350,
    'paramount':   531,
    'peacock':     386,
}
# TMDB provider ID → friendly display name shown on the badge
PROVIDER_DISPLAY = {
    8:    'Netflix',
    15:   'Hulu',
    337:  'Disney+',
    1899: 'Max',
    9:    'Prime Video',
    350:  'Apple TV+',
    531:  'Paramount+',
    386:  'Peacock',
}

#Formats our movies to the shape our frontend expects, and attaches streaming service info in parallel
def format_movie(movie_data, streaming_service=''):
    genre_map = get_genre_map()

    genre_ids = movie_data.get('genre_ids', [])
    if genre_ids:
        genres = [genre_map.get(gid, '') for gid in genre_ids if gid in genre_map]
    else:
        genres = [g['name'] for g in movie_data.get('genres', [])]

    release_date = movie_data.get('release_date', '')
    year = int(release_date[:4]) if release_date and len(release_date) >= 4 else 0

    return {
        'id': str(movie_data['id']),
        'title': movie_data.get('title', ''),
        'year': year,
        'genres': [g for g in genres if g],
        'rating': round(movie_data.get('vote_average', 0), 1),
        'poster': get_poster_url(movie_data.get('poster_path'), 'w185') or '',
        'backdrop': get_backdrop_url(movie_data.get('backdrop_path')) or '',
        'overview': movie_data.get('overview', ''),
        'streamingService': streaming_service,
    }

# ── Shared thread pool ───────────────────────────────────────────
# One persistent pool instead of spinning up a new one per request
_executor = ThreadPoolExecutor(max_workers=20)

# ── Generic TTL cache ────────────────────────────────────────────
# Stores any key → (value, expiry_timestamp)
_cache: dict = {}

def _cache_get(key):
    entry = _cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None

def _cache_set(key, value, ttl):
    _cache[key] = (value, time.time() + ttl)

# TTLs
# this is separate from the main cache since streaming info is more expensive to fetch and we want finer control over its expiry
_PROVIDER_TTL     = 6  * 60 * 60   # 6 h  — streaming availability

# We want to refresh the main movie lists more often since they change frequently, but individual movie details can be cached longer since they don't change as often and are more expensive to fetch.
_MOVIE_LIST_TTL   = 20 * 60         # 20 min — popular/trending/top-rated lists
_MOVIE_DETAIL_TTL = 12 * 60 * 60   # 12 h  — credits, overview, etc.
_USER_PROFILE_TTL    = 60   # 60 s  — user profile (GET /api/user/<uid>)
_FEED_TTL            = 30   # 30 s  — social feed (GET /api/feed)
_PUBLIC_PROFILE_TTL  = 60   # 60 s  — public profile (GET /api/user/<uid>/public)
_MEMBER_PROFILES_TTL = 120  # 2 min — group member profiles (GET /api/groups/<gid>/members/profiles)
_USER_GROUPS_TTL     = 60   # 60 s  — user groups (GET /api/user/<uid>/groups)
_MEMBER_SERVICES_TTL = 60   # 60 s  — member streaming services (GET /api/groups/<gid>/members/services)
_FRIENDS_TTL         = 60   # 60 s  — friends list (GET /api/friends/<uid>)
_FRIENDS_HISTORY_TTL = 60   # 60 s  — friends roulette history (GET /api/roulette/<uid>/friends-history)
_NOTIF_TTL           = 30   # 30 s  — notifications (GET /api/user/<uid>/notifications)
_WATCHED_TTL         = 60   # 60 s  — watched movies list (GET /api/watched/<user_id>)

# In-memory provider cache: movie_id → (service_name, expiry_timestamp)
_provider_cache: dict[int, tuple[str, float]] = {}

def _fetch_streaming_for_movie(movie_data):
    movie_id = movie_data['id']
    cached = _provider_cache.get(movie_id)
    if cached and time.time() < cached[1]:
        return cached[0]
    try:
        providers = get_streaming_providers(movie_id)
        if not providers:
            _provider_cache[movie_id] = ('', time.time() + _PROVIDER_TTL)
            return ''
        for p in providers.get('flatrate', []):
            name = PROVIDER_DISPLAY.get(p.get('provider_id'))
            if name:
                _provider_cache[movie_id] = (name, time.time() + _PROVIDER_TTL)
                return name
    except Exception:
        pass
    _provider_cache[movie_id] = ('', time.time() + _PROVIDER_TTL)
    return ''

# Fetches streaming info for a list of movies in parallel and formats them for the frontend.
def fetch_movies_with_streaming(movies_data):
    futures = {_executor.submit(_fetch_streaming_for_movie, m): m for m in movies_data}
    service_map = {}
    for future in as_completed(futures):
        movie = futures[future]
        try:
            service_map[movie['id']] = future.result()
        except Exception:
            service_map[movie['id']] = ''
    return [format_movie(m, service_map.get(m['id'], '')) for m in movies_data]

# Recursively converts any Firestore DatetimeWithNanoseconds objects in the data to ISO strings for JSON serialization.
def serialize_timestamps(obj):
    if isinstance(obj, dict):
        return {k: serialize_timestamps(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_timestamps(i) for i in obj]
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return obj

# ── Auth Routes ──────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password required'}), 400
    result = verify_user(email, password)
    return jsonify(result)

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    username = data.get('username', '').strip()
    if not email or not password or not username:
        return jsonify({'success': False, 'message': 'Email, password, and username are required'}), 400
    result = create_user(email, password, username)
    return jsonify(result)

@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({
            'success': False,
            'message': 'Email is required'
        }), 400

    result = send_password_reset_email(email)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

# ── Movie Routes ─────────────────────────────────────────────────

@app.route('/api/movies/popular', methods=['GET'])
def popular_movies():
    page = request.args.get('page', 1, type=int)
    cache_key = f'popular:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_popular_movies(page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/trending', methods=['GET'])
def trending_movies():
    time_window = request.args.get('window', 'week')
    cache_key = f'trending:{time_window}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_trending_movies(time_window=time_window)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/top_rated', methods=['GET'])
def top_rated_movies():
    page = request.args.get('page', 1, type=int)
    cache_key = f'top_rated:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_top_rated_movies(page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/upcoming', methods=['GET'])
def upcoming_movies():
    page = request.args.get('page', 1, type=int)
    cache_key = f'upcoming:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_upcoming_movies(page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/now_playing', methods=['GET'])
def now_playing_movies():
    page = request.args.get('page', 1, type=int)
    cache_key = f'now_playing:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_now_playing_movies(page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/<int:movie_id>/recommendations', methods=['GET'])
def movie_recommendations(movie_id):
    cache_key = f'recommendations:{movie_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_movie_recommendations(movie_id)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    if not query:
        return jsonify({'movies': []})
    cache_key = f'search:{query.lower()}:{page}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'movies': cached})
    data = search_movies(query, page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

SORT_MAP = {
    'popularity': 'popularity.desc',
    'rating':     'vote_average.desc',
    'newest':     'release_date.desc',
    'oldest':     'release_date.asc',
}

@app.route('/api/movies/discover', methods=['POST'])
def discover():
    data = request.get_json() or {}

    # Cache key is the full sorted request body — same filters always hit the same entry
    cache_key = f'discover:{json.dumps(data, sort_keys=True, default=str)}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'movies': cached})

    genre_id   = data.get('genre_id') or None
    year_from  = data.get('year_from') or None
    year_to    = data.get('year_to') or None
    min_rating = data.get('min_rating') or None
    sort_by    = SORT_MAP.get(data.get('sort_by', 'popularity'), 'popularity.desc')
    page       = data.get('page', 1)

    # Build pipe-separated watch provider IDs from the services dict the frontend sends
    # e.g. { "netflix": true, "hulu": false } → "8"
    services_filter = data.get('services_filter') or {}
    active_provider_ids = [
        str(STREAMING_PROVIDER_IDS[key])
        for key, enabled in services_filter.items()
        if enabled and key in STREAMING_PROVIDER_IDS
    ]
    with_watch_providers = '|'.join(active_provider_ids) if active_provider_ids else None

    # Resolve actor name → TMDB person ID
    with_cast = None
    actor_name = (data.get('actor') or '').strip()
    if actor_name:
        res = search_person(actor_name)
        if res and res.get('results'):
            with_cast = str(res['results'][0]['id'])

    # Resolve director name → TMDB person ID
    with_crew = None
    director_name = (data.get('director') or '').strip()
    if director_name:
        res = search_person(director_name)
        if res and res.get('results'):
            with_crew = str(res['results'][0]['id'])

    min_vote_count = 100 if min_rating else None

    result = discover_movies(
        genre_id=genre_id,
        year_from=year_from,
        year_to=year_to,
        min_rating=min_rating,
        min_vote_count=min_vote_count,
        with_cast=with_cast,
        with_crew=with_crew,
        with_watch_providers=with_watch_providers,
        sort_by=sort_by,
        page=page,
    )

    if not result:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(result.get('results', []))
    _cache_set(cache_key, movies, _MOVIE_LIST_TTL)
    return jsonify({'movies': movies})

@app.route('/api/movies/<int:movie_id>', methods=['GET'])
def movie_details(movie_id):
    cache_key = f'detail:{movie_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)
    data = get_movie_details(movie_id)
    if not data:
        return jsonify({'error': 'Movie not found'}), 404
    _cache_set(cache_key, data, _MOVIE_DETAIL_TTL)
    return jsonify(data)

@app.route('/api/movies/<int:movie_id>/providers', methods=['GET'])
def movie_providers(movie_id):
    data = get_streaming_providers(movie_id)
    return jsonify(data or {})

@app.route('/api/genres', methods=['GET'])
def genres():
    data = get_genres()
    return jsonify(data or {'genres': []})

@app.route('/api/person/search', methods=['GET'])
def person_search_route():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({'profile_path': None})
    res = search_person(name)
    if res and res.get('results'):
        profile_path = res['results'][0].get('profile_path')
        return jsonify({'profile_path': profile_path})
    return jsonify({'profile_path': None})

# ── User Routes ──────────────────────────────────────────────────

@app.route('/api/user/<user_id>', methods=['GET'])
def user_data(user_id):
    cache_key = f'user:{user_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)
    try:
        data = get_user_data(user_id)
    except Exception as e:
        err_str = str(e)
        app.logger.error(f"GET /api/user/{user_id} error: {err_str}")
        if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
            return jsonify({'error': 'Service temporarily unavailable'}), 503
        return jsonify({'error': 'Failed to load user profile'}), 500
    if data is None:
        return jsonify({'error': 'User not found'}), 404
    result = serialize_timestamps(data)
    _cache_set(cache_key, result, _USER_PROFILE_TTL)
    return jsonify(result)

@app.route('/api/user/<user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.get_json() or {}
    result = update_user_profile(user_id, data)
    if result.get('success'):
        # Bust the profile cache so the next GET reflects the saved changes
        _cache.pop(f'user:{user_id}', None)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

@app.route('/api/user/<user_id>/streaming', methods=['GET'])
def get_streaming(user_id):
    services = get_user_streaming_services(user_id)
    return jsonify(services)

@app.route('/api/user/<user_id>/streaming', methods=['PUT'])
def update_streaming(user_id):
    services = request.get_json() or {}
    result = update_streaming_services(user_id, services)
    if result.get('success'):
        # Streaming prefs changed — bust user profile cache and any group services caches
        # that include this user (we don't know which groups, so bust all services:* entries)
        _cache.pop(f'user:{user_id}', None)
        for key in [k for k in _cache if k.startswith('services:')]:
            _cache.pop(key, None)
    return jsonify(result)

@app.route('/api/user/<user_id>/movie-preferences', methods=['GET'])
def get_movie_preferences(user_id):
    preferences = get_user_movie_preferences(user_id)
    return jsonify(preferences)

@app.route('/api/user/<user_id>/movie-preferences', methods=['PUT'])
def update_movie_preferences_route(user_id):
    preferences = request.get_json() or {}
    result = update_movie_preferences(user_id, preferences)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

# ── Watchlist Routes ─────────────────────────────────────────────

@app.route('/api/watchlist/<user_id>', methods=['GET'])
def get_user_watchlist(user_id):
    return jsonify({'movies': get_watchlist(user_id)})

@app.route('/api/watchlist/<user_id>', methods=['POST'])
def add_to_user_watchlist(user_id):
    data = request.get_json() or {}
    movie_id = data.get('movie_id')
    if not movie_id:
        return jsonify({'success': False, 'message': 'movie_id required'}), 400
    return jsonify(add_to_watchlist(user_id, movie_id))

@app.route('/api/watchlist/<user_id>/<movie_id>', methods=['DELETE'])
def remove_from_user_watchlist(user_id, movie_id):
    return jsonify(remove_from_watchlist(user_id, movie_id))

# ── Watched Movies Routes ────────────────────────────────────────

@app.route('/api/watched/<user_id>', methods=['GET'])
def get_user_watched(user_id):
    limit  = request.args.get('limit', 20, type=int)
    cursor = request.args.get('cursor')          # ISO watched_at of last item from previous page
    cache_key = f'watched:{user_id}:{limit}:{cursor or ""}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'movies': cached})
    movies = serialize_timestamps(get_watched_movies(user_id, limit=limit, start_after_time=cursor))
    _cache_set(cache_key, movies, _WATCHED_TTL)
    return jsonify({'movies': movies})

@app.route('/api/watched/<user_id>/<movie_id>', methods=['GET'])
def get_user_watched_movie(user_id, movie_id):
    entry = get_watched_movie(user_id, movie_id)
    if not entry:
        return jsonify({'watched': False})
    return jsonify({'watched': True, **serialize_timestamps(entry)})

# This endpoint is used both for initially marking a movie as watched and for adding a user rating + comment. If the movie is already marked as watched, it will update the existing entry with the new rating/comment.
@app.route('/api/watched/<user_id>', methods=['POST'])
def add_user_watched(user_id):
    data = request.get_json() or {}
    movie = data.get('movie')
    user_rating = data.get('user_rating')
    comment = data.get('comment', '')
    if not movie or user_rating is None:
        return jsonify({'success': False, 'message': 'movie and user_rating required'}), 400
    result = add_watched_movie(user_id, movie, user_rating, comment)
    if result.get('success'):
        _cache.pop(f'watched:{user_id}', None)
    return jsonify(result)

@app.route('/api/watched/<user_id>/<movie_id>', methods=['PUT'])
def update_user_watched_rating(user_id, movie_id):
    data = request.get_json() or {}
    new_rating = data.get('rating')
    comment = data.get('comment')
    if new_rating is None:
        return jsonify({'success': False, 'message': 'rating required'}), 400
    result = update_watched_rating(user_id, movie_id, new_rating, comment)
    if result.get('success'):
        _cache.pop(f'watched:{user_id}', None)
    return jsonify(result)

# ── Social Feed Routes ───────────────────────────────────────────

@app.route('/api/feed', methods=['GET'])
def social_feed():
    limit = request.args.get('limit', 20, type=int)
    cache_key = f'feed:{limit}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'posts': cached})
    posts = get_feed(limit=limit)
    serialized = serialize_timestamps(posts)
    _cache_set(cache_key, serialized, _FEED_TTL)
    return jsonify({'posts': serialized})

@app.route('/api/feed', methods=['POST'])
def create_feed_post():
    data = request.get_json() or {}
    user_id    = data.get('user_id', '').strip()
    username   = data.get('username', '').strip()
    message    = data.get('message', '').strip()
    movie_title = data.get('movie_title', '').strip()
    movie_id     = data.get('movie_id', '')
    movie_poster = data.get('movie_poster', '')
    rating       = data.get('rating', 0)
    if not all([user_id, username, message, movie_title]):
        return jsonify({'success': False, 'message': 'user_id, username, message, and movie_title are required'}), 400
    result = create_post(user_id, username, message, movie_title, movie_id, movie_poster, rating)
    if result.get('success'):
        # Bust feed caches so the new post is visible immediately
        for key in [k for k in _cache if k.startswith('feed:')]:
            _cache.pop(key, None)
    return jsonify(result)

@app.route('/api/feed/<post_id>/like', methods=['POST'])
def like_feed_post(post_id):
    data = request.get_json() or {}
    user_id = data.get('user_id', '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id required'}), 400
    return jsonify(like_post(post_id, user_id))

@app.route('/api/feed/<post_id>/replies', methods=['GET'])
def get_post_replies(post_id):
    return jsonify({'replies': serialize_timestamps(get_replies(post_id))})

@app.route('/api/feed/<post_id>/reply', methods=['POST'])
def reply_to_post(post_id):
    data = request.get_json() or {}
    user_id  = data.get('user_id', '').strip()
    username = data.get('username', '').strip()
    message  = data.get('message', '').strip()
    if not all([user_id, username, message]):
        return jsonify({'success': False, 'message': 'user_id, username, and message are required'}), 400
    return jsonify(add_reply(post_id, user_id, username, message))

@app.route('/api/feed/<post_id>', methods=['DELETE'])
def delete_feed_post(post_id):
    data = request.get_json() or {}
    user_id = data.get('user_id', '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id required'}), 400
    return jsonify(delete_post(post_id, user_id))

# ── User Profile Update / Avatar / Presence ──────────────────────

@app.route('/api/user/<user_id>/profile', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json() or {}
    result = update_user_profile(user_id, data)
    return jsonify(result)

# ── Quiz Routes ──────────────────────────────────────────────────

@app.route('/api/user/<uid>/profile', methods=['GET'])
def get_user_profile(uid):
    # Check the shared 60 s user cache before going to Firestore
    cached = _cache_get(f'user:{uid}')
    if cached:
        return jsonify({'quizCompleted': cached.get('quizCompleted', True)})
    try:
        data = get_user_data(uid)
    except Exception:
        return jsonify({'quizCompleted': False})
    if not data:
        return jsonify({'quizCompleted': False})
    result = serialize_timestamps(data)
    _cache_set(f'user:{uid}', result, _USER_PROFILE_TTL)
    return jsonify({'quizCompleted': result.get('quizCompleted', True)})

@app.route('/api/quiz/complete', methods=['POST'])
def complete_quiz():
    data = request.get_json() or {}
    uid = data.get('uid', '').strip()
    top_genre = data.get('topGenre')
    answers = data.get('answers', {})
    if not uid:
        return jsonify({'success': False, 'message': 'uid required'}), 400
    from firebase_helper import save_quiz_result
    save_quiz_result(uid, top_genre, answers)
    return jsonify({'success': True})

@app.route('/api/user/<user_id>/avatar', methods=['PUT'])
def update_avatar_route(user_id):
    data = request.get_json() or {}
    avatar_url = data.get('avatar_url', '').strip()
    if not avatar_url:
        return jsonify({'success': False, 'message': 'avatar_url required'}), 400
    return jsonify(update_user_avatar(user_id, avatar_url))

@app.route('/api/user/<user_id>/lastseen', methods=['PUT'])
def update_lastseen_route(user_id):
    return jsonify(update_user_last_seen(user_id))

@app.route('/api/user/<user_id>/public', methods=['GET'])
def get_public_profile(user_id):
    cache_key = f'public:{user_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)
    profile = get_user_public_profile(user_id)
    if not profile:
        return jsonify({'error': 'User not found'}), 404
    result = serialize_timestamps(profile)
    _cache_set(cache_key, result, _PUBLIC_PROFILE_TTL)
    return jsonify(result)

# ── User Search ──────────────────────────────────────────────────

@app.route('/api/users/search', methods=['GET'])
def search_users_route():
    query = request.args.get('q', '').strip()
    exclude = request.args.get('exclude', '').strip()
    if not query:
        return jsonify({'users': []})
    users = search_users(query, exclude_user_id=exclude or None)
    return jsonify({'users': users})

# ── Friends ──────────────────────────────────────────────────────

@app.route('/api/friends/<user_id>', methods=['GET'])
def get_user_friends(user_id):
    cache_key = f'friends:{user_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'friends': cached})
    friends = get_friends(user_id)
    result = serialize_timestamps(friends)
    _cache_set(cache_key, result, _FRIENDS_TTL)
    return jsonify({'friends': result})

@app.route('/api/friends/<user_id>/requests', methods=['GET'])
def get_user_friend_requests(user_id):
    reqs = get_friend_requests(user_id)
    return jsonify({'requests': serialize_timestamps(reqs)})

@app.route('/api/friends/<user_id>/request', methods=['POST'])
def send_request(user_id):
    data = request.get_json() or {}
    from_user_id = data.get('from_user_id', '').strip()
    from_username = data.get('from_username', '').strip()
    if not from_user_id or not from_username:
        return jsonify({'success': False, 'message': 'from_user_id and from_username required'}), 400
    return jsonify(send_friend_request(from_user_id, from_username, user_id))

@app.route('/api/friends/<user_id>/request/<from_id>/accept', methods=['POST'])
def accept_request(user_id, from_id):
    data = request.get_json() or {}
    user_username = data.get('user_username', '').strip()
    from_username = data.get('from_username', '').strip()
    result = accept_friend_request(user_id, user_username, from_id, from_username)
    if result.get('success'):
        _cache.pop(f'friends:{user_id}', None)
        _cache.pop(f'friends:{from_id}', None)
    return jsonify(result)

@app.route('/api/friends/<user_id>/request/<from_id>/reject', methods=['POST'])
def reject_request(user_id, from_id):
    return jsonify(reject_friend_request(user_id, from_id))

@app.route('/api/friends/<user_id>/<friend_id>', methods=['DELETE'])
def delete_friend(user_id, friend_id):
    result = remove_friend(user_id, friend_id)
    if result.get('success'):
        _cache.pop(f'friends:{user_id}', None)
        _cache.pop(f'friends:{friend_id}', None)
    return jsonify(result)

# ── Notifications ────────────────────────────────────────────────

@app.route('/api/user/<user_id>/notifications', methods=['GET'])
def get_user_notifications(user_id):
    cache_key = f'notifs:{user_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'notifications': cached})
    notifs = get_notifications(user_id)
    result = serialize_timestamps(notifs)
    _cache_set(cache_key, result, _NOTIF_TTL)
    return jsonify({'notifications': result})

@app.route('/api/user/<user_id>/notifications/read-all', methods=['PUT'])
def read_all_notifications(user_id):
    return jsonify(mark_all_notifications_read(user_id))

@app.route('/api/user/<user_id>/notifications/<notification_id>/read', methods=['PUT'])
def read_one_notification(user_id, notification_id):
    return jsonify(mark_notification_read(user_id, notification_id))

# ── Groups ───────────────────────────────────────────────────────

@app.route('/api/groups', methods=['POST'])
def create_new_group():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    creator_id = data.get('creator_id', '').strip()
    creator_username = data.get('creator_username', '').strip()
    if not all([name, creator_id, creator_username]):
        return jsonify({'success': False, 'message': 'name, creator_id, and creator_username are required'}), 400
    result = create_group(name, description, creator_id, creator_username)
    if result.get('success'):
        _cache.pop(f'groups:{creator_id}', None)
    return jsonify(result)

@app.route('/api/groups/<group_id>', methods=['GET'])
def get_group_route(group_id):
    group = get_group(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    return jsonify(serialize_timestamps(group))

@app.route('/api/groups/<group_id>', methods=['DELETE'])
def delete_group_route(group_id):
    data = request.get_json() or {}
    user_id = data.get('user_id', '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id required'}), 400
    return jsonify(delete_group(group_id, user_id))

@app.route('/api/user/<user_id>/groups', methods=['GET'])
def get_user_groups_route(user_id):
    cache_key = f'groups:{user_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'groups': cached})
    groups = get_user_groups(user_id)
    result = serialize_timestamps(groups)
    _cache_set(cache_key, result, _USER_GROUPS_TTL)
    return jsonify({'groups': result})

@app.route('/api/groups/<group_id>/members', methods=['POST'])
def add_member(group_id):
    data = request.get_json() or {}
    new_member_id = data.get('user_id', '').strip()
    new_member_username = data.get('username', '').strip()
    if not new_member_id or not new_member_username:
        return jsonify({'success': False, 'message': 'user_id and username are required'}), 400
    result = add_group_member(group_id, new_member_id, new_member_username)
    if result.get('success'):
        _cache.pop(f'groups:{new_member_id}', None)
        _cache.pop(f'member_profiles:{group_id}', None)
        _cache.pop(f'services:{group_id}', None)
    return jsonify(result)

@app.route('/api/groups/<group_id>/members/<member_id>', methods=['DELETE'])
def remove_member(group_id, member_id):
    result = remove_group_member(group_id, member_id)
    if result.get('success'):
        _cache.pop(f'groups:{member_id}', None)
        _cache.pop(f'member_profiles:{group_id}', None)
        _cache.pop(f'services:{group_id}', None)
    return jsonify(result)

@app.route('/api/groups/<group_id>/watchlist', methods=['POST'])
def add_to_group_watchlist_route(group_id):
    data = request.get_json() or {}
    movie_id = str(data.get('movie_id', '')).strip()
    movie_poster = data.get('movie_poster')
    movie_title = data.get('movie_title', '').strip()
    user_id = data.get('user_id', '').strip()
    username = data.get('username', '').strip()
    if not all([movie_id, movie_title, user_id, username]):
        return jsonify({'success': False, 'message': 'movie_id, movie_title, user_id, and username are required'}), 400
    return jsonify(add_to_group_watchlist(group_id, movie_id, movie_title, movie_poster, user_id, username))

@app.route('/api/groups/<group_id>/watchlist/<movie_id>', methods=['DELETE'])
def remove_from_group_watchlist_route(group_id, movie_id):
    return jsonify(remove_from_group_watchlist(group_id, movie_id))

@app.route('/api/groups/<group_id>/spin', methods=['POST'])
def spin_reelette(group_id):
    return jsonify(spin_group_reelette(group_id))

@app.route('/api/groups/<group_id>/members/profiles', methods=['GET'])
def group_member_profiles(group_id):
    cache_key = f'member_profiles:{group_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'profiles': cached})
    profiles = get_group_member_profiles(group_id)
    result = serialize_timestamps(profiles)
    _cache_set(cache_key, result, _MEMBER_PROFILES_TTL)
    return jsonify({'profiles': result})

@app.route('/api/groups/<group_id>/members/services', methods=['GET'])
def group_member_services(group_id):
    cache_key = f'services:{group_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'services': cached})
    services = get_members_streaming_services(group_id)
    _cache_set(cache_key, services, _MEMBER_SERVICES_TTL)
    return jsonify({'services': services})


# ── Roulette Spin History ────────────────────────────────────────

@app.route('/api/roulette/<user_id>/spin', methods=['POST'])
def roulette_spin_route(user_id):
    data = request.get_json() or {}
    movie_id = str(data.get('movie_id', '')).strip()
    movie_title = data.get('movie_title', '').strip()
    poster_url = data.get('poster_url', '').strip()
    if not movie_id or not movie_title:
        return jsonify({'success': False, 'message': 'movie_id and movie_title required'}), 400
    result = log_roulette_spin(user_id, movie_id, movie_title, poster_url)
    # Bust spin history cache so the next read reflects the new spin
    for limit in (10, 12):
        _cache.pop(f'spins:{user_id}:{limit}', None)
    return jsonify(result)

@app.route('/api/roulette/<user_id>/history', methods=['GET'])
def roulette_history_route(user_id):
    limit = request.args.get('limit', 10, type=int)
    cache_key = f'spins:{user_id}:{limit}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'spins': cached})
    spins = get_roulette_history(user_id, limit=limit)
    serialized = serialize_timestamps(spins)
    _cache_set(cache_key, serialized, 30)  # 30 s — busted on new spin
    return jsonify({'spins': serialized})

@app.route('/api/roulette/<user_id>/friends-history', methods=['GET'])
def friends_roulette_history_route(user_id):
    limit = request.args.get('limit', 1, type=int)
    cache_key = f'friends_history:{user_id}:{limit}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'friendsHistory': cached})
    friends_history = get_friends_roulette_history(user_id, limit=limit)
    result = serialize_timestamps(friends_history)
    _cache_set(cache_key, result, _FRIENDS_HISTORY_TTL)
    return jsonify({'friendsHistory': result})


# ── Direct Messages ──────────────────────────────────────────────

@app.route('/api/conversations/<user_id>', methods=['GET'])
def get_user_conversations(user_id):
    return jsonify({'conversations': get_conversations(user_id)})

@app.route('/api/conversations/open', methods=['POST'])
def open_conversation():
    data = request.get_json()
    result = get_or_create_conversation(
        data.get('uid1'), data.get('uid2'),
        data.get('username1', ''), data.get('username2', ''),
    )
    return jsonify(result)

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_conversation_messages(conversation_id):
    return jsonify({'messages': get_messages(conversation_id)})

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
def post_message(conversation_id):
    data = request.get_json()
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'success': False, 'message': 'Empty message'}), 400
    return jsonify(send_message(conversation_id, data.get('sender_id'), text))

@app.route('/api/conversations/<conversation_id>/read', methods=['PUT'])
def read_conversation(conversation_id):
    data = request.get_json()
    return jsonify(mark_conversation_read(conversation_id, data.get('user_id')))


# ── Health check ─────────────────────────────────────────────────
# No auth, no DB, no TMDB — used by UptimeRobot to keep the server warm.

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()}), 200


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

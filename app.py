from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
import os
import time
import json
import threading
import html as _html
from datetime import datetime, timezone, timedelta
from firebase_admin import auth as fb_auth

try:
    from config import SECRET_KEY
except ImportError:
    SECRET_KEY = os.environ.get("SECRET_KEY", "")
    if not SECRET_KEY:
        import secrets as _secrets
        SECRET_KEY = _secrets.token_hex(32)
        print("WARNING: SECRET_KEY not set — using a random key (sessions won't persist across restarts)")

try:
    from config import CORS_ORIGINS
except ImportError:
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,"
        "https://reelette-movie.com,https://www.reelette-movie.com",
    ).split(",")
from firebase_helper import (
    create_user, verify_user, get_user_data,
    update_streaming_services, get_user_streaming_services,
    add_to_watchlist, get_watchlist, remove_from_watchlist,
    add_watched_movie, get_watched_movies, get_watched_movie, update_watched_rating,
    create_post, create_repost, get_feed, like_post, add_reply, get_replies, delete_post, toggle_reply_like, toggle_reply_dislike, send_password_reset_email,
    update_user_profile, get_user_movie_preferences, update_movie_preferences, search_users,
    send_friend_request, get_friend_requests, accept_friend_request, reject_friend_request,
    remove_friend, get_friends,
    create_group, get_group, get_user_groups, add_group_member, remove_group_member, delete_group,
    add_to_group_watchlist, remove_from_group_watchlist, spin_group_reelette,
    update_user_avatar, update_user_last_seen,
    get_user_public_profile, get_group_member_profiles, get_members_streaming_services,
    log_roulette_spin, get_roulette_history, get_friends_roulette_history, save_quiz_result,
    get_notifications, mark_notification_read, mark_all_notifications_read,
    get_notification_prefs, set_notification_prefs,
    get_or_create_conversation, get_conversations, get_messages, send_message, mark_conversation_read,
    get_group_chat, send_group_message,
    update_user_email, delete_user_account,
    get_post, get_user_id_by_username,
    create_ranking, get_user_rankings, get_ranking, update_ranking, delete_ranking, get_friends_rankings,
    send_welcome_email, send_tagged_in_post_email,
    send_post_reply_email, send_like_milestone_email,
    send_friend_request_email, send_group_added_email,
)
from tmdb_api import (
    search_movies, discover_movies, get_popular_movies, get_movie_details,
    get_streaming_providers, get_genres, get_trending_movies, get_top_rated_movies,
    get_poster_url, get_backdrop_url, search_person,
    get_now_playing_movies, get_movie_recommendations, get_upcoming_movies,
    search_tv_shows, get_popular_tv_shows, get_top_rated_tv_shows, get_trending_tv_shows,
    get_tv_show_details, discover_tv_shows, get_tv_genres, get_tv_streaming_providers,
    get_movie_images, get_show_images,
)

app = Flask(__name__)

import re
# Convert string patterns starting with "regex:" into compiled regex objects
_cors_origins = [
    re.compile(o[6:]) if o.startswith("regex:") else o
    for o in CORS_ORIGINS
]
CORS(app,
     origins=_cors_origins,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization'],
     max_age=86400)

@app.after_request
def ensure_cors_on_errors(response):
    """Guarantee CORS headers are present even when Flask returns an error response."""
    origin = request.headers.get('Origin', '')
    if origin and 'Access-Control-Allow-Origin' not in response.headers:
        for allowed in _cors_origins:
            match = (allowed == origin) if isinstance(allowed, str) else allowed.match(origin)
            if match:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                break
    return response

app.secret_key = SECRET_KEY

# ── Rate limiting ────────────────────────────────────────────────
# Uses in-memory storage (single-process). If you scale to multiple
# workers, point RATELIMIT_STORAGE_URI at a Redis instance instead.
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["300 per minute"],   # global safety net per IP
    storage_uri="memory://",
)

# ── Groq AI client ───────────────────────────────────────────────
import random as _random
from groq import Groq as _Groq
from groq_helper import get_user_taste_profile, parse_llm_json

_GROQ_API_KEY   = os.environ.get("GROQ_API_KEY", "")
_groq_client    = _Groq(api_key=_GROQ_API_KEY) if _GROQ_API_KEY else None
_GROQ_MODEL     = "llama-3.3-70b-versatile"
_GROQ_DAY_LIMIT = 10000


def call_groq(prompt: str, max_tokens: int = 500) -> str:
    """Call Groq chat completions. Retries once after 10 s on rate-limit."""
    if not _groq_client:
        raise RuntimeError("Groq not configured")
    for attempt in range(2):
        try:
            resp = _groq_client.chat.completions.create(
                model=_GROQ_MODEL,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.7,
            )
            return resp.choices[0].message.content
        except Exception as e:
            err = str(e)
            if attempt == 0 and ('429' in err or 'rate' in err.lower()):
                time.sleep(10)
                continue
            raise


def check_and_increment_groq_budget() -> bool:
    """Returns True if under the daily call limit, False if exceeded. Fails open on error."""
    try:
        from firebase_admin import firestore as _fs
        db   = _fs.client()
        ref  = db.collection('system').document('groqBudget')
        doc  = ref.get()
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        if doc.exists:
            data = doc.to_dict()
            if data.get('date') == today and data.get('calls', 0) >= _GROQ_DAY_LIMIT:
                return False
            if data.get('date') != today:
                ref.set({'date': today, 'calls': 1})
            else:
                from firebase_admin.firestore import SERVER_TIMESTAMP
                ref.update({'calls': _fs.Increment(1)})
        else:
            ref.set({'date': today, 'calls': 1})
    except Exception as e:
        print(f"groqBudget Firestore error (failing open): {e}")
    return True


# ── Auth middleware ───────────────────────────────────────────────

def require_auth(f):
    """Verify Firebase ID token from Authorization header. Stores uid in g.verified_uid."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 200
        token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
        if not token:
            return jsonify({'error': 'Authentication required'}), 401
        try:
            decoded = fb_auth.verify_id_token(token)
            g.verified_uid = decoded['uid']
        except Exception:
            return jsonify({'error': 'Invalid or expired token'}), 401
        return f(*args, **kwargs)
    return decorated

# ── Admin ────────────────────────────────────────────────────────
# The admin UID is the only source of truth for elevated privileges.
# It is verified server-side on every request via a fresh Firebase token —
# the frontend badge is cosmetic only and cannot grant any access.
ADMIN_UID = "IiBMPhonpAR4RWTGCwlykGiDIH63"

def require_admin(f):
    """Must follow @require_auth. Rejects with 403 if the caller is not the admin."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.verified_uid != ADMIN_UID:
            return jsonify({'error': 'Forbidden'}), 403
        return f(*args, **kwargs)
    return decorated

def _own_account(user_id: str):
    """Return a 403 response if g.verified_uid doesn't match user_id, else None."""
    if g.verified_uid != user_id:
        return jsonify({'error': 'Forbidden'}), 403
    return None

# ── Genre caches ─────────────────────────────────────────────────
_genre_cache = {}

def get_genre_map():
    global _genre_cache
    if not _genre_cache:
        result = get_genres()
        if result and 'genres' in result:
            _genre_cache = {g['id']: g['name'] for g in result['genres']}
    return _genre_cache

_tv_genre_cache = {}

def get_tv_genre_map():
    global _tv_genre_cache
    if not _tv_genre_cache:
        result = get_tv_genres()
        if result and 'genres' in result:
            _tv_genre_cache = {g['id']: g['name'] for g in result['genres']}
    return _tv_genre_cache

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

# Formats our movies to the shape our frontend expects, and attaches streaming service info in parallel
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
        'poster': get_poster_url(movie_data.get('poster_path'), 'w342') or '',
        'backdrop': get_backdrop_url(movie_data.get('backdrop_path')) or '',
        'overview': movie_data.get('overview', ''),
        'streamingService': streaming_service,
        'type': 'movie',
    }

def format_show(show_data, streaming_service=''):
    tv_genre_map = get_tv_genre_map()
    genre_ids = show_data.get('genre_ids', [])
    if genre_ids:
        genres = [tv_genre_map.get(gid, '') for gid in genre_ids if gid in tv_genre_map]
    else:
        genres = [g['name'] for g in show_data.get('genres', [])]
    first_air = show_data.get('first_air_date', '')
    year = int(first_air[:4]) if first_air and len(first_air) >= 4 else 0
    return {
        'id': str(show_data['id']),
        'title': show_data.get('name', show_data.get('title', '')),
        'year': year,
        'genres': [g for g in genres if g],
        'rating': round(show_data.get('vote_average', 0), 1),
        'poster': get_poster_url(show_data.get('poster_path'), 'w342') or '',
        'backdrop': get_backdrop_url(show_data.get('backdrop_path')) or '',
        'overview': show_data.get('overview', ''),
        'streamingService': streaming_service,
        'type': 'show',
        'seasons': show_data.get('number_of_seasons', 0),
    }

# ── Shared thread pool ───────────────────────────────────────────
# One persistent pool instead of spinning up a new one per request
_executor = ThreadPoolExecutor(max_workers=20)

# ── Generic TTL cache ────────────────────────────────────────────
# Stores any key → (value, expiry_timestamp)
_cache: dict = {}

_MAX_CACHE_ENTRIES = 2000

def _cache_get(key):
    entry = _cache.get(key)
    if entry and time.time() < entry[1]:
        return entry[0]
    return None

def _cache_set(key, value, ttl):
    if len(_cache) >= _MAX_CACHE_ENTRIES:
        now = time.time()
        expired_keys = [k for k, (_, exp) in _cache.items() if exp < now]
        for k in expired_keys:
            del _cache[k]
        # If still full after removing expired, evict the oldest quarter
        if len(_cache) >= _MAX_CACHE_ENTRIES:
            oldest = sorted(_cache.items(), key=lambda x: x[1][1])[:_MAX_CACHE_ENTRIES // 4]
            for k, _ in oldest:
                del _cache[k]
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

_tv_provider_cache: dict = {}

def _fetch_streaming_for_show(show_data):
    show_id = show_data['id']
    cached = _tv_provider_cache.get(show_id)
    if cached and time.time() < cached[1]:
        return cached[0]
    try:
        providers = get_tv_streaming_providers(show_id)
        if not providers:
            _tv_provider_cache[show_id] = ('', time.time() + _PROVIDER_TTL)
            return ''
        for p in providers.get('flatrate', []):
            name = PROVIDER_DISPLAY.get(p.get('provider_id'))
            if name:
                _tv_provider_cache[show_id] = (name, time.time() + _PROVIDER_TTL)
                return name
    except Exception:
        pass
    _tv_provider_cache[show_id] = ('', time.time() + _PROVIDER_TTL)
    return ''

def fetch_shows_with_streaming(shows_data):
    futures = {_executor.submit(_fetch_streaming_for_show, s): s for s in shows_data}
    service_map = {}
    for future in as_completed(futures):
        show = futures[future]
        try:
            service_map[show['id']] = future.result()
        except Exception:
            service_map[show['id']] = ''
    return [format_show(s, service_map.get(s['id'], '')) for s in shows_data]

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
@limiter.limit("20 per minute; 100 per hour")
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password required'}), 400
    result = verify_user(email, password)
    return jsonify(result)

@app.route('/api/auth/register', methods=['POST'])
@limiter.limit("5 per hour")
def register():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    username = data.get('username', '').strip()
    if not email or not password or not username:
        return jsonify({'success': False, 'message': 'Email, password, and username are required'}), 400
    result = create_user(email, password, username)
    if result.get('success'):
        threading.Thread(target=send_welcome_email, args=(result['user_id'],), daemon=True).start()
    return jsonify(result)

@app.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    data = request.get_json() or {}
    email = data.get('email', '').strip()

    if not email:
        return jsonify({
            'success': False,
            'message': 'Email is required'
        }), 400

    result = send_password_reset_email(email)
    return jsonify(result), 200

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
    if time_window not in ('day', 'week'):
        time_window = 'week'
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
@limiter.limit("60 per minute")
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
@limiter.limit("30 per minute")
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

@app.route('/api/movies/<int:movie_id>/backdrops', methods=['GET'])
def movie_backdrops(movie_id):
    media_type = request.args.get('type', 'movie')
    backdrops = get_show_images(movie_id) if media_type == 'show' else get_movie_images(movie_id)
    return jsonify({'backdrops': backdrops})

@app.route('/api/genres', methods=['GET'])
def genres():
    data = get_genres()
    return jsonify(data or {'genres': []})

@app.route('/api/genres/tv', methods=['GET'])
def tv_genres_route():
    data = get_tv_genres()
    return jsonify(data or {'genres': []})

# ── TV Show Routes ───────────────────────────────────────────────

TV_SORT_MAP = {
    'popularity': 'popularity.desc',
    'rating':     'vote_average.desc',
    'newest':     'first_air_date.desc',
    'oldest':     'first_air_date.asc',
}

@app.route('/api/shows/popular', methods=['GET'])
def popular_shows():
    page = request.args.get('page', 1, type=int)
    cache_key = f'tv_popular:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_popular_tv_shows(page=page)
    if not data:
        return jsonify({'movies': []})
    shows = fetch_shows_with_streaming(data.get('results', []))
    _cache_set(cache_key, shows, _MOVIE_LIST_TTL)
    return jsonify({'movies': shows})

@app.route('/api/shows/trending', methods=['GET'])
def trending_shows():
    time_window = request.args.get('window', 'week')
    if time_window not in ('day', 'week'):
        time_window = 'week'
    cache_key = f'tv_trending:{time_window}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_trending_tv_shows(time_window=time_window)
    if not data:
        return jsonify({'movies': []})
    shows = fetch_shows_with_streaming(data.get('results', []))
    _cache_set(cache_key, shows, _MOVIE_LIST_TTL)
    return jsonify({'movies': shows})

@app.route('/api/shows/top_rated', methods=['GET'])
def top_rated_shows():
    page = request.args.get('page', 1, type=int)
    cache_key = f'tv_top_rated:{page}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'movies': cached})
    data = get_top_rated_tv_shows(page=page)
    if not data:
        return jsonify({'movies': []})
    shows = fetch_shows_with_streaming(data.get('results', []))
    _cache_set(cache_key, shows, _MOVIE_LIST_TTL)
    return jsonify({'movies': shows})

@app.route('/api/shows/search', methods=['GET'])
@limiter.limit("60 per minute")
def search_shows():
    query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    if not query:
        return jsonify({'movies': []})
    cache_key = f'tv_search:{query.lower()}:{page}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'movies': cached})
    data = search_tv_shows(query, page=page)
    if not data:
        return jsonify({'movies': []})
    shows = fetch_shows_with_streaming(data.get('results', []))
    _cache_set(cache_key, shows, _MOVIE_LIST_TTL)
    return jsonify({'movies': shows})

@app.route('/api/shows/discover', methods=['POST'])
@limiter.limit("30 per minute")
def discover_shows():
    data = request.get_json() or {}
    cache_key = f'tv_discover:{json.dumps(data, sort_keys=True, default=str)}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'movies': cached})

    genre_id   = data.get('genre_id') or None
    year_from  = data.get('year_from') or None
    year_to    = data.get('year_to') or None
    min_rating = data.get('min_rating') or None
    sort_by    = TV_SORT_MAP.get(data.get('sort_by', 'popularity'), 'popularity.desc')
    page       = data.get('page', 1)

    services_filter = data.get('services_filter') or {}
    active_provider_ids = [
        str(STREAMING_PROVIDER_IDS[key])
        for key, enabled in services_filter.items()
        if enabled and key in STREAMING_PROVIDER_IDS
    ]
    with_watch_providers = '|'.join(active_provider_ids) if active_provider_ids else None
    min_vote_count = 50 if min_rating else None

    result = discover_tv_shows(
        genre_id=genre_id,
        year_from=year_from,
        year_to=year_to,
        min_rating=min_rating,
        min_vote_count=min_vote_count,
        with_watch_providers=with_watch_providers,
        sort_by=sort_by,
        page=page,
    )

    if not result:
        return jsonify({'movies': []})
    shows = fetch_shows_with_streaming(result.get('results', []))
    _cache_set(cache_key, shows, _MOVIE_LIST_TTL)
    return jsonify({'movies': shows})

@app.route('/api/shows/<int:show_id>', methods=['GET'])
def show_details(show_id):
    cache_key = f'tv_detail:{show_id}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)
    data = get_tv_show_details(show_id)
    if not data:
        return jsonify({'error': 'Show not found'}), 404
    data['media_type'] = 'tv'
    _cache_set(cache_key, data, _MOVIE_DETAIL_TTL)
    return jsonify(data)

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
@require_auth
def update_user(user_id):
    err = _own_account(user_id)
    if err: return err
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
@require_auth
def update_streaming(user_id):
    err = _own_account(user_id)
    if err: return err
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
@require_auth
def update_movie_preferences_route(user_id):
    err = _own_account(user_id)
    if err: return err
    preferences = request.get_json() or {}
    result = update_movie_preferences(user_id, preferences)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code

# ── Watchlist Routes ─────────────────────────────────────────────

@app.route('/api/watchlist/<user_id>', methods=['GET'])
def get_user_watchlist(user_id):
    return jsonify({'movies': get_watchlist(user_id)})

@app.route('/api/watchlist/<user_id>', methods=['POST'])
@require_auth
def add_to_user_watchlist(user_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    movie_id = data.get('movie_id')
    if not movie_id:
        return jsonify({'success': False, 'message': 'movie_id required'}), 400
    return jsonify(add_to_watchlist(user_id, movie_id))

@app.route('/api/watchlist/<user_id>/<movie_id>', methods=['DELETE'])
@require_auth
def remove_from_user_watchlist(user_id, movie_id):
    err = _own_account(user_id)
    if err: return err
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
@require_auth
def add_user_watched(user_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    movie = data.get('movie')
    user_rating = data.get('user_rating')
    comment = data.get('comment', '')
    if not movie or user_rating is None:
        return jsonify({'success': False, 'message': 'movie and user_rating required'}), 400
    if not isinstance(user_rating, (int, float)) or not (0 <= user_rating <= 10):
        return jsonify({'success': False, 'message': 'user_rating must be a number between 0 and 10'}), 400
    if len(str(comment)) > 2000:
        return jsonify({'success': False, 'message': 'comment must be 2000 characters or fewer'}), 400
    result = add_watched_movie(user_id, movie, user_rating, comment)
    if result.get('success'):
        _cache.pop(f'watched:{user_id}', None)
    return jsonify(result)

@app.route('/api/watched/<user_id>/<movie_id>', methods=['PUT'])
@require_auth
def update_user_watched_rating(user_id, movie_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    new_rating = data.get('rating')
    comment = data.get('comment')
    if new_rating is None:
        return jsonify({'success': False, 'message': 'rating required'}), 400
    if not isinstance(new_rating, (int, float)) or not (0 <= new_rating <= 10):
        return jsonify({'success': False, 'message': 'rating must be a number between 0 and 10'}), 400
    if comment is not None and len(str(comment)) > 2000:
        return jsonify({'success': False, 'message': 'comment must be 2000 characters or fewer'}), 400
    result = update_watched_rating(user_id, movie_id, new_rating, comment)
    if result.get('success'):
        _cache.pop(f'watched:{user_id}', None)
    return jsonify(result)

# ── Social Feed Routes ───────────────────────────────────────────

@app.route('/api/feed', methods=['GET'])
def social_feed():
    limit = request.args.get('limit', 20, type=int)
    since = request.args.get('since', None)
    if since:
        # Incremental fetch — bypass cache, never cache the result
        posts = get_feed(limit=limit, since=since)
        return jsonify({'posts': serialize_timestamps(posts)})
    cache_key = f'feed:{limit}'
    cached = _cache_get(cache_key)
    if cached:
        return jsonify({'posts': cached})
    posts = get_feed(limit=limit)
    serialized = serialize_timestamps(posts)
    _cache_set(cache_key, serialized, _FEED_TTL)
    return jsonify({'posts': serialized})

@app.route('/api/feed', methods=['POST'])
@require_auth
@limiter.limit("10 per minute; 50 per hour")
def create_feed_post():
    data = request.get_json() or {}
    user_id    = g.verified_uid
    username   = data.get('username', '').strip()
    message    = data.get('message', '').strip()
    movie_title = data.get('movie_title', '').strip()
    movie_id     = data.get('movie_id', '')
    movie_poster = data.get('movie_poster', '')
    rating       = data.get('rating', 0)
    if not all([username, message, movie_title]):
        return jsonify({'success': False, 'message': 'username, message, and movie_title are required'}), 400
    if len(message) > 2000:
        return jsonify({'success': False, 'message': 'message must be 2000 characters or fewer'}), 400
    result = create_post(user_id, username, message, movie_title, movie_id, movie_poster, rating)
    if result.get('success'):
        for key in [k for k in _cache if k.startswith('feed:')]:
            _cache.pop(key, None)
        def _notify_tagged(_uname=username, _msg=message, _pid=result['post_id'], _title=movie_title, _uid=user_id):
            mentions = set(re.findall(r'@(\w+)', _msg))
            for handle in mentions:
                tagged_id = get_user_id_by_username(handle)
                if tagged_id and tagged_id != _uid:
                    send_tagged_in_post_email(tagged_id, _uname, _pid, _title)
        threading.Thread(target=_notify_tagged, daemon=True).start()
    return jsonify(result)

@app.route('/api/feed/<post_id>/repost', methods=['POST'])
@require_auth
@limiter.limit("10 per minute; 30 per hour")
def repost_feed_post(post_id):
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    comment  = data.get('comment', '').strip()
    if not username:
        return jsonify({'success': False, 'message': 'username is required'}), 400
    if len(comment) > 500:
        return jsonify({'success': False, 'message': 'comment must be 500 characters or fewer'}), 400
    result = create_repost(g.verified_uid, username, post_id, comment)
    if result.get('success'):
        for key in [k for k in _cache if k.startswith('feed:')]:
            _cache.pop(key, None)
    return jsonify(result)

@app.route('/api/feed/<post_id>/like', methods=['POST'])
@require_auth
def like_feed_post(post_id):
    user_id = g.verified_uid
    result = like_post(post_id, user_id)
    if result.get('action') == 'liked':
        def _check_milestone(_pid=post_id):
            post = get_post(_pid)
            if post:
                send_like_milestone_email(post['user_id'], post.get('likes', 0), _pid, post.get('movie_title', ''))
        threading.Thread(target=_check_milestone, daemon=True).start()
    return jsonify(result)

@app.route('/api/feed/<post_id>/replies', methods=['GET'])
def get_post_replies(post_id):
    return jsonify({'replies': serialize_timestamps(get_replies(post_id))})

@app.route('/api/feed/<post_id>/reply', methods=['POST'])
@require_auth
@limiter.limit("20 per minute; 100 per hour")
def reply_to_post(post_id):
    data = request.get_json() or {}
    user_id  = g.verified_uid
    username = data.get('username', '').strip()
    message  = data.get('message', '').strip()
    if not all([username, message]):
        return jsonify({'success': False, 'message': 'username and message are required'}), 400
    if len(message) > 2000:
        return jsonify({'success': False, 'message': 'message must be 2000 characters or fewer'}), 400
    result = add_reply(post_id, user_id, username, message)
    if result.get('success'):
        def _notify_poster(_pid=post_id, _uname=username, _msg=message, _sender=user_id):
            post = get_post(_pid)
            if post and post.get('user_id') != _sender:
                send_post_reply_email(post['user_id'], _uname, _pid, post.get('movie_title', ''), _msg)
        threading.Thread(target=_notify_poster, daemon=True).start()
    return jsonify(result)

@app.route('/api/feed/<post_id>/reply/<reply_id>/like', methods=['POST'])
@require_auth
def like_reply_route(post_id, reply_id):
    return jsonify(toggle_reply_like(post_id, reply_id, g.verified_uid))

@app.route('/api/feed/<post_id>/reply/<reply_id>/dislike', methods=['POST'])
@require_auth
def dislike_reply_route(post_id, reply_id):
    return jsonify(toggle_reply_dislike(post_id, reply_id, g.verified_uid))

@app.route('/api/feed/<post_id>', methods=['DELETE'])
@require_auth
def delete_feed_post(post_id):
    return jsonify(delete_post(post_id, g.verified_uid))


@app.route('/api/admin/posts/<post_id>', methods=['DELETE'])
@require_auth
@require_admin
@limiter.limit("60 per minute")
def admin_delete_post(post_id):
    from firebase_helper import admin_delete_post as _admin_del_post
    return jsonify(_admin_del_post(post_id))


@app.route('/api/admin/posts/<post_id>/replies/<reply_id>', methods=['DELETE'])
@require_auth
@require_admin
@limiter.limit("60 per minute")
def admin_delete_reply(post_id, reply_id):
    from firebase_helper import admin_delete_reply as _admin_del_reply
    return jsonify(_admin_del_reply(post_id, reply_id))


# ── User Profile Update / Avatar / Presence ──────────────────────

@app.route('/api/user/<user_id>/profile', methods=['PUT'])
@require_auth
def update_profile(user_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    # Enforce length limits on user-supplied text fields
    if len(data.get('username', '') or '') > 30:
        return jsonify({'success': False, 'message': 'username must be 30 characters or fewer'}), 400
    if len(data.get('displayName', '') or '') > 60:
        return jsonify({'success': False, 'message': 'displayName must be 60 characters or fewer'}), 400
    if len(data.get('bio', '') or '') > 300:
        return jsonify({'success': False, 'message': 'bio must be 300 characters or fewer'}), 400
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
@require_auth
def complete_quiz():
    data = request.get_json() or {}
    uid = g.verified_uid
    top_genre = data.get('topGenre')
    answers = data.get('answers', {})
    from firebase_helper import save_quiz_result
    save_quiz_result(uid, top_genre, answers)
    return jsonify({'success': True})

_MAX_AVATAR_BYTES = 512 * 1024  # 512 KB

@app.route('/api/user/<user_id>/avatar', methods=['PUT'])
@require_auth
def update_avatar_route(user_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    avatar_url = data.get('avatar_url', '').strip()
    if not avatar_url:
        return jsonify({'success': False, 'message': 'avatar_url required'}), 400
    # Must be an https:// URL or a data:image/ URI within size limit
    is_data_uri = avatar_url.startswith('data:image/')
    is_https    = avatar_url.startswith('https://')
    if not is_data_uri and not is_https:
        return jsonify({'success': False, 'message': 'avatar_url must be an https URL or a data:image/ URI'}), 400
    if is_data_uri and len(avatar_url.encode('utf-8')) > _MAX_AVATAR_BYTES:
        return jsonify({'success': False, 'message': 'Avatar image must be 512 KB or smaller'}), 400
    return jsonify(update_user_avatar(user_id, avatar_url))

@app.route('/api/user/<user_id>/lastseen', methods=['PUT'])
@require_auth
def update_lastseen_route(user_id):
    err = _own_account(user_id)
    if err: return err
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
@require_auth
@limiter.limit("20 per hour")
def send_request(user_id):
    data = request.get_json() or {}
    from_user_id = g.verified_uid
    from_username = data.get('from_username', '').strip()
    if not from_username:
        return jsonify({'success': False, 'message': 'from_username required'}), 400
    result = send_friend_request(from_user_id, from_username, user_id)
    if result.get('success'):
        threading.Thread(target=send_friend_request_email, args=(user_id, from_username), daemon=True).start()
    return jsonify(result)

@app.route('/api/friends/<user_id>/request/<from_id>/accept', methods=['POST'])
@require_auth
def accept_request(user_id, from_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    user_username = data.get('user_username', '').strip()
    from_username = data.get('from_username', '').strip()
    result = accept_friend_request(user_id, user_username, from_id, from_username)
    if result.get('success'):
        _cache.pop(f'friends:{user_id}', None)
        _cache.pop(f'friends:{from_id}', None)
    return jsonify(result)

@app.route('/api/friends/<user_id>/request/<from_id>/reject', methods=['POST'])
@require_auth
def reject_request(user_id, from_id):
    err = _own_account(user_id)
    if err: return err
    return jsonify(reject_friend_request(user_id, from_id))

@app.route('/api/friends/<user_id>/<friend_id>', methods=['DELETE'])
@require_auth
def delete_friend(user_id, friend_id):
    err = _own_account(user_id)
    if err: return err
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

@app.route('/api/user/<user_id>/notification-prefs', methods=['GET'])
def get_notif_prefs(user_id):
    return jsonify(get_notification_prefs(user_id))

@app.route('/api/user/<user_id>/notification-prefs', methods=['PUT'])
@require_auth
def set_notif_prefs(user_id):
    err = _own_account(user_id)
    if err: return err
    prefs = request.get_json() or {}
    result = set_notification_prefs(user_id, prefs)
    if result.get('success'):
        _cache.pop(f'user:{user_id}', None)
    return jsonify(result)

@app.route('/api/user/<user_id>/notifications/read-all', methods=['PUT'])
@require_auth
def read_all_notifications(user_id):
    err = _own_account(user_id)
    if err: return err
    return jsonify(mark_all_notifications_read(user_id))

@app.route('/api/user/<user_id>/notifications/<notification_id>/read', methods=['PUT'])
@require_auth
def read_one_notification(user_id, notification_id):
    err = _own_account(user_id)
    if err: return err
    return jsonify(mark_notification_read(user_id, notification_id))

# ── Groups ───────────────────────────────────────────────────────

@app.route('/api/groups', methods=['POST'])
@require_auth
def create_new_group():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    description = data.get('description', '').strip()
    creator_id = g.verified_uid
    creator_username = data.get('creator_username', '').strip()
    if not all([name, creator_username]):
        return jsonify({'success': False, 'message': 'name and creator_username are required'}), 400
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
@require_auth
def delete_group_route(group_id):
    user_id = g.verified_uid
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
@require_auth
def add_member(group_id):
    data = request.get_json() or {}
    new_member_id = data.get('user_id', '').strip()
    new_member_username = data.get('username', '').strip()
    added_by_username = data.get('added_by_username', '').strip()
    if not new_member_id or not new_member_username:
        return jsonify({'success': False, 'message': 'user_id and username are required'}), 400
    result = add_group_member(group_id, new_member_id, new_member_username)
    if result.get('success'):
        _cache.pop(f'groups:{new_member_id}', None)
        _cache.pop(f'member_profiles:{group_id}', None)
        _cache.pop(f'services:{group_id}', None)
        if added_by_username:
            def _notify_member(_gid=group_id, _mid=new_member_id, _adder=added_by_username):
                grp = get_group(_gid)
                if grp:
                    send_group_added_email(_mid, _adder, grp['name'], _gid)
            threading.Thread(target=_notify_member, daemon=True).start()
    return jsonify(result)

@app.route('/api/groups/<group_id>/members/<member_id>', methods=['DELETE'])
@require_auth
def remove_member(group_id, member_id):
    result = remove_group_member(group_id, member_id)
    if result.get('success'):
        _cache.pop(f'groups:{member_id}', None)
        _cache.pop(f'member_profiles:{group_id}', None)
        _cache.pop(f'services:{group_id}', None)
    return jsonify(result)

@app.route('/api/groups/<group_id>/watchlist', methods=['POST'])
@require_auth
def add_to_group_watchlist_route(group_id):
    data = request.get_json() or {}
    movie_id = str(data.get('movie_id', '')).strip()
    movie_poster = data.get('movie_poster')
    movie_title = data.get('movie_title', '').strip()
    user_id = g.verified_uid
    username = data.get('username', '').strip()
    if not all([movie_id, movie_title, username]):
        return jsonify({'success': False, 'message': 'movie_id, movie_title, and username are required'}), 400
    return jsonify(add_to_group_watchlist(group_id, movie_id, movie_title, movie_poster, user_id, username))

@app.route('/api/groups/<group_id>/watchlist/<movie_id>', methods=['DELETE'])
@require_auth
def remove_from_group_watchlist_route(group_id, movie_id):
    return jsonify(remove_from_group_watchlist(group_id, movie_id))

@app.route('/api/groups/<group_id>/spin', methods=['POST'])
@require_auth
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
@require_auth
def roulette_spin_route(user_id):
    err = _own_account(user_id)
    if err: return err
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

# ── Smart Spin (Groq-powered roulette) ───────────────────────────

@app.route('/api/roulette/smart-spin/status', methods=['GET'])
@require_auth
@limiter.limit("30 per minute; 100 per hour")
def smart_spin_status():
    from firebase_admin import firestore as _fs
    uid = g.verified_uid
    db  = _fs.client()

    user_doc  = db.collection('users').document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    last_used = (user_data.get('smartSpin') or {}).get('lastUsed')

    now_utc   = datetime.now(timezone.utc)
    today_utc = now_utc.date()

    if last_used:
        last_used_date = last_used.date() if hasattr(last_used, 'date') else today_utc
        if last_used_date == today_utc:
            next_midnight = (datetime(today_utc.year, today_utc.month, today_utc.day,
                                      tzinfo=timezone.utc) + timedelta(days=1))
            hours_until = max(0, int((next_midnight - now_utc).total_seconds() / 3600))
            return jsonify({'available': False, 'hoursUntilReset': hours_until})

    return jsonify({'available': True, 'hoursUntilReset': 0})


@app.route('/api/roulette/smart-spin', methods=['POST'])
@require_auth
@limiter.limit("5 per hour")
def smart_spin():
    from firebase_admin import firestore as _fs
    uid = g.verified_uid
    db  = _fs.client()

    if not _groq_client:
        return jsonify({'error': 'AI service not configured'}), 503

    # 1. Daily limit check
    user_doc  = db.collection('users').document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    last_used = (user_data.get('smartSpin') or {}).get('lastUsed')

    now_utc   = datetime.now(timezone.utc)
    today_utc = now_utc.date()

    if last_used:
        last_used_date = last_used.date() if hasattr(last_used, 'date') else today_utc
        if last_used_date == today_utc:
            next_midnight = (datetime(today_utc.year, today_utc.month, today_utc.day,
                                      tzinfo=timezone.utc) + timedelta(days=1))
            hours_until = max(0, int((next_midnight - now_utc).total_seconds() / 3600))
            return jsonify({'error': 'limit_reached', 'hoursUntilReset': hours_until}), 429

    # 2. Global daily budget check
    if not check_and_increment_groq_budget():
        return jsonify({'error': 'AI service is at capacity for today — please try again tomorrow'}), 503

    # 3. Consume the daily spin BEFORE calling Groq so failed attempts still count.
    #    This prevents users from retrying indefinitely and burning API quota.
    db.collection('users').document(uid).update({'smartSpin': {'lastUsed': now_utc}})

    # 4. Taste profile
    profile = get_user_taste_profile(uid)

    # 5. Request body
    body        = request.get_json() or {}
    preferences = _html.escape(str(body.get('preferences') or '')[:300])
    mood        = str(body.get('mood')  or '')[:100]
    genre       = str(body.get('genre') or '')[:50]

    watched_ids  = (profile or {}).get('all_watched_tmdb_ids', [])
    recently_ids = (profile or {}).get('recently_watched_tmdb_ids', [])

    if profile:
        profile_block = (
            f"USER TASTE PROFILE:\n"
            f"- Top genres: {profile['top_genres']}\n"
            f"- Favorite directors: {profile['top_directors']}\n"
            f"- Favorite actors: {profile['top_actors']}\n"
            f"- Preferred decades: {profile['decade_breakdown']}\n"
            f"- Rating style: {profile['rating_style']}\n"
            f"- Personal favorites: {profile['top_rated_movies']}\n"
            f"- Recently watched (avoid these): {recently_ids}\n"
            f"- Streaming services: {profile['streaming_services']}"
        )
    else:
        profile_block = "USER TASTE PROFILE: No watch history available yet."

    # 6. Groq prompt — one call only, TMDB fallback on bad ID
    prompt = f"""You are a world-class movie recommendation engine.

{profile_block}

CURRENT REQUEST:
- Mood: "{mood}"
- Genre: "{genre}"
- User's own words: "{preferences}"

Rules:
- If user typed a preference, prioritize it above everything else
- If no preference, recommend based purely on their taste profile
- Never recommend anything in their watched list: {watched_ids[:100]}
- Prefer movies likely on their streaming services
- IMPORTANT: Only use real, verified TMDB movie IDs. When in doubt, use a very well-known film.

Return ONLY valid JSON, no markdown, no explanation:
{{
  "title": "string",
  "year": number,
  "tmdb_id": number,
  "reason": "1-2 sentences using SPECIFIC stats, e.g. 'You give Denis Villeneuve a 9.4 average and haven't seen this one' or 'Your top decade is the 90s and you love psychological thrillers'"
}}"""

    try:
        text   = call_groq(prompt, max_tokens=500)
        result = parse_llm_json(text)
    except Exception as e:
        err_str = str(e)
        if '429' in err_str or 'rate' in err_str.lower() or 'quota' in err_str.lower():
            return jsonify({'error': 'AI service is busy — please try again in a few minutes'}), 503
        return jsonify({'error': 'AI generation failed'}), 500

    # 7. Validate TMDB ID. If invalid, fall back to searching by title — no second Groq call.
    tmdb_id   = result.get('tmdb_id')
    title_hint = result.get('title', '')
    year_hint  = result.get('year')
    reason     = result.get('reason', '')
    tmdb_data  = None

    if tmdb_id:
        try:
            tmdb_data = get_movie_details(int(tmdb_id))
            # TMDB returns a dict with 'success': False for invalid IDs
            if tmdb_data and not tmdb_data.get('title'):
                tmdb_data = None
        except Exception:
            tmdb_data = None

    # Fallback: search TMDB by title (zero extra Groq calls)
    if not tmdb_data and title_hint:
        try:
            search_results = search_movies(title_hint)
            if search_results:
                # Prefer exact year match, otherwise take first result
                match = next(
                    (m for m in search_results
                     if year_hint and str(m.get('release_date', ''))[:4] == str(year_hint)),
                    search_results[0],
                )
                tmdb_data = get_movie_details(match['id'])
                if tmdb_data and not tmdb_data.get('title'):
                    tmdb_data = None
        except Exception:
            tmdb_data = None

    if not tmdb_data:
        return jsonify({'error': 'Could not find that movie in our database. Your spin has been used for today.'}), 500

    movie = format_movie(tmdb_data)
    return jsonify({'movie': movie, 'reason': reason, 'groqPowered': True})


# ── AI Discover Recommendations ───────────────────────────────────

def _get_watch_count(uid):
    from firebase_admin import firestore as _fs
    db = _fs.client()
    try:
        agg = (db.collection('users').document(uid)
                 .collection('watched_movies').count().get())
        return agg[0][0].value
    except Exception:
        docs = list(db.collection('users').document(uid)
                      .collection('watched_movies').stream())
        return len(docs)


def _generate_ai_recs(uid, current_watch_count):
    """Calls Groq, validates TMDBs, stores + returns formatted rows."""
    from firebase_admin import firestore as _fs

    if not _groq_client:
        return None

    if not check_and_increment_groq_budget():
        return None

    db      = _fs.client()
    profile = get_user_taste_profile(uid)
    if not profile:
        return None

    prompt = f"""You are a personalized movie recommendation engine.

USER PROFILE:
- Top genres: {profile['top_genres']}
- Favorite directors: {profile['top_directors']}
- Favorite actors: {profile['top_actors']}
- Preferred decades: {profile['decade_breakdown']}
- Rating style: {profile['rating_style']}
- Personal favorites: {profile['top_rated_movies']}
- Streaming services: {profile['streaming_services']}
- Already watched (exclude all of these): {profile['all_watched_tmdb_ids'][:200]}

Generate 20 movies this user has NOT watched that they will love.
Organize into exactly 4 rows of 5 movies each.
Row labels must be personal and specific, not generic. Examples:
- "Because you love Christopher Nolan"
- "Your kind of 90s psychological thriller"
- "Critically loved dramas you haven't seen"
- "Hidden gems your taste profile predicts you'd rate 9+"

Return ONLY valid JSON, no markdown:
{{
  "rows": [
    {{
      "label": "string",
      "movies": [
        {{ "tmdb_id": number, "title": "string", "year": number }}
      ]
    }}
  ]
}}"""

    try:
        text = call_groq(prompt, max_tokens=1500)
        data = parse_llm_json(text)
    except Exception as e:
        print(f"AI recs Groq error for {uid}: {e}")
        return None

    # Validate TMDBs and format movies
    rows_out = []
    for row in data.get('rows', []):
        label        = row.get('label', '')
        movies_in    = row.get('movies', [])
        movies_valid = []
        for m in movies_in:
            tmdb_id = m.get('tmdb_id')
            if not tmdb_id:
                continue
            try:
                details = get_movie_details(int(tmdb_id))
                if not details or details.get('status_code') == 34 or details.get('error'):
                    continue
                movies_valid.append(format_movie(details))
            except Exception:
                continue
        if movies_valid:
            rows_out.append({'label': label, 'movies': movies_valid})

    if not rows_out:
        return None

    # Store validated result in Firestore with randomized TTL (5–9 days)
    now_utc   = datetime.now(timezone.utc)
    ttl_days  = _random.randint(5, 9)
    expires_at = now_utc + timedelta(days=ttl_days)
    try:
        db.collection('users').document(uid).update({
            'aiRecommendations': {
                'rows':                   rows_out,
                'generatedAt':            now_utc,
                'expiresAt':              expires_at,
                'watchCountAtGeneration': current_watch_count,
                'locked':                 False,
            }
        })
    except Exception as e:
        print(f"AI recs Firestore write error for {uid}: {e}")

    return rows_out


@app.route('/api/discover/ai-recommendations', methods=['GET'])
@require_auth
@limiter.limit("10 per minute; 30 per hour")
def ai_recommendations():
    from firebase_admin import firestore as _fs
    uid = g.verified_uid
    db  = _fs.client()

    # Read cached data from user doc
    user_doc  = db.collection('users').document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    cache     = user_data.get('aiRecommendations') or {}

    generated_at      = cache.get('generatedAt')
    watch_count_at_gen = cache.get('watchCountAtGeneration', 0)
    cached_rows       = cache.get('rows', [])

    current_watch_count = _get_watch_count(uid)

    # Determine freshness
    locked      = cache.get('locked', False)
    expires_at  = cache.get('expiresAt')
    cache_fresh = False
    if cached_rows:
        now_utc = datetime.now(timezone.utc)
        try:
            if locked:
                cache_fresh = True
            elif expires_at:
                exp_dt      = expires_at.replace(tzinfo=timezone.utc) if expires_at.tzinfo is None else expires_at
                new_watches = current_watch_count - watch_count_at_gen
                cache_fresh = now_utc < exp_dt and new_watches < 10
            elif generated_at:
                gen_dt      = generated_at.replace(tzinfo=timezone.utc) if generated_at.tzinfo is None else generated_at
                age_days    = (now_utc - gen_dt).days
                new_watches = current_watch_count - watch_count_at_gen
                cache_fresh = age_days < 7 and new_watches < 10
        except Exception:
            cache_fresh = False

    if cache_fresh:
        return jsonify({'rows': cached_rows})

    if cached_rows:
        # Return stale immediately; refresh in background
        def regen():
            try:
                _generate_ai_recs(uid, current_watch_count)
            except Exception as e:
                print(f"Background AI recs regen error: {e}")
        threading.Thread(target=regen, daemon=True).start()
        return jsonify({'rows': cached_rows})

    # No cache at all — generate synchronously
    rows = _generate_ai_recs(uid, current_watch_count)
    return jsonify({'rows': rows or []})


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


# ── Group Chat ───────────────────────────────────────────────────

@app.route('/api/groups/<group_id>/chat', methods=['GET'])
def get_chat(group_id):
    return jsonify({'messages': get_group_chat(group_id)})

@app.route('/api/groups/<group_id>/chat', methods=['POST'])
@require_auth
def post_chat(group_id):
    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'success': False, 'message': 'Empty message'}), 400
    if len(text) > 2000:
        return jsonify({'success': False, 'message': 'message must be 2000 characters or fewer'}), 400
    return jsonify(send_group_message(
        group_id, g.verified_uid, data.get('sender_username', ''), text,
    ))


# ── Direct Messages ──────────────────────────────────────────────

@app.route('/api/conversations/<user_id>', methods=['GET'])
def get_user_conversations(user_id):
    return jsonify({'conversations': get_conversations(user_id)})

@app.route('/api/conversations/open', methods=['POST'])
@require_auth
def open_conversation():
    data = request.get_json() or {}
    result = get_or_create_conversation(
        data.get('uid1'), data.get('uid2'),
        data.get('username1', ''), data.get('username2', ''),
    )
    return jsonify(result)

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_conversation_messages(conversation_id):
    return jsonify({'messages': get_messages(conversation_id)})

@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
@require_auth
def post_message(conversation_id):
    data = request.get_json() or {}
    text = (data.get('text') or '').strip()
    if not text:
        return jsonify({'success': False, 'message': 'Empty message'}), 400
    if len(text) > 2000:
        return jsonify({'success': False, 'message': 'message must be 2000 characters or fewer'}), 400
    return jsonify(send_message(conversation_id, g.verified_uid, text))

@app.route('/api/conversations/<conversation_id>/read', methods=['PUT'])
@require_auth
def read_conversation(conversation_id):
    return jsonify(mark_conversation_read(conversation_id, g.verified_uid))


# ── Account management ───────────────────────────────────────────

@app.route('/api/user/<user_id>/email', methods=['PUT'])
@require_auth
def change_email(user_id):
    err = _own_account(user_id)
    if err: return err
    data = request.get_json() or {}
    new_email = (data.get('email') or '').strip()
    if not new_email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    return jsonify(update_user_email(user_id, new_email))

@app.route('/api/user/<user_id>/account', methods=['DELETE'])
@require_auth
def delete_account(user_id):
    err = _own_account(user_id)
    if err: return err
    return jsonify(delete_user_account(user_id))


# ── Rankings ─────────────────────────────────────────────────────

_RANKINGS_TTL = 5 * 60  # 5 min server-side cache

@app.route('/api/users/<user_id>/rankings', methods=['GET'])
def get_rankings_for_user(user_id):
    cache_key = f'rankings:{user_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'rankings': cached})
    rankings = serialize_timestamps(get_user_rankings(user_id))
    _cache_set(cache_key, rankings, _RANKINGS_TTL)
    return jsonify({'rankings': rankings})


@app.route('/api/rankings', methods=['POST'])
@require_auth
def create_ranking_route():
    data = request.get_json() or {}
    user_id     = g.verified_uid
    username    = (data.get('username') or '').strip()
    title       = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    movies      = data.get('movies') or []
    is_public   = bool(data.get('is_public', True))
    if not title:
        return jsonify({'success': False, 'message': 'title is required'}), 400
    if len(movies) < 2:
        return jsonify({'success': False, 'message': 'A ranking needs at least 2 movies'}), 400
    if len(movies) > 50:
        return jsonify({'success': False, 'message': 'Maximum 50 movies per ranking'}), 400
    result = create_ranking(user_id, username, title, description, movies, is_public)
    if result.get('success'):
        _cache.pop(f'rankings:{user_id}', None)
    return jsonify(result)


@app.route('/api/rankings/<ranking_id>', methods=['PUT'])
@require_auth
def update_ranking_route(ranking_id):
    data        = request.get_json() or {}
    user_id     = g.verified_uid
    title       = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    movies      = data.get('movies') or []
    is_public   = bool(data.get('is_public', True))
    if not title:
        return jsonify({'success': False, 'message': 'title is required'}), 400
    if len(movies) < 2:
        return jsonify({'success': False, 'message': 'A ranking needs at least 2 movies'}), 400
    result = update_ranking(ranking_id, user_id, title, description, movies, is_public)
    if result.get('success'):
        _cache.pop(f'rankings:{user_id}', None)
    return jsonify(result)


@app.route('/api/rankings/<ranking_id>', methods=['DELETE'])
@require_auth
def delete_ranking_route(ranking_id):
    user_id = g.verified_uid
    result  = delete_ranking(ranking_id, user_id)
    if result.get('success'):
        _cache.pop(f'rankings:{user_id}', None)
    return jsonify(result)


@app.route('/api/friends/<user_id>/rankings', methods=['GET'])
def get_friend_rankings_route(user_id):
    cache_key = f'friend_rankings:{user_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return jsonify({'rankings': cached})
    rankings = serialize_timestamps(get_friends_rankings(user_id))
    _cache_set(cache_key, rankings, _RANKINGS_TTL)
    return jsonify({'rankings': rankings})


# ── Health check ─────────────────────────────────────────────────
# No auth, no DB, no TMDB — used by UptimeRobot to keep the server warm.

@app.route('/api/health', methods=['GET'])
@limiter.exempt
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now(timezone.utc).isoformat()}), 200


# ── Rate limit error handler ──────────────────────────────────────

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({'error': 'Too many requests. Please slow down.', 'retry_after': str(e.description)}), 429


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

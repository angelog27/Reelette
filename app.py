from concurrent.futures import ThreadPoolExecutor, as_completed
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import SECRET_KEY
import time
from firebase_helper import (
    create_user, verify_user, get_user_data,
    update_streaming_services, get_user_streaming_services,
    add_to_watchlist, get_watchlist,
    add_watched_movie, get_watched_movies, get_watched_movie, update_watched_rating,
    create_post, get_feed, like_post, add_reply, get_replies, delete_post, send_password_reset_email,
    get_notifications, mark_all_notifications_read,
    search_users, get_or_create_dm, create_group_chat,
    get_conversations, get_messages, send_message,
)
from tmdb_api import (
    search_movies, discover_movies, get_popular_movies, get_movie_details,
    get_streaming_providers, get_genres, get_trending_movies, get_top_rated_movies,
    get_poster_url, search_person
)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])
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
        'poster': get_poster_url(movie_data.get('poster_path')) or '',
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

# Movie details (credits, overview, etc.) can be cached longer since they don't change often and are more expensive to fetch. We want to avoid hammering the TMDB API for details on every movie in the popular/trending lists, so we cache them separately with a longer TTL.
_MOVIE_DETAIL_TTL = 12 * 60 * 60   # 12 h  — credits, overview, etc.

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

@app.route('/api/movies/search', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    page = request.args.get('page', 1, type=int)
    if not query:
        return jsonify({'movies': []})
    data = search_movies(query, page=page)
    if not data:
        return jsonify({'movies': []})
    movies = fetch_movies_with_streaming(data.get('results', []))
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

# ── User Routes ──────────────────────────────────────────────────

@app.route('/api/user/<user_id>', methods=['GET'])
def user_data(user_id):
    data = get_user_data(user_id)
    if not data:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(serialize_timestamps(data))

@app.route('/api/user/<user_id>/streaming', methods=['GET'])
def get_streaming(user_id):
    services = get_user_streaming_services(user_id)
    return jsonify(services)

@app.route('/api/user/<user_id>/streaming', methods=['PUT'])
def update_streaming(user_id):
    services = request.get_json() or {}
    result = update_streaming_services(user_id, services)
    return jsonify(result)

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

# ── Watched Movies Routes ────────────────────────────────────────

@app.route('/api/watched/<user_id>', methods=['GET'])
def get_user_watched(user_id):
    return jsonify({'movies': serialize_timestamps(get_watched_movies(user_id))})

@app.route('/api/watched/<user_id>/<movie_id>', methods=['GET'])
def get_user_watched_movie(user_id, movie_id):
    entry = get_watched_movie(user_id, movie_id)
    if not entry:
        return jsonify({'watched': False})
    return jsonify({'watched': True, **serialize_timestamps(entry)})

@app.route('/api/watched/<user_id>', methods=['POST'])
def add_user_watched(user_id):
    data = request.get_json() or {}
    movie = data.get('movie')
    user_rating = data.get('user_rating')
    comment = data.get('comment', '')
    if not movie or user_rating is None:
        return jsonify({'success': False, 'message': 'movie and user_rating required'}), 400
    return jsonify(add_watched_movie(user_id, movie, user_rating, comment))

@app.route('/api/watched/<user_id>/<movie_id>', methods=['PUT'])
def update_user_watched_rating(user_id, movie_id):
    data = request.get_json() or {}
    new_rating = data.get('rating')
    comment = data.get('comment')
    if new_rating is None:
        return jsonify({'success': False, 'message': 'rating required'}), 400
    return jsonify(update_watched_rating(user_id, movie_id, new_rating, comment))

# ── Social Feed Routes ───────────────────────────────────────────

@app.route('/api/feed', methods=['GET'])
def social_feed():
    limit = request.args.get('limit', 20, type=int)
    posts = get_feed(limit=limit)
    return jsonify({'posts': serialize_timestamps(posts)})

@app.route('/api/feed', methods=['POST'])
def create_feed_post():
    data = request.get_json() or {}
    user_id    = data.get('user_id', '').strip()
    username   = data.get('username', '').strip()
    message    = data.get('message', '').strip()
    movie_title = data.get('movie_title', '').strip()
    movie_id   = data.get('movie_id', '')
    rating     = data.get('rating', 0)
    if not all([user_id, username, message, movie_title]):
        return jsonify({'success': False, 'message': 'user_id, username, message, and movie_title are required'}), 400
    return jsonify(create_post(user_id, username, message, movie_title, movie_id, rating))

@app.route('/api/feed/<post_id>/like', methods=['POST'])
def like_feed_post(post_id):
    data = request.get_json() or {}
    user_id = data.get('user_id', '').strip()
    username = data.get('username', '').strip()
    if not user_id:
        return jsonify({'success': False, 'message': 'user_id required'}), 400
    return jsonify(like_post(post_id, user_id, from_username=username))

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

# ── User Search Route ────────────────────────────────────────────

@app.route('/api/users/search', methods=['GET'])
def search_users_route():
    q = request.args.get('q', '').strip()
    exclude = request.args.get('exclude', '').strip() or None
    if not q:
        return jsonify({'users': []})
    return jsonify({'users': search_users(q, exclude_user_id=exclude)})


# ── Messaging Routes ─────────────────────────────────────────────

@app.route('/api/conversations/<user_id>', methods=['GET'])
def get_user_conversations(user_id):
    convs = get_conversations(user_id)
    return jsonify({'conversations': serialize_timestamps(convs)})


@app.route('/api/conversations', methods=['POST'])
def create_conversation():
    data = request.get_json() or {}
    conv_type   = data.get('type', '').strip()
    creator_id  = data.get('creator_id', '').strip()
    creator_name = data.get('creator_name', '').strip()
    members     = data.get('members', [])   # [{user_id, username}, ...]
    group_name  = data.get('name', '').strip()

    if not creator_id or not creator_name:
        return jsonify({'success': False, 'message': 'creator_id and creator_name required'}), 400

    if conv_type == 'dm':
        if len(members) != 1:
            return jsonify({'success': False, 'message': 'DM requires exactly one other member'}), 400
        result = get_or_create_dm(
            creator_id, creator_name,
            members[0]['user_id'], members[0]['username']
        )
    elif conv_type == 'group':
        if not members or not group_name:
            return jsonify({'success': False, 'message': 'Group requires members and a name'}), 400
        result = create_group_chat(creator_id, creator_name, members, group_name)
    else:
        return jsonify({'success': False, 'message': 'type must be "dm" or "group"'}), 400

    return jsonify(result)


@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
def get_conversation_messages(conversation_id):
    limit = request.args.get('limit', 50, type=int)
    msgs = get_messages(conversation_id, limit=limit)
    return jsonify({'messages': serialize_timestamps(msgs)})


@app.route('/api/conversations/<conversation_id>/messages', methods=['POST'])
def send_conversation_message(conversation_id):
    data = request.get_json() or {}
    user_id  = data.get('user_id', '').strip()
    username = data.get('username', '').strip()
    text     = data.get('text', '').strip()
    if not all([user_id, username, text]):
        return jsonify({'success': False, 'message': 'user_id, username, and text required'}), 400
    return jsonify(send_message(conversation_id, user_id, username, text))


# ── Notification Routes ──────────────────────────────────────────

@app.route('/api/notifications/<user_id>', methods=['GET'])
def get_user_notifications(user_id):
    limit = request.args.get('limit', 30, type=int)
    notifications = get_notifications(user_id, limit=limit)
    return jsonify({'notifications': serialize_timestamps(notifications)})


@app.route('/api/notifications/<user_id>/read-all', methods=['POST'])
def mark_all_read(user_id):
    return jsonify(mark_all_notifications_read(user_id))


if __name__ == '__main__':
    app.run(debug=True, port=5000)

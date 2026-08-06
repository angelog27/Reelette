import json
from collections import defaultdict
from firebase_admin import firestore
from datetime import datetime, timezone

_SERVICE_NAMES = {
    'netflix':     'Netflix',
    'hulu':        'Hulu',
    'disneyPlus':  'Disney+',
    'hboMax':      'Max',
    'amazonPrime': 'Prime Video',
    'appleTV':     'Apple TV+',
    'paramount':   'Paramount+',
    'peacock':     'Peacock',
}


def get_user_taste_profile(uid):
    """Read all watched movies for uid from Firestore and build a taste profile dict."""
    db = firestore.client()

    docs = (db.collection('users').document(uid)
              .collection('watched_movies')
              .order_by('watched_at', direction=firestore.Query.DESCENDING)
              .stream())
    movies = [doc.to_dict() for doc in docs]

    if not movies:
        return None

    user_doc = db.collection('users').document(uid).get()
    streaming_raw = {}
    if user_doc.exists:
        streaming_raw = user_doc.to_dict().get('streamingServices', {})
    streaming_services = [
        _SERVICE_NAMES[k] for k, v in streaming_raw.items()
        if v and k in _SERVICE_NAMES
    ]

    genre_counts  = defaultdict(int)
    genre_ratings = defaultdict(list)
    for m in movies:
        for g in (m.get('genres') or []):
            if g:
                genre_counts[g] += 1
                if m.get('user_rating'):
                    genre_ratings[g].append(m['user_rating'])

    top_genres = [
        {
            'genre': g,
            'count': c,
            'avg_rating': round(sum(genre_ratings[g]) / len(genre_ratings[g]), 1)
                          if genre_ratings[g] else 0,
        }
        for g, c in sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    director_counts  = defaultdict(int)
    director_ratings = defaultdict(list)
    for m in movies:
        d = m.get('director')
        if d:
            director_counts[d] += 1
            if m.get('user_rating'):
                director_ratings[d].append(m['user_rating'])

    top_directors = [
        {
            'name': d,
            'count': c,
            'avg_rating': round(sum(director_ratings[d]) / len(director_ratings[d]), 1)
                          if director_ratings[d] else 0,
        }
        for d, c in sorted(director_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    actor_counts  = defaultdict(int)
    actor_ratings = defaultdict(list)
    for m in movies:
        for a in (m.get('actors') or []):
            if a:
                actor_counts[a] += 1
                if m.get('user_rating'):
                    actor_ratings[a].append(m['user_rating'])

    top_actors = [
        {
            'name': a,
            'count': c,
            'avg_rating': round(sum(actor_ratings[a]) / len(actor_ratings[a]), 1)
                          if actor_ratings[a] else 0,
        }
        for a, c in sorted(actor_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    decade_counts = defaultdict(int)
    for m in movies:
        year = m.get('year')
        if year:
            decade_counts[f"{int(year) // 10 * 10}s"] += 1
    decade_breakdown = [
        {'decade': d, 'count': c}
        for d, c in sorted(decade_counts.items())
    ]

    ratings = [m['user_rating'] for m in movies if m.get('user_rating')]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0
    if avg_rating >= 8:
        rating_style = f"generous rater (avg {avg_rating})"
    elif avg_rating >= 6:
        rating_style = f"moderate rater (avg {avg_rating})"
    else:
        rating_style = f"critical rater (avg {avg_rating})"

    top_rated = sorted(
        [m for m in movies if m.get('user_rating') and m.get('title')],
        key=lambda x: x['user_rating'],
        reverse=True,
    )[:10]
    top_rated_movies = [
        {'title': m['title'], 'year': m.get('year', 0), 'rating': m['user_rating']}
        for m in top_rated
    ]

    def _to_int(val):
        try:
            return int(val)
        except (TypeError, ValueError):
            return None

    all_ids      = [i for i in (_to_int(m.get('movie_id')) for m in movies) if i]
    recently_ids = all_ids[:20]

    return {
        'top_genres':                top_genres,
        'top_directors':             top_directors,
        'top_actors':                top_actors,
        'decade_breakdown':          decade_breakdown,
        'avg_rating':                avg_rating,
        'rating_style':              rating_style,
        'top_rated_movies':          top_rated_movies,
        'recently_watched_tmdb_ids': recently_ids,
        'all_watched_tmdb_ids':      all_ids,
        'streaming_services':        streaming_services,
        '_total_watched':            len(movies),
    }


def parse_llm_json(text):
    """Strip markdown fences from LLM output and parse JSON."""
    text = text.strip()
    if text.startswith('```'):
        lines = text.split('\n')
        start = 1
        end   = len(lines) - 1 if lines[-1].strip() == '```' else len(lines)
        text  = '\n'.join(lines[start:end])
    return json.loads(text)

"""Gunicorn config for the Reelette API.

The workload is I/O-bound (every request waits on TMDB / Firebase), so we use
threaded workers: a small number of worker processes, each with a pool of
threads, gives high request concurrency without the GIL getting in the way of
network waits. Threads inside one worker also share the in-process caches
(_cache / _provider_cache / TMDB cache), so fewer workers = higher cache hit
rate. Tune via the WEB_CONCURRENCY / GUNICORN_THREADS env vars.
"""
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Worker processes. Keep this low so the in-process caches stay shared.
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))

# Threads per worker — this is what lets the ~15 parallel home-page requests
# actually run concurrently instead of queueing behind one sync worker.
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", "8"))

# A request may fan out to several TMDB calls; give it room but don't let a
# stuck request hold a worker forever.
timeout = 60
graceful_timeout = 30
keepalive = 5

# Recycle workers periodically to bound memory growth from the in-process caches.
max_requests = 2000
max_requests_jitter = 200

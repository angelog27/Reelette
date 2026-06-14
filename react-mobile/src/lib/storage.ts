/**
 * AsyncStorage wrapper that mirrors the localStorage API used in the web app.
 * Drop-in replacement for all cache, user, and services storage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },

  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch {
      return [];
    }
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {}
  },
};

// ── In-memory cache (survives within an app session, cleared on restart) ──────
const _memCache = new Map<string, { data: unknown; expires: number }>();

const LS_PREFIX = 'rl_cache:';

function memGet<T>(key: string): T | undefined {
  const entry = _memCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { _memCache.delete(key); return undefined; }
  return entry.data as T;
}

function memSet<T>(key: string, data: T, ttlMs: number): void {
  _memCache.set(key, { data, expires: Date.now() + ttlMs });
}

async function lsGet<T>(key: string): Promise<T | undefined> {
  const raw = await storage.getItem(LS_PREFIX + key);
  if (!raw) return undefined;
  try {
    const parsed: { data: T; expires: number } = JSON.parse(raw);
    if (Date.now() > parsed.expires) {
      await storage.removeItem(LS_PREFIX + key);
      return undefined;
    }
    return parsed.data;
  } catch {
    return undefined;
  }
}

async function lsSet<T>(key: string, data: T, ttlMs: number): Promise<void> {
  await storage.setItem(
    LS_PREFIX + key,
    JSON.stringify({ data, expires: Date.now() + ttlMs })
  );
}

// Inflight deduplication
const _inflight = new Map<string, Promise<unknown>>();

/**
 * Memory-only cache. Fast, cleared on app restart.
 */
export function fromCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const mem = memGet<T>(key);
  if (mem !== undefined) return Promise.resolve(mem);

  if (_inflight.has(key)) return _inflight.get(key) as Promise<T>;

  const promise = fn().then(data => {
    memSet(key, data, ttlMs);
    _inflight.delete(key);
    return data;
  }).catch(err => {
    _inflight.delete(key);
    throw err;
  });

  _inflight.set(key, promise);
  return promise;
}

/**
 * Two-tier cache: memory first, then AsyncStorage, then network.
 */
export async function fromCachePersisted<T>(
  key: string,
  memTtlMs: number,
  lsTtlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const mem = memGet<T>(key);
  if (mem !== undefined) return mem;

  const ls = await lsGet<T>(key);
  if (ls !== undefined) {
    memSet(key, ls, memTtlMs);
    return ls;
  }

  if (_inflight.has(key)) return _inflight.get(key) as Promise<T>;

  const promise = fn().then(async data => {
    memSet(key, data, memTtlMs);
    await lsSet(key, data, lsTtlMs);
    _inflight.delete(key);
    return data;
  }).catch(err => {
    _inflight.delete(key);
    throw err;
  });

  _inflight.set(key, promise);
  return promise;
}

export async function bustCache(key: string): Promise<void> {
  _memCache.delete(key);
  await storage.removeItem(LS_PREFIX + key);
}

export async function bustCachePrefix(prefix: string): Promise<void> {
  const keys = await storage.getAllKeys();
  const toRemove = keys.filter(k => k.startsWith(LS_PREFIX + prefix)) as string[];
  keys.forEach(k => { if (k.startsWith(LS_PREFIX + prefix)) _memCache.delete(k.slice(LS_PREFIX.length)); });
  if (toRemove.length) await storage.multiRemove(toRemove);
}

// High-performance client-side query cache to prevent PocketBase rate-limit exhaustion (< 1000 requests/hour)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutos de cache

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.defaultTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + (ttlMs || 0)
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();

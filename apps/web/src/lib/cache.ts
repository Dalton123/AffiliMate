/**
 * Simple LRU cache with TTL for server-side caching
 * Used to cache frequently accessed data like API keys and targeting rules
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options: { maxSize?: number; ttlMs?: number } = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 1000;
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    // Delete existing to update position
    this.cache.delete(key);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Delete entries matching a prefix (useful for invalidating project-specific caches)
  deleteByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  get size(): number {
    return this.cache.size;
  }
}

// Singleton caches for different data types
// API key cache: short TTL (2 minutes), moderate size
export const apiKeyCache = new LRUCache<{
  projectId: string;
  isActive: boolean;
  expiresAt: string | null;
  scopes: string[];
}>({
  maxSize: 500,
  ttlMs: 2 * 60 * 1000, // 2 minutes
});

// Placement cache: medium TTL (5 minutes)
export const placementCache = new LRUCache<{
  id: string;
  isActive: boolean;
  fallbackType: string;
  fallbackCreativeId: string | null;
  fallbackUrl: string | null;
}>({
  maxSize: 200,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

// Rules cache: medium TTL (5 minutes)
// Key: placementId, Value: array of rules with creatives
export const rulesCache = new LRUCache<unknown[]>({
  maxSize: 200,
  ttlMs: 5 * 60 * 1000, // 5 minutes
});

// Helper to invalidate all caches for a project
export function invalidateProjectCache(projectId: string): void {
  apiKeyCache.deleteByPrefix(`${projectId}:`);
  placementCache.deleteByPrefix(`${projectId}:`);
  rulesCache.deleteByPrefix(`${projectId}:`);
}

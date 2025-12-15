/**
 * Simple in-memory cache implementation
 * Provides TTL (time-to-live) support and automatic expiration
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL?: number;

  constructor(options: CacheOptions = {}) {
    this.defaultTTL = options.ttl;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.ttl) {
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return null;
      }
    }

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache manager for feature-specific caches
 */
export class CacheManager {
  private caches = new Map<string, Cache<any>>();

  /**
   * Get or create a cache for a feature
   */
  getCache<T>(feature: string, options?: CacheOptions): Cache<T> {
    if (!this.caches.has(feature)) {
      this.caches.set(feature, new Cache<T>(options));
    }
    return this.caches.get(feature)!;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Clear cache for a specific feature
   */
  clearFeature(feature: string): void {
    this.caches.get(feature)?.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

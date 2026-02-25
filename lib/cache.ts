/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used for caching user stats to reduce database queries
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttlMinutes: number = 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMinutes * 60 * 1000;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access order (move to end to mark as recently used)
    this.cache.delete(key);
    entry.hits += 1;
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If cache is full, remove least recently used entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Check if a key exists in cache (without updating access order)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidateUser(userId: string): void {
    // Delete all entries that start with the user ID
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`user:${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Global cache instance for user stats
// Using a singleton pattern to share cache across requests
let userStatsCache: LRUCache<unknown> | null = null;

export function getUserStatsCache(): LRUCache<unknown> {
  if (!userStatsCache) {
    // Create cache with 100 entries and 5 minute TTL
    userStatsCache = new LRUCache<unknown>(100, 5);
  }
  return userStatsCache;
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateUserStatsCache(userId: string): void {
  const cache = getUserStatsCache();
  cache.invalidateUser(userId);
}

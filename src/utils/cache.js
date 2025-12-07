// In-Memory Cache Utility for MediConnect Pro
// Provides simple caching with TTL (Time To Live) support

const logger = require('./logger');

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 60000; // Default: 1 minute
    this.maxSize = options.maxSize || 1000; // Maximum cache entries
    this.cleanupInterval = options.cleanupInterval || 60000; // Cleanup every minute
    this.hits = 0;
    this.misses = 0;

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);

    // Prevent timer from keeping Node.js alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Generate cache key from request
   * @param {Object} req - Express request object
   * @returns {string} Cache key
   */
  generateKey(req) {
    // Support both session.user.id and session.userId formats
    const userId = req.session?.user?.id || req.session?.userId || 'anonymous';
    const role = req.session?.user?.role || req.session?.userRole || 'guest';
    return `${req.method}:${req.originalUrl}:${userId}:${role}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param {string} pattern - Pattern to match (simple prefix match)
   */
  invalidatePattern(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(`Cache: Invalidated ${count} entries matching pattern: ${pattern}`);
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    logger.debug(`Cache: Cleared ${size} entries`);
  }

  /**
   * Remove expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache: Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Cache: Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      defaultTTL: this.defaultTTL
    };
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  stop() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Create singleton instance for API responses
const apiCache = new MemoryCache({
  defaultTTL: 30000, // 30 seconds for API responses
  maxSize: 500
});

// Cache middleware factory
function cacheMiddleware(options = {}) {
  const {
    ttl = 30000,
    keyGenerator = null,
    condition = null
  } = options;

  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check custom condition
    if (condition && !condition(req)) {
      return next();
    }

    // Generate cache key
    const key = keyGenerator ? keyGenerator(req) : apiCache.generateKey(req);

    // Check cache
    const cached = apiCache.get(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        apiCache.set(key, body, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Invalidation middleware for mutations
function invalidateCache(patterns) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override to invalidate cache after successful mutations
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (Array.isArray(patterns)) {
          patterns.forEach(pattern => apiCache.invalidatePattern(pattern));
        } else if (typeof patterns === 'function') {
          const dynamicPatterns = patterns(req);
          if (Array.isArray(dynamicPatterns)) {
            dynamicPatterns.forEach(p => apiCache.invalidatePattern(p));
          } else {
            apiCache.invalidatePattern(dynamicPatterns);
          }
        } else {
          apiCache.invalidatePattern(patterns);
        }
      }
      return originalJson(body);
    };

    next();
  };
}

module.exports = {
  MemoryCache,
  apiCache,
  cacheMiddleware,
  invalidateCache
};

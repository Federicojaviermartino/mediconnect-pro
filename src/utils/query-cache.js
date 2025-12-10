/**
 * Query Cache Utility
 * Provides Redis-based query result caching with TTL and invalidation
 * Gracefully falls back when Redis is not available
 */

const logger = require('../../demo-app/utils/logger');

class QueryCache {
  constructor(ttl = 300) { // 5 minutes default
    this.ttl = ttl;
    this.enabled = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
    this.redisClient = null;

    if (this.enabled) {
      this.initializeRedis();
    } else {
      logger.warn('Query cache disabled - Redis not configured', {
        component: 'query-cache',
        operation: 'init'
      });
    }
  }

  /**
   * Initialize Redis client
   */
  async initializeRedis() {
    try {
      const redis = require('redis');

      // Create Redis client
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
        password: process.env.REDIS_PASSWORD,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed - disabling query cache', {
                component: 'query-cache',
                operation: 'reconnect',
                retries
              });
              return new Error('Max retries reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      // Handle Redis events
      this.redisClient.on('error', (err) => {
        logger.error('Redis client error', {
          component: 'query-cache',
          operation: 'redis-error',
          error: err.message
        });
        this.enabled = false;
      });

      this.redisClient.on('connect', () => {
        logger.info('Query cache connected to Redis', {
          component: 'query-cache',
          operation: 'connect'
        });
      });

      // Connect to Redis
      await this.redisClient.connect();
      this.enabled = true;

    } catch (error) {
      logger.error('Failed to initialize Redis for query caching', {
        component: 'query-cache',
        operation: 'init',
        error: error.message
      });
      this.enabled = false;
    }
  }

  /**
   * Get cached query result
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached data or null
   */
  async get(key) {
    if (!this.enabled || !this.redisClient) {
      return null;
    }

    try {
      const data = await this.redisClient.get(`query:${key}`);

      if (data) {
        logger.debug('Query cache hit', {
          component: 'query-cache',
          operation: 'get',
          key
        });
        return JSON.parse(data);
      }

      logger.debug('Query cache miss', {
        component: 'query-cache',
        operation: 'get',
        key
      });
      return null;

    } catch (error) {
      logger.error('Query cache get error', {
        component: 'query-cache',
        operation: 'get',
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Set cached query result
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = this.ttl) {
    if (!this.enabled || !this.redisClient) {
      return false;
    }

    try {
      await this.redisClient.setEx(
        `query:${key}`,
        ttl,
        JSON.stringify(data)
      );

      logger.debug('Query cached successfully', {
        component: 'query-cache',
        operation: 'set',
        key,
        ttl
      });
      return true;

    } catch (error) {
      logger.error('Query cache set error', {
        component: 'query-cache',
        operation: 'set',
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Invalidate cache by pattern
   * @param {string} pattern - Pattern to match (e.g., 'patient:123:*')
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidate(pattern) {
    if (!this.enabled || !this.redisClient) {
      return 0;
    }

    try {
      const keys = await this.redisClient.keys(`query:${pattern}`);

      if (keys.length > 0) {
        const deleted = await this.redisClient.del(keys);

        logger.info('Query cache invalidated', {
          component: 'query-cache',
          operation: 'invalidate',
          pattern,
          keysDeleted: deleted
        });
        return deleted;
      }

      return 0;

    } catch (error) {
      logger.error('Query cache invalidation error', {
        component: 'query-cache',
        operation: 'invalidate',
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Invalidate all cached queries
   * @returns {Promise<number>} Number of keys deleted
   */
  async invalidateAll() {
    if (!this.enabled || !this.redisClient) {
      return 0;
    }

    try {
      const keys = await this.redisClient.keys('query:*');

      if (keys.length > 0) {
        const deleted = await this.redisClient.del(keys);

        logger.info('All query cache invalidated', {
          component: 'query-cache',
          operation: 'invalidate-all',
          keysDeleted: deleted
        });
        return deleted;
      }

      return 0;

    } catch (error) {
      logger.error('Query cache invalidate all error', {
        component: 'query-cache',
        operation: 'invalidate-all',
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    if (!this.enabled || !this.redisClient) {
      return {
        enabled: false,
        totalKeys: 0
      };
    }

    try {
      const keys = await this.redisClient.keys('query:*');

      return {
        enabled: true,
        totalKeys: keys.length,
        ttl: this.ttl
      };

    } catch (error) {
      logger.error('Query cache stats error', {
        component: 'query-cache',
        operation: 'stats',
        error: error.message
      });
      return {
        enabled: false,
        totalKeys: 0,
        error: error.message
      };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      logger.info('Query cache Redis connection closed', {
        component: 'query-cache',
        operation: 'close'
      });
    }
  }
}

// Create singleton instance
const queryCache = new QueryCache(300); // 5 minutes default TTL

module.exports = queryCache;

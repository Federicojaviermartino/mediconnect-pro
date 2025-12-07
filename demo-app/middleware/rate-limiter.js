/**
 * Global Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

const logger = require('../utils/logger');

// In-memory store for rate limiting (use Redis in production for distributed systems)
const requestStore = new Map();

// Cleanup interval (every 1 minute)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestStore.entries()) {
    if (now - data.resetTime > 0) {
      requestStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limiting configuration presets
 */
const rateLimitPresets = {
  // Strict rate limiting for sensitive endpoints
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: false
  },

  // Standard rate limiting for API endpoints
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please slow down.',
    skipSuccessfulRequests: false
  },

  // Moderate rate limiting for authenticated endpoints
  moderate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many requests, please try again later.',
    skipSuccessfulRequests: true
  },

  // Generous rate limiting for public endpoints
  generous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Too many requests, please slow down.',
    skipSuccessfulRequests: true
  },

  // Per-user rate limiting (requires authentication)
  perUser: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window per user
    message: 'You have exceeded your request quota.',
    skipSuccessfulRequests: false,
    keyGenerator: (req) => `user:${req.session?.user?.id || req.ip}`
  }
};

/**
 * Create rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message when limit exceeded
 * @param {boolean} options.skipSuccessfulRequests - Skip counting successful requests
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @param {Function} options.skip - Function to determine if request should skip rate limiting
 * @param {Function} options.handler - Custom handler for rate limit exceeded
 * @returns {Function} Express middleware function
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    skip = () => false,
    handler = null
  } = options;

  return (req, res, next) => {
    // Check if request should skip rate limiting
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create request data for this key
    let requestData = requestStore.get(key);

    if (!requestData) {
      requestData = {
        count: 0,
        resetTime: now + windowMs,
        firstRequest: now
      };
      requestStore.set(key, requestData);
    }

    // Reset if window has expired
    if (now > requestData.resetTime) {
      requestData.count = 0;
      requestData.resetTime = now + windowMs;
      requestData.firstRequest = now;
    }

    // Increment request count
    requestData.count++;

    // Set rate limit headers
    const remaining = Math.max(0, max - requestData.count);
    const resetTime = new Date(requestData.resetTime);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

    // Check if limit exceeded
    if (requestData.count > max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: requestData.count,
        max,
        path: req.path,
        method: req.method
      });

      // Use custom handler if provided
      if (handler) {
        return handler(req, res, next);
      }

      // Default handler
      return res.status(429).json({
        success: false,
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // If skipSuccessfulRequests is true, decrement count on successful responses
    if (skipSuccessfulRequests) {
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        if (res.statusCode < 400 || body.success !== false) {
          requestData.count--;
        }
        return originalJson(body);
      };
    }

    next();
  };
}

/**
 * Get rate limiting preset
 * @param {string} preset - Preset name ('strict', 'standard', 'moderate', 'generous', 'perUser')
 * @param {Object} overrides - Options to override preset defaults
 * @returns {Function} Rate limiting middleware
 */
function getRateLimiter(preset = 'standard', overrides = {}) {
  const config = rateLimitPresets[preset];

  if (!config) {
    throw new Error(`Unknown rate limit preset: ${preset}`);
  }

  return createRateLimiter({ ...config, ...overrides });
}

/**
 * Global rate limiter - applies to all routes
 */
const globalRateLimiter = getRateLimiter('standard');

/**
 * Authentication endpoints rate limiter (strict)
 */
const authRateLimiter = getRateLimiter('strict', {
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

/**
 * API endpoints rate limiter (moderate)
 */
const apiRateLimiter = getRateLimiter('moderate');

/**
 * Public endpoints rate limiter (generous)
 */
const publicRateLimiter = getRateLimiter('generous');

/**
 * Per-user rate limiter
 */
const perUserRateLimiter = getRateLimiter('perUser');

/**
 * Dynamic rate limiter based on user role
 * Different limits for admin, doctor, and patient roles
 */
function dynamicRoleLimiter(options = {}) {
  const limits = {
    admin: 2000,
    doctor: 1000,
    patient: 500,
    anonymous: 100,
    ...options
  };

  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100, // Default max (will be overridden)
    keyGenerator: (req) => {
      const userId = req.session?.user?.id;
      const role = req.session?.user?.role || 'anonymous';
      return userId ? `user:${userId}` : `ip:${req.ip}`;
    },
    skip: (req) => {
      // Dynamically adjust max based on role
      const role = req.session?.user?.role || 'anonymous';
      const maxRequests = limits[role] || limits.anonymous;

      const key = req.session?.user?.id
        ? `user:${req.session.user.id}`
        : `ip:${req.ip}`;

      const requestData = requestStore.get(key);
      if (requestData) {
        // Update max for this key based on role
        return requestData.count <= maxRequests;
      }
      return true;
    }
  });
}

/**
 * Get current rate limit status for a key
 * @param {string} key - Rate limit key
 * @returns {Object} Rate limit status
 */
function getRateLimitStatus(key) {
  const requestData = requestStore.get(key);

  if (!requestData) {
    return {
      count: 0,
      remaining: null,
      resetTime: null
    };
  }

  return {
    count: requestData.count,
    resetTime: new Date(requestData.resetTime),
    firstRequest: new Date(requestData.firstRequest)
  };
}

/**
 * Reset rate limit for a specific key
 * @param {string} key - Rate limit key
 */
function resetRateLimit(key) {
  requestStore.delete(key);
  logger.info('Rate limit reset', { key });
}

/**
 * Get all rate limit keys (for admin monitoring)
 * @returns {Array} Array of rate limit keys with their data
 */
function getAllRateLimitKeys() {
  const keys = [];
  for (const [key, data] of requestStore.entries()) {
    keys.push({
      key,
      count: data.count,
      resetTime: new Date(data.resetTime),
      firstRequest: new Date(data.firstRequest)
    });
  }
  return keys;
}

module.exports = {
  createRateLimiter,
  getRateLimiter,
  globalRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  publicRateLimiter,
  perUserRateLimiter,
  dynamicRoleLimiter,
  getRateLimitStatus,
  resetRateLimit,
  getAllRateLimitKeys
};

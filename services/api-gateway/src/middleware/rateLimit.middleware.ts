/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

import { config } from '../config';
import { logger } from '../config/logger';
import { RateLimitError } from './error.middleware';

/**
 * Rate limit exceeded handler
 */
function rateLimitHandler(_req: Request, _res: Response): void {
  throw new RateLimitError('Too many requests, please try again later');
}

/**
 * Skip rate limiting for successful requests in development
 */
function skipSuccessfulRequests(_req: Request, res: Response): boolean {
  return config.env === 'development' && res.statusCode < 400;
}

/**
 * Generate rate limit key based on IP or user ID
 */
function keyGenerator(req: Request): string {
  // Use user ID if authenticated, otherwise use IP address
  if (req.user?.userId) {
    return `user_${req.user.userId}`;
  }
  return `ip_${req.ip}`;
}

/**
 * On limit reached callback for logging
 */
function onLimitReached(req: Request): void {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    userId: req.user?.userId,
    url: req.url,
    method: req.method,
  });
}

/**
 * General API Rate Limiter
 * Applies to all routes by default
 */
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator,
  skipSuccessfulRequests,
  handler: rateLimitHandler,
  onLimitReached,
});

/**
 * Strict Rate Limiter for Authentication Routes
 * More restrictive to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.rateLimit.authMaxRequests,
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Always count auth attempts
  handler: rateLimitHandler,
  onLimitReached: (req: Request) => {
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
      url: req.url,
    });
  },
});

/**
 * Password Reset Rate Limiter
 * Prevent abuse of password reset functionality
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler,
  onLimitReached: (req: Request) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
    });
  },
});

/**
 * Registration Rate Limiter
 * Prevent automated account creation
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: 'Too many accounts created from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler,
  onLimitReached: (req: Request) => {
    logger.warn('Registration rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
    });
  },
});

/**
 * API Key Rate Limiter
 * For external API integrations
 */
export const apiKeyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'API rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const apiKey = req.headers['x-api-key'] as string;
    return apiKey || req.ip || 'unknown';
  },
  handler: rateLimitHandler,
});

/**
 * File Upload Rate Limiter
 * Prevent abuse of file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: rateLimitHandler,
});

/**
 * Search Rate Limiter
 * Prevent abuse of search functionality
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many search requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: rateLimitHandler,
});

/**
 * Public API Rate Limiter
 * For publicly accessible endpoints (no authentication required)
 */
export const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/**
 * Create custom rate limiter with specific options
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum number of requests
 * @param message - Error message when limit is exceeded
 */
export function createRateLimiter(windowMs: number, max: number, message?: string) {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Rate limit exceeded',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    handler: rateLimitHandler,
    onLimitReached,
  });
}

export default {
  general: generalLimiter,
  auth: authLimiter,
  passwordReset: passwordResetLimiter,
  registration: registrationLimiter,
  apiKey: apiKeyLimiter,
  upload: uploadLimiter,
  search: searchLimiter,
  publicApi: publicApiLimiter,
  create: createRateLimiter,
};

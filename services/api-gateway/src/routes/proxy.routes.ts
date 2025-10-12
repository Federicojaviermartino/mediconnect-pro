/**
 * Proxy Routes Configuration
 * Routes requests to appropriate microservices
 */

import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Options } from 'http-proxy-middleware';

import { config } from '../config';
import { logger } from '../config/logger';
import { authenticate, authorize, optionalAuthenticate } from '../middleware';
import rateLimiters from '../middleware/rateLimit.middleware';

const router = Router();

/**
 * Common proxy options
 */
const commonProxyOptions: Partial<Options> = {
  changeOrigin: true,
  logLevel: 'warn',
  onProxyReq: (proxyReq, req) => {
    // Forward user information to microservices
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.userId);
      proxyReq.setHeader('X-User-Email', req.user.email);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }

    // Forward request ID
    if (req.requestId) {
      proxyReq.setHeader('X-Request-ID', req.requestId);
    }

    // Log proxy request
    logger.debug('Proxying request', {
      originalUrl: req.originalUrl,
      target: proxyReq.getHeader('host'),
      method: req.method,
    });
  },
  onProxyRes: (proxyRes, req) => {
    // Log proxy response
    logger.debug('Proxy response received', {
      originalUrl: req.originalUrl,
      statusCode: proxyRes.statusCode,
    });
  },
  onError: (err, req, res) => {
    logger.error('Proxy error', {
      error: err.message,
      url: req.url,
      method: req.method,
    });

    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The requested service is temporarily unavailable',
          timestamp: new Date(),
        },
      });
    }
  },
};

/**
 * Auth Service Proxy
 * Public routes: /auth/login, /auth/register
 * Protected routes: /auth/me, /auth/refresh
 */
router.use(
  '/auth/login',
  rateLimiters.auth,
  createProxyMiddleware({
    target: config.services.auth,
    pathRewrite: { '^/api/v1/auth': '' },
    ...commonProxyOptions,
  })
);

router.use(
  '/auth/register',
  rateLimiters.registration,
  createProxyMiddleware({
    target: config.services.auth,
    pathRewrite: { '^/api/v1/auth': '' },
    ...commonProxyOptions,
  })
);

router.use(
  '/auth/password-reset',
  rateLimiters.passwordReset,
  createProxyMiddleware({
    target: config.services.auth,
    pathRewrite: { '^/api/v1/auth': '' },
    ...commonProxyOptions,
  })
);

// Protected auth routes
router.use(
  '/auth',
  optionalAuthenticate, // Some auth routes need authentication
  createProxyMiddleware({
    target: config.services.auth,
    pathRewrite: { '^/api/v1/auth': '' },
    ...commonProxyOptions,
  })
);

/**
 * Patient Service Proxy
 * All routes require authentication
 * Doctors and admins can access all patient data
 * Patients can only access their own data
 */
router.use(
  '/patients',
  authenticate,
  rateLimiters.general,
  createProxyMiddleware({
    target: config.services.patient,
    pathRewrite: { '^/api/v1/patients': '' },
    ...commonProxyOptions,
  })
);

/**
 * Vitals Service Proxy
 * All routes require authentication
 */
router.use(
  '/vitals',
  authenticate,
  rateLimiters.general,
  createProxyMiddleware({
    target: config.services.vitals,
    pathRewrite: { '^/api/v1/vitals': '' },
    ...commonProxyOptions,
  })
);

/**
 * Consultation Service Proxy
 * All routes require authentication
 */
router.use(
  '/consultations',
  authenticate,
  rateLimiters.general,
  createProxyMiddleware({
    target: config.services.consultation,
    pathRewrite: { '^/api/v1/consultations': '' },
    ...commonProxyOptions,
  })
);

/**
 * ML Service Proxy
 * Only doctors and admins can access ML predictions
 */
router.use(
  '/ml',
  authenticate,
  authorize('admin', 'doctor'),
  rateLimiters.general,
  createProxyMiddleware({
    target: config.services.ml,
    pathRewrite: { '^/api/v1/ml': '' },
    ...commonProxyOptions,
  })
);

/**
 * Admin Routes
 * Only admins can access
 */
router.use(
  '/admin',
  authenticate,
  authorize('admin'),
  rateLimiters.general,
  createProxyMiddleware({
    target: config.services.auth, // Or dedicated admin service
    pathRewrite: { '^/api/v1/admin': '/admin' },
    ...commonProxyOptions,
  })
);

export default router;

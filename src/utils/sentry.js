/**
 * Sentry Error Tracking and Performance Monitoring
 *
 * Provides enterprise-grade error tracking, performance monitoring,
 * and real-time alerts for production applications.
 *
 * Features:
 * - Automatic error capturing and reporting
 * - Performance transaction tracking
 * - User context and tags for better debugging
 * - Environment-based configuration
 * - Graceful degradation when Sentry is not configured
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

let sentryInitialized = false;

/**
 * Initialize Sentry error tracking
 * @param {Object} app - Express app instance
 */
function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  // Skip initialization if DSN not configured
  if (!dsn) {
    console.log('ℹ️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: dsn,
      environment: process.env.NODE_ENV || 'development',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev

      // Profiling
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        // Enable HTTP call tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express tracing
        new Sentry.Integrations.Express({ app }),
        // Enable profiling
        new ProfilingIntegration(),
      ],

      // Release tracking
      release: process.env.npm_package_version || '1.0.0',

      // Error filtering
      beforeSend(event, hint) {
        // Filter out expected errors (404, validation errors, etc.)
        const error = hint.originalException;

        if (error && error.statusCode) {
          // Don't send 4xx errors to Sentry (client errors)
          if (error.statusCode >= 400 && error.statusCode < 500) {
            return null;
          }
        }

        // Add custom context
        if (event.request) {
          // Remove sensitive data from request
          if (event.request.data) {
            event.request.data = filterSensitiveData(event.request.data);
          }
        }

        return event;
      },

      // Ignore common noise
      ignoreErrors: [
        'Non-Error exception captured',
        'Non-Error promise rejection captured',
        /ECONNREFUSED/,
        /ENOTFOUND/,
        /timeout/i,
      ],
    });

    sentryInitialized = true;
    console.log('✅ Sentry error tracking initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error.message);
  }
}

/**
 * Express middleware for Sentry request handling
 * Must be used BEFORE all routes
 */
function requestHandler() {
  if (!sentryInitialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Express middleware for Sentry tracing
 * Must be used AFTER requestHandler but BEFORE routes
 */
function tracingHandler() {
  if (!sentryInitialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Express error handler for Sentry
 * Must be used AFTER all routes but BEFORE other error handlers
 */
function errorHandler() {
  if (!sentryInitialized) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture 5xx errors
      if (error.status >= 500) {
        return true;
      }
      return false;
    },
  });
}

/**
 * Capture an exception manually
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
function captureException(error, context = {}) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add context
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
      });
    }

    if (context.tags) {
      Object.keys(context.tags).forEach((key) => {
        scope.setTag(key, context.tags[key]);
      });
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(error);
  });
}

/**
 * Capture a message manually
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 */
function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context.user) {
      scope.setUser({
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
      });
    }

    if (context.tags) {
      Object.keys(context.tags).forEach((key) => {
        scope.setTag(key, context.tags[key]);
      });
    }

    if (context.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureMessage(message, level);
  });
}

/**
 * Start a performance transaction
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Object} Transaction object
 */
function startTransaction(name, op = 'http.server') {
  if (!sentryInitialized) {
    return {
      finish: () => {},
      setStatus: () => {},
      setHttpStatus: () => {},
      setTag: () => {},
      setData: () => {},
    };
  }

  return Sentry.startTransaction({
    name: name,
    op: op,
  });
}

/**
 * Add breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
function addBreadcrumb(breadcrumb) {
  if (!sentryInitialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context for error tracking
 * @param {Object} user - User data
 */
function setUser(user) {
  if (!sentryInitialized) {
    return;
  }

  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });
}

/**
 * Filter sensitive data from objects
 * @param {Object} data - Data to filter
 * @returns {Object} Filtered data
 */
function filterSensitiveData(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'ssn', 'creditCard'];
  const filtered = { ...data };

  Object.keys(filtered).forEach((key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitiveKey) => lowerKey.includes(sensitiveKey.toLowerCase()))) {
      filtered[key] = '[REDACTED]';
    } else if (typeof filtered[key] === 'object' && filtered[key] !== null) {
      filtered[key] = filterSensitiveData(filtered[key]);
    }
  });

  return filtered;
}

/**
 * Check if Sentry is initialized
 * @returns {boolean}
 */
function isInitialized() {
  return sentryInitialized;
}

module.exports = {
  initSentry,
  requestHandler,
  tracingHandler,
  errorHandler,
  captureException,
  captureMessage,
  startTransaction,
  addBreadcrumb,
  setUser,
  isInitialized,
};

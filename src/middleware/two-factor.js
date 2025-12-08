/**
 * Two-Factor Authentication Middleware
 *
 * Enforces 2FA verification for protected routes and admin access.
 * Integrates with session management to track 2FA completion status.
 */

const { is2FARequired } = require('../utils/two-factor');
const logger = require('../utils/logger');

/**
 * Middleware to require 2FA verification for sensitive operations
 * Must be used after requireAuth middleware
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function require2FA(req, res, next) {
  // Check if user is authenticated
  if (!req.session.user) {
    logger.logSecurity('2FA check failed: User not authenticated', 'medium');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.session.user;

  // Check if 2FA is required for this user
  if (!is2FARequired(user)) {
    // 2FA not required, allow access
    return next();
  }

  // Check if 2FA has been completed in this session
  if (req.session.twoFactorVerified === true) {
    // 2FA already verified in this session
    return next();
  }

  // 2FA required but not completed
  logger.logSecurity('2FA verification required', 'medium', {
    userId: user.id,
    role: user.role
  });

  return res.status(403).json({
    error: '2FA verification required',
    twoFactorRequired: true,
    message: 'Please complete two-factor authentication to continue'
  });
}

/**
 * Middleware to check if 2FA setup is required
 * Allows first-time setup for users who need 2FA but haven't set it up
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function check2FASetup(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.session.user;

  // Check if 2FA is required but not set up
  if (is2FARequired(user) && !user.twoFactorSecret) {
    logger.logAuth('2FA setup required', user.id, user.email, false);

    return res.status(403).json({
      error: '2FA setup required',
      twoFactorSetupRequired: true,
      message: 'Please set up two-factor authentication to continue'
    });
  }

  next();
}

/**
 * Middleware to verify 2FA token from request
 * Used in login flow after username/password verification
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function verify2FAToken(req, res, next) {
  const { twoFactorToken } = req.body;

  if (!twoFactorToken) {
    return res.status(400).json({
      error: 'Two-factor token required'
    });
  }

  // Token will be verified in the route handler with user's secret
  // This middleware just ensures the token is provided
  next();
}

/**
 * Mark 2FA as verified in the current session
 * @param {Object} req - Express request object
 */
function mark2FAVerified(req) {
  req.session.twoFactorVerified = true;
  req.session.twoFactorVerifiedAt = Date.now();

  logger.logAuth('2FA verified', req.session.user.id, req.session.user.email, true);
}

/**
 * Clear 2FA verification status from session
 * @param {Object} req - Express request object
 */
function clear2FAVerification(req) {
  if (req.session) {
    req.session.twoFactorVerified = false;
    delete req.session.twoFactorVerifiedAt;
  }
}

module.exports = {
  require2FA,
  check2FASetup,
  verify2FAToken,
  mark2FAVerified,
  clear2FAVerification
};

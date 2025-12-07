// CSRF Protection Middleware
// Custom implementation to replace deprecated csurf library
const crypto = require('crypto');

// Generate a random CSRF token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware to generate and attach CSRF token to session
function csrfProtection(req, res, next) {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Generate token if not exists
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateToken();
    }

    // Make token available to views/API
    res.locals.csrfToken = req.session.csrfToken;

    return next();
  }

  // For state-changing methods (POST, PUT, DELETE, PATCH), validate token
  const sessionToken = req.session.csrfToken;
  const requestToken = req.body._csrf || req.headers['x-csrf-token'] || req.query._csrf;

  if (!sessionToken) {
    return res.status(403).json({
      error: 'CSRF token not found in session. Please refresh the page.'
    });
  }

  if (!requestToken) {
    return res.status(403).json({
      error: 'CSRF token missing from request'
    });
  }

  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(sessionToken), Buffer.from(requestToken))) {
    return res.status(403).json({
      error: 'Invalid CSRF token'
    });
  }

  next();
}

// Endpoint to get CSRF token for AJAX requests
function setupCsrfEndpoint(app) {
  app.get('/api/csrf-token', (req, res) => {
    if (!req.session.csrfToken) {
      req.session.csrfToken = generateToken();
    }

    res.json({
      csrfToken: req.session.csrfToken
    });
  });
}

module.exports = {
  csrfProtection,
  setupCsrfEndpoint,
  generateToken
};

// Authentication routes
const bcrypt = require('bcryptjs');
const { validate, authSchemas } = require('../middleware/validators');

function setupAuthRoutes(app, db, authLimiter) {
  // Login endpoint (with rate limiting and validation)
  app.post('/api/auth/login', authLimiter, validate(authSchemas.login), async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = db.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Set session
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        specialization: user.specialization
      };

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          specialization: user.specialization
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });

  // Get current user
  app.get('/api/auth/me', (req, res) => {
    if (req.session && req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}

module.exports = { setupAuthRoutes };

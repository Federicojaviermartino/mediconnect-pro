// Authentication routes
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { validate, validateParams, authSchemas, paramSchemas } = require('../middleware/validators');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

function setupAuthRoutes(app, db, authLimiter) {
  // Register endpoint (with rate limiting and validation)
  app.post('/api/auth/register', authLimiter, validate(authSchemas.register), async (req, res) => {
    const { email, password, name } = req.body;

    try {
      // Check if user already exists
      const existingUser = db.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = db.createUser({
        email,
        password: hashedPassword,
        name,
        role: 'patient',
        specialization: null
      });

      // Create patient record
      db.createPatientRecord(user.id);

      res.status(201).json({
        success: true,
        message: 'Registration successful. You can now login.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Registration' });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Forgot password endpoint
  app.post('/api/auth/forgot-password', authLimiter, validate(authSchemas.forgotPassword), async (req, res) => {
    const { email } = req.body;

    try {
      const user = db.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({
          success: true,
          message: 'If this email is registered, you will receive a password reset link.'
        });
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      db.createPasswordResetToken(user.id, token, expiresAt);

      // In production, send email with reset link
      // For demo, we'll return the token (would be in email link)
      res.json({
        success: true,
        message: 'If this email is registered, you will receive a password reset link.',
        // Demo only: In production, this would be sent via email
        demo_token: process.env.NODE_ENV !== 'production' ? token : undefined
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Forgot password' });
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  // Reset password endpoint
  app.post('/api/auth/reset-password/:token', validateParams(paramSchemas.token), validate(authSchemas.resetPassword), async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
      const resetToken = db.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Check if token is expired
      if (new Date(resetToken.expires_at) < new Date()) {
        db.deletePasswordResetToken(token);
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      db.updateUser(resetToken.user_id, { password: hashedPassword });

      // Delete used token
      db.deletePasswordResetToken(token);

      res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Reset password' });
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

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
      logger.logApiError(error, req, { context: 'Login' });
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Change password endpoint (requires authentication)
  app.post('/api/auth/change-password', requireAuth, authLimiter, validate(authSchemas.changePassword), async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.user.id;

    try {
      const user = db.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify old password
      const validPassword = await bcrypt.compare(oldPassword, user.password);

      if (!validPassword) {
        logger.logAuth('change-password-failed', userId, user.email, false, { reason: 'Invalid old password' });
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      db.updateUser(userId, { password: hashedPassword });

      logger.logAuth('password-changed', userId, user.email, true);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Change password' });
      res.status(500).json({ error: 'Failed to change password' });
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

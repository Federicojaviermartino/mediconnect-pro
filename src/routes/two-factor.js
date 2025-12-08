/**
 * Two-Factor Authentication Routes
 *
 * Provides API endpoints for 2FA setup, verification, and management.
 * Integrates with authenticator apps via TOTP and provides backup codes.
 */

const { requireAuth } = require('../middleware/auth');
const { verify2FAToken } = require('../middleware/two-factor');
const {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode
} = require('../utils/two-factor');
const logger = require('../utils/logger');

function setup2FARoutes(app, db, authLimiter) {
  /**
   * GET /api/2fa/setup
   * Initiate 2FA setup process - generates secret and QR code
   */
  app.get('/api/2fa/setup', requireAuth, async (req, res) => {
    try {
      const user = db.getUserById(req.session.user.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new 2FA secret
      const { secret, otpauthUrl } = generateSecret(user.email);

      // Generate QR code
      const qrCodeDataUrl = await generateQRCode(otpauthUrl);

      // Store secret temporarily in session (not in DB until verified)
      req.session.pendingTwoFactorSecret = secret;

      logger.logAuth('2FA setup initiated', user.id, user.email, true);

      res.json({
        success: true,
        secret: secret,
        qrCode: qrCodeDataUrl,
        message: 'Scan the QR code with your authenticator app'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA setup' });
      res.status(500).json({ error: 'Failed to initialize 2FA setup' });
    }
  });

  /**
   * POST /api/2fa/verify-setup
   * Verify 2FA token during setup and enable 2FA
   */
  app.post('/api/2fa/verify-setup', requireAuth, authLimiter, async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
      }

      const user = db.getUserById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get pending secret from session
      const secret = req.session.pendingTwoFactorSecret;
      if (!secret) {
        return res.status(400).json({ error: 'No pending 2FA setup found. Please start setup again.' });
      }

      // Verify the token
      const isValid = verifyToken(token, secret);
      if (!isValid) {
        logger.logAuth('2FA setup verification failed', user.id, user.email, false);
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = hashBackupCodes(backupCodes);

      // Save 2FA secret and backup codes to user
      db.updateUser(user.id, {
        twoFactorSecret: secret,
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedBackupCodes
      });

      // Update session
      req.session.user.twoFactorEnabled = true;
      req.session.user.twoFactorSecret = secret;
      req.session.twoFactorVerified = true;

      // Clear pending secret
      delete req.session.pendingTwoFactorSecret;

      logger.logAuth('2FA enabled', user.id, user.email, true);

      res.json({
        success: true,
        backupCodes: backupCodes,
        message: '2FA enabled successfully. Save your backup codes in a secure location.'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA verify setup' });
      res.status(500).json({ error: 'Failed to verify 2FA setup' });
    }
  });

  /**
   * POST /api/2fa/verify
   * Verify 2FA token during login
   */
  app.post('/api/2fa/verify', requireAuth, authLimiter, verify2FAToken, async (req, res) => {
    try {
      const { twoFactorToken, useBackupCode } = req.body;

      const user = db.getUserById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ error: '2FA not enabled for this account' });
      }

      let isValid = false;

      if (useBackupCode) {
        // Verify backup code
        const backupCodes = user.twoFactorBackupCodes || [];
        const result = verifyBackupCode(twoFactorToken, backupCodes);

        if (result.valid) {
          // Remove used backup code
          backupCodes.splice(result.index, 1);
          db.updateUser(user.id, { twoFactorBackupCodes: backupCodes });

          logger.logAuth('2FA verified with backup code', user.id, user.email, true, {
            remainingBackupCodes: backupCodes.length
          });

          isValid = true;
        }
      } else {
        // Verify TOTP token
        isValid = verifyToken(twoFactorToken, user.twoFactorSecret);

        if (isValid) {
          logger.logAuth('2FA verified', user.id, user.email, true);
        }
      }

      if (!isValid) {
        logger.logAuth('2FA verification failed', user.id, user.email, false);
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Mark 2FA as verified in session
      req.session.twoFactorVerified = true;
      req.session.twoFactorVerifiedAt = Date.now();

      res.json({
        success: true,
        message: '2FA verification successful'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA verify' });
      res.status(500).json({ error: 'Failed to verify 2FA' });
    }
  });

  /**
   * POST /api/2fa/disable
   * Disable 2FA for the user
   */
  app.post('/api/2fa/disable', requireAuth, authLimiter, async (req, res) => {
    try {
      const { password, token } = req.body;

      if (!password || !token) {
        return res.status(400).json({ error: 'Password and verification token required' });
      }

      const user = db.getUserById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify password
      const bcrypt = require('bcryptjs');
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Verify current 2FA token
      const isValid = verifyToken(token, user.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Prevent admins from disabling 2FA (optional security policy)
      if (user.role === 'admin') {
        return res.status(403).json({
          error: '2FA cannot be disabled for administrator accounts',
          message: 'Contact system administrator if you need to disable 2FA'
        });
      }

      // Disable 2FA
      db.updateUser(user.id, {
        twoFactorSecret: null,
        twoFactorEnabled: false,
        twoFactorBackupCodes: []
      });

      // Update session
      req.session.user.twoFactorEnabled = false;
      delete req.session.user.twoFactorSecret;
      delete req.session.twoFactorVerified;

      logger.logAuth('2FA disabled', user.id, user.email, true);

      res.json({
        success: true,
        message: '2FA has been disabled'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA disable' });
      res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  });

  /**
   * POST /api/2fa/regenerate-backup-codes
   * Generate new backup codes (invalidates old ones)
   */
  app.post('/api/2fa/regenerate-backup-codes', requireAuth, authLimiter, async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Verification token required' });
      }

      const user = db.getUserById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({ error: '2FA not enabled' });
      }

      // Verify token
      const isValid = verifyToken(token, user.twoFactorSecret);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid verification code' });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes(10);
      const hashedBackupCodes = hashBackupCodes(backupCodes);

      // Update user
      db.updateUser(user.id, { twoFactorBackupCodes: hashedBackupCodes });

      logger.logAuth('2FA backup codes regenerated', user.id, user.email, true);

      res.json({
        success: true,
        backupCodes: backupCodes,
        message: 'New backup codes generated. Save them in a secure location.'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA regenerate backup codes' });
      res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
  });

  /**
   * GET /api/2fa/status
   * Check 2FA status for current user
   */
  app.get('/api/2fa/status', requireAuth, (req, res) => {
    try {
      const user = db.getUserById(req.session.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        enabled: user.twoFactorEnabled === true,
        required: user.role === 'admin', // Admins require 2FA
        verified: req.session.twoFactorVerified === true,
        backupCodesRemaining: user.twoFactorBackupCodes ? user.twoFactorBackupCodes.length : 0
      });
    } catch (error) {
      logger.logApiError(error, req, { context: '2FA status' });
      res.status(500).json({ error: 'Failed to get 2FA status' });
    }
  });
}

module.exports = { setup2FARoutes };

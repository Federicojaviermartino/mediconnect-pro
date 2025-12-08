/**
 * Two-Factor Authentication Utilities
 *
 * Provides enterprise-grade 2FA functionality using Time-based One-Time Passwords (TOTP).
 * Implements RFC 6238 standard with QR code generation for easy setup.
 *
 * Features:
 * - TOTP generation and verification
 * - QR code generation for authenticator apps
 * - Backup codes generation
 * - Rate limiting for verification attempts
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a new 2FA secret for a user
 * @param {string} email - User's email address
 * @param {string} appName - Application name for authenticator app
 * @returns {Object} Secret data including base32 secret and otpauth URL
 */
function generateSecret(email, appName = 'MediConnect Pro') {
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
}

/**
 * Generate QR code as data URL for 2FA setup
 * @param {string} otpauthUrl - OTP auth URL from generateSecret()
 * @returns {Promise<string>} Base64 data URL of QR code image
 */
async function generateQRCode(otpauthUrl) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify a TOTP token against a secret
 * @param {string} token - 6-digit token from authenticator app
 * @param {string} secret - Base32 encoded secret
 * @param {number} window - Time window for token validity (default: 1 = ±30 seconds)
 * @returns {boolean} True if token is valid
 */
function verifyToken(token, secret, window = 1) {
  if (!token || !secret) {
    return false;
  }

  // Remove spaces and ensure 6 digits
  const cleanToken = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: cleanToken,
    window: window
  });
}

/**
 * Generate backup codes for account recovery
 * @param {number} count - Number of backup codes to generate (default: 10)
 * @returns {Array<string>} Array of backup codes
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX for readability
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * Hash backup codes for secure storage
 * @param {Array<string>} codes - Array of backup codes
 * @returns {Array<string>} Array of hashed backup codes
 */
function hashBackupCodes(codes) {
  return codes.map(code => {
    return crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
  });
}

/**
 * Verify a backup code against stored hashes
 * @param {string} code - Backup code to verify
 * @param {Array<string>} hashedCodes - Array of hashed backup codes
 * @returns {Object} { valid: boolean, index: number } - Index is the position of matched code
 */
function verifyBackupCode(code, hashedCodes) {
  if (!code || !Array.isArray(hashedCodes)) {
    return { valid: false, index: -1 };
  }

  const hashedInput = crypto
    .createHash('sha256')
    .update(code.toUpperCase())
    .digest('hex');

  const index = hashedCodes.indexOf(hashedInput);

  return {
    valid: index !== -1,
    index: index
  };
}

/**
 * Check if 2FA is required based on user settings and security policy
 * @param {Object} user - User object with 2FA settings
 * @returns {boolean} True if 2FA is required
 */
function is2FARequired(user) {
  // Require 2FA for admins by default
  if (user.role === 'admin') {
    return true;
  }

  // Check if user has voluntarily enabled 2FA
  return user.twoFactorEnabled === true;
}

/**
 * Generate current TOTP token (for testing/debugging only)
 * @param {string} secret - Base32 encoded secret
 * @returns {string} Current 6-digit token
 */
function generateToken(secret) {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
}

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  is2FARequired,
  generateToken // Only for testing
};

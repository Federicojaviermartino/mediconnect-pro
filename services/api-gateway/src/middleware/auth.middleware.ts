/**
 * Authentication Middleware
 * Verifies JWT tokens and implements role-based access control (RBAC)
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';
import { AuthenticationError, AuthorizationError } from './error.middleware';
import { logger, logSecurityEvent } from '../config/logger';
import type { IJwtPayload, UserRole } from '@mediconnect/types';

/**
 * Extend Express Request to include user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
      requestId?: string;
    }
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verify JWT Token
 */
function verifyToken(token: string): IJwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as IJwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token');
    } else {
      throw new AuthenticationError('Token verification failed');
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = decoded;

    // Log successful authentication (in development only)
    if (config.env === 'development') {
      logger.debug('User authenticated', {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    }

    next();
  } catch (error) {
    // Log failed authentication attempt
    logSecurityEvent(
      'failed_authentication',
      undefined,
      req.ip,
      {
        url: req.url,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    next(error);
  }
}

/**
 * Optional Authentication Middleware
 * Verifies token if present, but doesn't fail if missing
 * Useful for endpoints that have different behavior for authenticated users
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Don't fail on optional auth, just proceed without user
    logger.debug('Optional authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specific user roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 *
 * Usage: authorize(['admin', 'doctor'])
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        logSecurityEvent(
          'unauthorized_access_attempt',
          req.user.userId,
          req.ip,
          {
            url: req.url,
            method: req.method,
            userRole,
            requiredRoles: allowedRoles,
          }
        );

        throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if user has specific permission
 * More granular than role-based checking
 *
 * @param permission - Permission string to check
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      // This is a simplified implementation
      // In a real app, you'd fetch user permissions from database
      // For now, we'll do basic role-based permission mapping

      const rolePermissions: Record<string, string[]> = {
        admin: ['*'], // Admin has all permissions
        doctor: [
          'read:patients',
          'write:patients',
          'read:consultations',
          'write:consultations',
          'read:vitals',
          'write:prescriptions',
        ],
        nurse: [
          'read:patients',
          'read:consultations',
          'read:vitals',
          'write:vitals',
        ],
        patient: [
          'read:own_data',
          'write:own_data',
          'read:consultations',
        ],
      };

      const userPermissions = rolePermissions[req.user.role] || [];

      // Check for wildcard permission (admin)
      if (userPermissions.includes('*')) {
        return next();
      }

      if (!userPermissions.includes(permission)) {
        throw new AuthorizationError(`Permission denied: ${permission}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Self-Access Middleware
 * Ensures users can only access their own data
 * Admins and doctors can bypass this restriction
 *
 * @param userIdParam - Name of the URL parameter containing the user ID (default: 'userId')
 */
export function requireSelfOrAdmin(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const targetUserId = req.params[userIdParam];
      const currentUserId = req.user.userId;
      const userRole = req.user.role;

      // Admin and doctors can access any user's data
      if (userRole === 'admin' || userRole === 'doctor') {
        return next();
      }

      // Users can only access their own data
      if (targetUserId !== currentUserId) {
        throw new AuthorizationError('You can only access your own data');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Refresh Token Verification
 * Used for token refresh endpoint
 */
export function verifyRefreshToken(token: string): IJwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }) as IJwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    } else {
      throw new AuthenticationError('Refresh token verification failed');
    }
  }
}

/**
 * Generate JWT Access Token
 */
export function generateAccessToken(payload: Omit<IJwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

/**
 * Generate JWT Refresh Token
 */
export function generateRefreshToken(payload: Omit<IJwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

/**
 * API Key Authentication (for external integrations)
 * Alternative to JWT for server-to-server communication
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AuthenticationError('API key required');
    }

    // In a real application, validate API key against database
    // For now, this is a placeholder
    // TODO: Implement API key validation

    logger.warn('API key authentication not fully implemented');

    next();
  } catch (error) {
    next(error);
  }
}

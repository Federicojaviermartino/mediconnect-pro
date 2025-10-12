/**
 * Error Handling Middleware
 * Centralized error handling for the API Gateway
 */

import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger, logError } from '../config/logger';
import { isDevelopment } from '../config';
import type { IApiResponse, IApiError } from '@mediconnect/types';

/**
 * Custom Application Error Class
 * Extends Error with additional properties for HTTP responses
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_SERVER_ERROR',
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, StatusCodes.BAD_REQUEST, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, StatusCodes.UNAUTHORIZED, 'AUTHENTICATION_ERROR', true);
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, StatusCodes.FORBIDDEN, 'AUTHORIZATION_ERROR', true);
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, StatusCodes.NOT_FOUND, 'NOT_FOUND', true);
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, StatusCodes.CONFLICT, 'CONFLICT', true);
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, StatusCodes.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED', true);
  }
}

/**
 * Error Response Builder
 * Creates standardized error response
 */
function createErrorResponse(error: AppError, requestId?: string): IApiResponse {
  const errorResponse: IApiError = {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    timestamp: new Date(),
  };

  // Include details if available
  if (error.details) {
    errorResponse.details = error.details;
  }

  // Include stack trace only in development
  if (isDevelopment() && error.stack) {
    errorResponse.stack = error.stack;
  }

  return {
    success: false,
    error: errorResponse,
    timestamp: new Date(),
    requestId,
  };
}

/**
 * Global Error Handler Middleware
 * Catches all errors and sends appropriate response
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logError(err, 'ErrorMiddleware');

  // Determine if it's an operational error
  const isOperational = err instanceof AppError && err.isOperational;

  // If it's not an operational error, it's a programming error
  if (!isOperational) {
    logger.error('Non-operational error occurred:', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Convert to AppError if it's a generic Error
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    // Handle specific error types
    if (err.name === 'ValidationError') {
      appError = new ValidationError(err.message);
    } else if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
      appError = new AuthenticationError('Invalid or expired token');
    } else if (err.name === 'CastError') {
      appError = new ValidationError('Invalid data format');
    } else {
      // Generic internal server error
      appError = new AppError(
        isDevelopment() ? err.message : 'An unexpected error occurred',
        StatusCodes.INTERNAL_SERVER_ERROR,
        'INTERNAL_SERVER_ERROR',
        false
      );
    }
  }

  // Get request ID if available
  const requestId = req.headers['x-request-id'] as string | undefined;

  // Send error response
  const errorResponse = createErrorResponse(appError, requestId);

  res.status(appError.statusCode).json(errorResponse);
}

/**
 * 404 Not Found Handler
 * Handles routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response): void {
  const error = new NotFoundError('Route');

  const errorResponse = createErrorResponse(
    error,
    req.headers['x-request-id'] as string | undefined
  );

  res.status(StatusCodes.NOT_FOUND).json(errorResponse);
}

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 * Usage: asyncHandler(async (req, res) => { ... })
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Process Unhandled Rejections
 */
export function handleUnhandledRejection(): void {
  process.on('unhandledRejection', (reason: Error | any) => {
    logger.error('Unhandled Promise Rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
    });

    // In production, you might want to gracefully shutdown
    if (!isDevelopment()) {
      process.exit(1);
    }
  });
}

/**
 * Process Uncaught Exceptions
 */
export function handleUncaughtException(): void {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack,
    });

    // Always exit on uncaught exceptions
    process.exit(1);
  });
}

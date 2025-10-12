/**
 * Validation Middleware
 * Validates request data using express-validator
 */

import type { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

import { ValidationError } from './error.middleware';

/**
 * Validation Result Handler
 * Checks validation results and throws error if validation fails
 */
export function handleValidationErrors(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((error) => ({
      field: 'field' in error ? error.field : 'unknown',
      message: error.msg,
      value: 'value' in error ? error.value : undefined,
    }));

    throw new ValidationError('Validation failed', { errors: errorDetails });
  }

  next();
}

/**
 * Create validation middleware from validation chains
 * Combines validation chains with error handling
 *
 * Usage:
 * router.post('/login', validate([
 *   body('email').isEmail(),
 *   body('password').isLength({ min: 6 })
 * ]), loginController);
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations sequentially
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) {
        break;
      }
    }

    // Check for errors
    handleValidationErrors(req, res, next);
  };
}

/**
 * Sanitize input middleware
 * Removes potentially dangerous characters
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  // Sanitize string fields in body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Remove potential XSS vectors
        sanitized[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .trim();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(req: Request, _res: Response, next: NextFunction): void {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  // Validate page number
  if (page < 1) {
    throw new ValidationError('Page number must be greater than 0');
  }

  // Validate limit
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  // Attach validated values to request
  req.query.page = page.toString();
  req.query.limit = limit.toString();

  next();
}

/**
 * Validate UUID parameter
 */
export function validateUuidParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!value || !uuidRegex.test(value)) {
      throw new ValidationError(`Invalid ${paramName} format`);
    }

    next();
  };
}

/**
 * Validate date range
 */
export function validateDateRange(req: Request, _res: Response, next: NextFunction): void {
  const { startDate, endDate } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid date format');
    }

    if (start > end) {
      throw new ValidationError('Start date must be before end date');
    }

    // Max range: 1 year
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      throw new ValidationError('Date range cannot exceed 1 year');
    }
  }

  next();
}

/**
 * Validate file upload
 */
export function validateFileUpload(options: {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  required?: boolean;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const file = req.file;

    if (!file) {
      if (options.required) {
        throw new ValidationError('File is required');
      }
      return next();
    }

    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${options.maxSize} bytes`
      );
    }

    // Check MIME type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `File type not allowed. Allowed types: ${options.allowedMimeTypes.join(', ')}`
      );
    }

    next();
  };
}

/**
 * Validate JSON body
 */
export function validateJsonBody(req: Request, _res: Response, next: NextFunction): void {
  const contentType = req.headers['content-type'];

  if (!contentType || !contentType.includes('application/json')) {
    throw new ValidationError('Content-Type must be application/json');
  }

  if (!req.body || typeof req.body !== 'object') {
    throw new ValidationError('Request body must be a valid JSON object');
  }

  next();
}

export default {
  handleValidationErrors,
  validate,
  sanitizeInput,
  validatePagination,
  validateUuidParam,
  validateDateRange,
  validateFileUpload,
  validateJsonBody,
};

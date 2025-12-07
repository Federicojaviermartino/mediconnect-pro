/**
 * API Response Utilities
 * Standardizes API responses across all endpoints
 */

/**
 * Success response format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200, meta = null) {
  const response = {
    success: true,
    message,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  response.timestamp = new Date().toISOString();

  return res.status(statusCode).json(response);
}

/**
 * Error response format
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} errors - Validation errors or additional error details
 */
function sendError(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const response = {
    success: false,
    error: {
      message,
      code: getErrorCode(statusCode)
    }
  };

  if (errors) {
    response.error.details = errors;
  }

  response.timestamp = new Date().toISOString();

  return res.status(statusCode).json(response);
}

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */
function sendCreated(res, data, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
function sendNoContent(res) {
  return res.status(204).send();
}

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
function sendBadRequest(res, message = 'Bad request', errors = null) {
  return sendError(res, message, 400, errors);
}

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, message, 401);
}

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, message, 403);
}

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendNotFound(res, message = 'Resource not found') {
  return sendError(res, message, 404);
}

/**
 * Conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendConflict(res, message = 'Resource conflict') {
  return sendError(res, message, 409);
}

/**
 * Unprocessable entity response (422)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 */
function sendUnprocessableEntity(res, message = 'Validation failed', errors = null) {
  return sendError(res, message, 422, errors);
}

/**
 * Too many requests response (429)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendTooManyRequests(res, message = 'Too many requests') {
  return sendError(res, message, 429);
}

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendInternalError(res, message = 'Internal server error') {
  return sendError(res, message, 500);
}

/**
 * Service unavailable response (503)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendServiceUnavailable(res, message = 'Service temporarily unavailable') {
  return sendError(res, message, 503);
}

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info {page, limit, total, pages}
 * @param {string} message - Success message
 */
function sendPaginated(res, data, pagination, message = 'Success') {
  const meta = {
    pagination: {
      currentPage: pagination.page,
      itemsPerPage: pagination.limit,
      totalItems: pagination.total,
      totalPages: pagination.pages,
      hasNextPage: pagination.page < pagination.pages,
      hasPreviousPage: pagination.page > 1
    }
  };

  return sendSuccess(res, data, message, 200, meta);
}

/**
 * Get error code from HTTP status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Error code
 */
function getErrorCode(statusCode) {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    503: 'SERVICE_UNAVAILABLE'
  };

  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Express middleware to add response helpers to res object
 */
function apiResponseMiddleware(req, res, next) {
  res.sendSuccess = (data, message, meta) => sendSuccess(res, data, message, 200, meta);
  res.sendCreated = (data, message) => sendCreated(res, data, message);
  res.sendNoContent = () => sendNoContent(res);
  res.sendBadRequest = (message, errors) => sendBadRequest(res, message, errors);
  res.sendUnauthorized = (message) => sendUnauthorized(res, message);
  res.sendForbidden = (message) => sendForbidden(res, message);
  res.sendNotFound = (message) => sendNotFound(res, message);
  res.sendConflict = (message) => sendConflict(res, message);
  res.sendUnprocessableEntity = (message, errors) => sendUnprocessableEntity(res, message, errors);
  res.sendTooManyRequests = (message) => sendTooManyRequests(res, message);
  res.sendInternalError = (message) => sendInternalError(res, message);
  res.sendServiceUnavailable = (message) => sendServiceUnavailable(res, message);
  res.sendPaginated = (data, pagination, message) => sendPaginated(res, data, pagination, message);

  next();
}

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendUnprocessableEntity,
  sendTooManyRequests,
  sendInternalError,
  sendServiceUnavailable,
  sendPaginated,
  apiResponseMiddleware
};

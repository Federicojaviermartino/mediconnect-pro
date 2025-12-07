const {
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
} = require('../utils/api-response');

describe('API Response Utilities', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    test('should send success response with default values', () => {
      const data = { id: 1, name: 'Test' };
      sendSuccess(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success',
          data: { id: 1, name: 'Test' },
          timestamp: expect.any(String)
        })
      );
    });

    test('should send success response with custom message', () => {
      const data = { user: 'John' };
      sendSuccess(res, data, 'User retrieved successfully');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User retrieved successfully',
          data: { user: 'John' }
        })
      );
    });

    test('should send success response with custom status code', () => {
      sendSuccess(res, {}, 'Success', 202);
      expect(res.status).toHaveBeenCalledWith(202);
    });

    test('should include meta when provided', () => {
      const meta = { total: 100, page: 1 };
      sendSuccess(res, [], 'Success', 200, meta);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          meta: { total: 100, page: 1 }
        })
      );
    });

    test('should not include meta when null', () => {
      sendSuccess(res, [], 'Success', 200, null);

      const call = res.json.mock.calls[0][0];
      expect(call).not.toHaveProperty('meta');
    });

    test('should include ISO timestamp', () => {
      sendSuccess(res, {});
      const call = res.json.mock.calls[0][0];

      expect(call.timestamp).toBeDefined();
      expect(new Date(call.timestamp).toISOString()).toBe(call.timestamp);
    });
  });

  describe('sendError', () => {
    test('should send error response with default values', () => {
      sendError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            message: 'An error occurred',
            code: 'INTERNAL_ERROR'
          },
          timestamp: expect.any(String)
        })
      );
    });

    test('should send error response with custom message', () => {
      sendError(res, 'Database connection failed');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        })
      );
    });

    test('should send error with custom status code', () => {
      sendError(res, 'Not found', 404);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'NOT_FOUND'
          })
        })
      );
    });

    test('should include error details when provided', () => {
      const errors = [{ field: 'email', message: 'Invalid email' }];
      sendError(res, 'Validation failed', 400, errors);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: errors
          })
        })
      );
    });

    test('should not include error details when null', () => {
      sendError(res, 'Error', 500, null);

      const call = res.json.mock.calls[0][0];
      expect(call.error).not.toHaveProperty('details');
    });
  });

  describe('sendCreated', () => {
    test('should send 201 created response', () => {
      const data = { id: 1, name: 'New Resource' };
      sendCreated(res, data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Resource created successfully',
          data
        })
      );
    });

    test('should send 201 with custom message', () => {
      sendCreated(res, {}, 'User created successfully');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User created successfully'
        })
      );
    });
  });

  describe('sendNoContent', () => {
    test('should send 204 no content response', () => {
      sendNoContent(res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });
  });

  describe('sendBadRequest', () => {
    test('should send 400 bad request', () => {
      sendBadRequest(res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Bad request',
            code: 'BAD_REQUEST'
          })
        })
      );
    });

    test('should send 400 with custom message', () => {
      sendBadRequest(res, 'Invalid input');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid input'
          })
        })
      );
    });

    test('should send 400 with validation errors', () => {
      const errors = [{ field: 'name', message: 'Required' }];
      sendBadRequest(res, 'Validation failed', errors);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: errors
          })
        })
      );
    });
  });

  describe('sendUnauthorized', () => {
    test('should send 401 unauthorized', () => {
      sendUnauthorized(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Unauthorized',
            code: 'UNAUTHORIZED'
          })
        })
      );
    });

    test('should send 401 with custom message', () => {
      sendUnauthorized(res, 'Invalid token');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid token'
          })
        })
      );
    });
  });

  describe('sendForbidden', () => {
    test('should send 403 forbidden', () => {
      sendForbidden(res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Forbidden',
            code: 'FORBIDDEN'
          })
        })
      );
    });

    test('should send 403 with custom message', () => {
      sendForbidden(res, 'Access denied');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Access denied'
          })
        })
      );
    });
  });

  describe('sendNotFound', () => {
    test('should send 404 not found', () => {
      sendNotFound(res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Resource not found',
            code: 'NOT_FOUND'
          })
        })
      );
    });

    test('should send 404 with custom message', () => {
      sendNotFound(res, 'User not found');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'User not found'
          })
        })
      );
    });
  });

  describe('sendConflict', () => {
    test('should send 409 conflict', () => {
      sendConflict(res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Resource conflict',
            code: 'CONFLICT'
          })
        })
      );
    });

    test('should send 409 with custom message', () => {
      sendConflict(res, 'Email already exists');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Email already exists'
          })
        })
      );
    });
  });

  describe('sendUnprocessableEntity', () => {
    test('should send 422 unprocessable entity', () => {
      sendUnprocessableEntity(res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    test('should send 422 with custom message and errors', () => {
      const errors = [{ field: 'age', message: 'Must be positive' }];
      sendUnprocessableEntity(res, 'Invalid data', errors);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Invalid data',
            details: errors
          })
        })
      );
    });
  });

  describe('sendTooManyRequests', () => {
    test('should send 429 too many requests', () => {
      sendTooManyRequests(res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED'
          })
        })
      );
    });

    test('should send 429 with custom message', () => {
      sendTooManyRequests(res, 'Rate limit exceeded. Try again later.');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Rate limit exceeded. Try again later.'
          })
        })
      );
    });
  });

  describe('sendInternalError', () => {
    test('should send 500 internal server error', () => {
      sendInternalError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
          })
        })
      );
    });

    test('should send 500 with custom message', () => {
      sendInternalError(res, 'Database error');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database error'
          })
        })
      );
    });
  });

  describe('sendServiceUnavailable', () => {
    test('should send 503 service unavailable', () => {
      sendServiceUnavailable(res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE'
          })
        })
      );
    });

    test('should send 503 with custom message', () => {
      sendServiceUnavailable(res, 'Maintenance in progress');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Maintenance in progress'
          })
        })
      );
    });
  });

  describe('sendPaginated', () => {
    test('should send paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 25, pages: 3 };

      sendPaginated(res, data, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success',
          data,
          meta: {
            pagination: {
              currentPage: 1,
              itemsPerPage: 10,
              totalItems: 25,
              totalPages: 3,
              hasNextPage: true,
              hasPreviousPage: false
            }
          }
        })
      );
    });

    test('should indicate no next page on last page', () => {
      const pagination = { page: 3, limit: 10, total: 25, pages: 3 };

      sendPaginated(res, [], pagination);

      const call = res.json.mock.calls[0][0];
      expect(call.meta.pagination.hasNextPage).toBe(false);
      expect(call.meta.pagination.hasPreviousPage).toBe(true);
    });

    test('should indicate no previous page on first page', () => {
      const pagination = { page: 1, limit: 10, total: 25, pages: 3 };

      sendPaginated(res, [], pagination);

      const call = res.json.mock.calls[0][0];
      expect(call.meta.pagination.hasPreviousPage).toBe(false);
      expect(call.meta.pagination.hasNextPage).toBe(true);
    });

    test('should send paginated with custom message', () => {
      const pagination = { page: 1, limit: 10, total: 5, pages: 1 };

      sendPaginated(res, [], pagination, 'Users retrieved successfully');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Users retrieved successfully'
        })
      );
    });
  });

  describe('apiResponseMiddleware', () => {
    test('should attach all response helpers to res object', () => {
      const req = {};
      const res = {};
      const next = jest.fn();

      apiResponseMiddleware(req, res, next);

      expect(res.sendSuccess).toBeDefined();
      expect(res.sendCreated).toBeDefined();
      expect(res.sendNoContent).toBeDefined();
      expect(res.sendBadRequest).toBeDefined();
      expect(res.sendUnauthorized).toBeDefined();
      expect(res.sendForbidden).toBeDefined();
      expect(res.sendNotFound).toBeDefined();
      expect(res.sendConflict).toBeDefined();
      expect(res.sendUnprocessableEntity).toBeDefined();
      expect(res.sendTooManyRequests).toBeDefined();
      expect(res.sendInternalError).toBeDefined();
      expect(res.sendServiceUnavailable).toBeDefined();
      expect(res.sendPaginated).toBeDefined();

      expect(next).toHaveBeenCalled();
    });

    test('should make helpers callable on res object', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      apiResponseMiddleware(req, res, next);

      res.sendSuccess({ test: 'data' }, 'Test message');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      res.sendCreated({ test: 'created' }, 'Created message');
      expect(res.status).toHaveBeenCalledWith(201);

      res.sendNoContent();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});

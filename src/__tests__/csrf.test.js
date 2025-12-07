/**
 * CSRF Protection Middleware Tests
 */

const { csrfProtection, setupCsrfEndpoint, generateToken } = require('../middleware/csrf');

describe('CSRF Protection Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      session: {},
      body: {},
      headers: {},
      query: {}
    };
    mockRes = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFn = jest.fn();
  });

  describe('generateToken', () => {
    test('should generate a 64 character hex token', () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    test('should generate unique tokens', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('csrfProtection - Safe Methods (GET, HEAD, OPTIONS)', () => {
    test('should generate token for GET request if not exists', () => {
      mockReq.method = 'GET';

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockReq.session.csrfToken).toBeDefined();
      expect(mockReq.session.csrfToken).toHaveLength(64);
      expect(mockRes.locals.csrfToken).toBe(mockReq.session.csrfToken);
      expect(nextFn).toHaveBeenCalled();
    });

    test('should reuse existing token for GET request', () => {
      mockReq.method = 'GET';
      mockReq.session.csrfToken = 'existing-token-12345';

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockReq.session.csrfToken).toBe('existing-token-12345');
      expect(mockRes.locals.csrfToken).toBe('existing-token-12345');
      expect(nextFn).toHaveBeenCalled();
    });

    test('should handle HEAD request', () => {
      mockReq.method = 'HEAD';

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockReq.session.csrfToken).toBeDefined();
      expect(nextFn).toHaveBeenCalled();
    });

    test('should handle OPTIONS request', () => {
      mockReq.method = 'OPTIONS';

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockReq.session.csrfToken).toBeDefined();
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('csrfProtection - State-Changing Methods (POST, PUT, DELETE, PATCH)', () => {
    const token = 'a'.repeat(64); // Valid 64-char token

    test('should reject POST without session token', () => {
      mockReq.method = 'POST';
      mockReq.body._csrf = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'CSRF token not found in session. Please refresh the page.'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('should reject POST without request token', () => {
      mockReq.method = 'POST';
      mockReq.session.csrfToken = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'CSRF token missing from request'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('should reject POST with mismatched token', () => {
      mockReq.method = 'POST';
      mockReq.session.csrfToken = token;
      mockReq.body._csrf = 'b'.repeat(64);

      csrfProtection(mockReq, mockRes, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid CSRF token'
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    test('should accept POST with valid token in body', () => {
      mockReq.method = 'POST';
      mockReq.session.csrfToken = token;
      mockReq.body._csrf = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should accept POST with valid token in header', () => {
      mockReq.method = 'POST';
      mockReq.session.csrfToken = token;
      mockReq.headers['x-csrf-token'] = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should accept POST with valid token in query', () => {
      mockReq.method = 'POST';
      mockReq.session.csrfToken = token;
      mockReq.query._csrf = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should validate PUT request', () => {
      mockReq.method = 'PUT';
      mockReq.session.csrfToken = token;
      mockReq.body._csrf = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should validate DELETE request', () => {
      mockReq.method = 'DELETE';
      mockReq.session.csrfToken = token;
      mockReq.headers['x-csrf-token'] = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should validate PATCH request', () => {
      mockReq.method = 'PATCH';
      mockReq.session.csrfToken = token;
      mockReq.body._csrf = token;

      csrfProtection(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('setupCsrfEndpoint', () => {
    test('should register GET /api/csrf-token endpoint', () => {
      const mockApp = {
        get: jest.fn()
      };

      setupCsrfEndpoint(mockApp);

      expect(mockApp.get).toHaveBeenCalledWith('/api/csrf-token', expect.any(Function));
    });

    test('should return new token if not exists in session', () => {
      const mockApp = {
        get: jest.fn()
      };

      setupCsrfEndpoint(mockApp);

      // Get the handler function
      const handler = mockApp.get.mock.calls[0][1];

      const req = { session: {} };
      const res = { json: jest.fn() };

      handler(req, res);

      expect(req.session.csrfToken).toBeDefined();
      expect(res.json).toHaveBeenCalledWith({
        csrfToken: req.session.csrfToken
      });
    });

    test('should return existing token if already in session', () => {
      const mockApp = {
        get: jest.fn()
      };

      setupCsrfEndpoint(mockApp);

      const handler = mockApp.get.mock.calls[0][1];

      const existingToken = 'existing-token-abc';
      const req = { session: { csrfToken: existingToken } };
      const res = { json: jest.fn() };

      handler(req, res);

      expect(req.session.csrfToken).toBe(existingToken);
      expect(res.json).toHaveBeenCalledWith({
        csrfToken: existingToken
      });
    });
  });
});

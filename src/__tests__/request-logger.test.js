/**
 * Request Logger Middleware Tests
 */

const { requestLogger, errorLogger } = require('../middleware/request-logger');

// Mock the logger module
jest.mock('../utils/logger', () => ({
  debug: jest.fn(),
  logRequest: jest.fn(),
  logPerformance: jest.fn(),
  logApiError: jest.fn()
}));

const logger = require('../utils/logger');

describe('Request Logger Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;
  let originalEnd;

  beforeEach(() => {
    jest.clearAllMocks();

    originalEnd = jest.fn();

    mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
      session: {
        user: { id: 1, role: 'patient' }
      }
    };

    mockRes = {
      statusCode: 200,
      end: originalEnd
    };

    nextFn = jest.fn();
  });

  describe('requestLogger', () => {
    test('should generate unique request ID', () => {
      requestLogger(mockReq, mockRes, nextFn);

      expect(mockReq.requestId).toBeDefined();
      expect(mockReq.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    test('should log request start at debug level', () => {
      requestLogger(mockReq, mockRes, nextFn);

      expect(logger.debug).toHaveBeenCalledWith('Request started', {
        requestId: mockReq.requestId,
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        userId: 1
      });
    });

    test('should call next function', () => {
      requestLogger(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    test('should override res.end to log response', () => {
      requestLogger(mockReq, mockRes, nextFn);

      // Verify end was overridden
      expect(mockRes.end).not.toBe(originalEnd);

      // Call the overridden end
      mockRes.end('response body');

      // Should log request
      expect(logger.logRequest).toHaveBeenCalled();

      // Should call original end
      expect(originalEnd).toHaveBeenCalledWith('response body');
    });

    test('should log slow requests (>1000ms)', (done) => {
      // Mock Date.now to simulate slow request
      const realDateNow = Date.now;
      let callCount = 0;

      Date.now = jest.fn(() => {
        callCount++;
        // First call is for generateRequestId (doesn't affect duration)
        // Second call is for startTime
        // Third call is when res.end calculates duration
        if (callCount === 1) return 1000;  // generateRequestId
        if (callCount === 2) return 1000;  // startTime
        return 2500;  // res.end - duration will be 2500 - 1000 = 1500ms
      });

      requestLogger(mockReq, mockRes, nextFn);
      mockRes.end();

      // Should log performance warning for slow request
      expect(logger.logPerformance).toHaveBeenCalledWith('Slow Request', 1500, {
        requestId: mockReq.requestId,
        method: 'GET',
        url: '/api/test',
        statusCode: 200
      });

      Date.now = realDateNow;
      done();
    });

    test('should not log performance for fast requests', () => {
      requestLogger(mockReq, mockRes, nextFn);
      mockRes.end();

      // Fast request should not trigger performance log
      expect(logger.logPerformance).not.toHaveBeenCalled();
    });

    test('should handle request without session', () => {
      mockReq.session = undefined;

      requestLogger(mockReq, mockRes, nextFn);

      expect(logger.debug).toHaveBeenCalledWith('Request started', expect.objectContaining({
        userId: undefined
      }));
      expect(nextFn).toHaveBeenCalled();
    });

    test('should handle request without user in session', () => {
      mockReq.session = {};

      requestLogger(mockReq, mockRes, nextFn);

      expect(logger.debug).toHaveBeenCalledWith('Request started', expect.objectContaining({
        userId: undefined
      }));
    });

    test('should pass arguments to original end', () => {
      requestLogger(mockReq, mockRes, nextFn);

      mockRes.end('body', 'utf8');

      expect(originalEnd).toHaveBeenCalledWith('body', 'utf8');
    });
  });

  describe('errorLogger', () => {
    test('should log API error with request context', () => {
      const error = new Error('Test error');
      mockReq.requestId = 'req_123_abc';

      errorLogger(error, mockReq, mockRes, nextFn);

      expect(logger.logApiError).toHaveBeenCalledWith(error, mockReq, {
        requestId: 'req_123_abc'
      });
    });

    test('should call next with error', () => {
      const error = new Error('Test error');

      errorLogger(error, mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalledWith(error);
    });

    test('should handle missing requestId', () => {
      const error = new Error('Test error');
      mockReq.requestId = undefined;

      errorLogger(error, mockReq, mockRes, nextFn);

      expect(logger.logApiError).toHaveBeenCalledWith(error, mockReq, {
        requestId: undefined
      });
      expect(nextFn).toHaveBeenCalledWith(error);
    });
  });

  describe('Request ID uniqueness', () => {
    test('should generate unique IDs for multiple requests', () => {
      const ids = new Set();

      for (let i = 0; i < 100; i++) {
        const req = { ...mockReq };
        requestLogger(req, { ...mockRes, end: jest.fn() }, nextFn);
        ids.add(req.requestId);
      }

      expect(ids.size).toBe(100);
    });
  });
});

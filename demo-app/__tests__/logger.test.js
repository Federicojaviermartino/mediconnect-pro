const logger = require('../utils/logger');

describe('Logger', () => {
  describe('logger instance', () => {
    test('should be defined', () => {
      expect(logger).toBeDefined();
    });

    test('should have standard log methods', () => {
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.http).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    test('should have custom helper methods', () => {
      expect(typeof logger.logRequest).toBe('function');
      expect(typeof logger.logAuth).toBe('function');
      expect(typeof logger.logDatabase).toBe('function');
      expect(typeof logger.logSecurity).toBe('function');
      expect(typeof logger.logApiError).toBe('function');
      expect(typeof logger.logBusinessError).toBe('function');
      expect(typeof logger.logPerformance).toBe('function');
    });
  });

  describe('logRequest', () => {
    test('should log HTTP request without throwing', () => {
      const req = {
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        session: { user: { id: 1 } }
      };
      const res = { statusCode: 200 };

      expect(() => {
        logger.logRequest(req, res, 150);
      }).not.toThrow();
    });

    test('should handle missing session', () => {
      const req = {
        method: 'GET',
        url: '/api/public',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('curl'),
        session: null
      };
      const res = { statusCode: 200 };

      expect(() => {
        logger.logRequest(req, res, 50);
      }).not.toThrow();
    });
  });

  describe('logAuth', () => {
    test('should log successful auth events', () => {
      expect(() => {
        logger.logAuth('login', 1, 'user@test.com', true);
      }).not.toThrow();
    });

    test('should log failed auth events', () => {
      expect(() => {
        logger.logAuth('login', null, 'user@test.com', false, { reason: 'Invalid password' });
      }).not.toThrow();
    });
  });

  describe('logDatabase', () => {
    test('should log successful database operations', () => {
      expect(() => {
        logger.logDatabase('SELECT', 'users', true, { count: 10 });
      }).not.toThrow();
    });

    test('should log failed database operations', () => {
      expect(() => {
        logger.logDatabase('INSERT', 'users', false, { error: 'Duplicate key' });
      }).not.toThrow();
    });
  });

  describe('logSecurity', () => {
    test('should log high severity security events', () => {
      expect(() => {
        logger.logSecurity('SQL Injection attempt', 'high', { ip: '192.168.1.1' });
      }).not.toThrow();
    });

    test('should log medium severity security events', () => {
      expect(() => {
        logger.logSecurity('Rate limit exceeded', 'medium', { userId: 1 });
      }).not.toThrow();
    });
  });

  describe('logApiError', () => {
    test('should log API errors with full context', () => {
      const error = new Error('Test error');
      const req = {
        method: 'POST',
        url: '/api/users',
        session: { user: { id: 1 } },
        body: { name: 'Test' },
        params: { id: 1 },
        query: {}
      };

      expect(() => {
        logger.logApiError(error, req);
      }).not.toThrow();
    });

    test('should handle missing session', () => {
      const error = new Error('Unauthorized');
      const req = {
        method: 'GET',
        url: '/api/protected',
        session: null,
        body: {},
        params: {},
        query: {}
      };

      expect(() => {
        logger.logApiError(error, req);
      }).not.toThrow();
    });
  });

  describe('logBusinessError', () => {
    test('should log business errors', () => {
      const error = new Error('Insufficient funds');

      expect(() => {
        logger.logBusinessError('Payment processing', error, { amount: 100 });
      }).not.toThrow();
    });
  });

  describe('logPerformance', () => {
    test('should log fast operations at debug level', () => {
      expect(() => {
        logger.logPerformance('Database query', 50, { query: 'SELECT *' });
      }).not.toThrow();
    });

    test('should log slow operations at warn level', () => {
      expect(() => {
        logger.logPerformance('External API call', 1500, { endpoint: '/api/external' });
      }).not.toThrow();
    });
  });
});

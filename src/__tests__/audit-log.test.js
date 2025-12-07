const fs = require('fs');
const path = require('path');
const {
  AuditEventTypes,
  logAuditEvent,
  auditLogMiddleware,
  getUserAuditLogs,
  getAuditLogs
} = require('../utils/audit-log');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('fs');
jest.mock('../utils/logger');

describe('Audit Log System', () => {
  const testAuditLogPath = path.join(__dirname, '../logs/audit.log');

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger methods
    logger.info = jest.fn();
    logger.error = jest.fn();

    // Mock fs methods
    fs.existsSync = jest.fn();
    fs.mkdirSync = jest.fn();
    fs.appendFileSync = jest.fn();
    fs.readFileSync = jest.fn();
  });

  describe('AuditEventTypes', () => {
    test('should export all event type constants', () => {
      expect(AuditEventTypes).toHaveProperty('LOGIN_SUCCESS');
      expect(AuditEventTypes).toHaveProperty('LOGIN_FAILURE');
      expect(AuditEventTypes).toHaveProperty('LOGOUT');
      expect(AuditEventTypes).toHaveProperty('USER_CREATE');
      expect(AuditEventTypes).toHaveProperty('APPOINTMENT_CREATE');
      expect(AuditEventTypes).toHaveProperty('PRESCRIPTION_CREATE');
      expect(AuditEventTypes).toHaveProperty('UNAUTHORIZED_ACCESS');
    });

    test('should have properly namespaced event types', () => {
      expect(AuditEventTypes.LOGIN_SUCCESS).toBe('auth.login.success');
      expect(AuditEventTypes.USER_CREATE).toBe('user.create');
      expect(AuditEventTypes.APPOINTMENT_CREATE).toBe('appointment.create');
    });
  });

  describe('logAuditEvent', () => {
    test('should log audit event with minimal data', () => {
      const result = logAuditEvent({
        eventType: AuditEventTypes.LOGIN_SUCCESS,
        action: 'User logged in'
      });

      expect(result).toMatchObject({
        timestamp: expect.any(String),
        eventType: AuditEventTypes.LOGIN_SUCCESS,
        action: 'User logged in',
        result: 'success'
      });

      expect(logger.info).toHaveBeenCalledWith('Audit event', expect.any(Object));
      expect(fs.appendFileSync).toHaveBeenCalled();
    });

    test('should log audit event with full user data', () => {
      const result = logAuditEvent({
        eventType: AuditEventTypes.USER_CREATE,
        userId: 123,
        userEmail: 'test@example.com',
        userRole: 'admin',
        action: 'Created new user',
        result: 'success',
        ipAddress: '192.168.1.1',
        metadata: { newUserId: 456 }
      });

      expect(result).toMatchObject({
        user: {
          id: 123,
          email: 'test@example.com',
          role: 'admin'
        },
        action: 'Created new user',
        ipAddress: '192.168.1.1',
        metadata: { newUserId: 456 }
      });
    });

    test('should extract user info from request object', () => {
      const req = {
        session: {
          user: {
            id: 789,
            email: 'user@example.com',
            role: 'doctor'
          }
        },
        ip: '10.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0'
        }
      };

      const result = logAuditEvent({
        eventType: AuditEventTypes.APPOINTMENT_CREATE,
        action: 'Created appointment',
        req
      });

      expect(result.user).toEqual({
        id: 789,
        email: 'user@example.com',
        role: 'doctor'
      });
      expect(result.ipAddress).toBe('10.0.0.1');
      expect(result.userAgent).toBe('Mozilla/5.0');
    });

    test('should use connection.remoteAddress if req.ip not available', () => {
      const req = {
        connection: {
          remoteAddress: '192.168.0.100'
        },
        session: { user: null }
      };

      const result = logAuditEvent({
        eventType: AuditEventTypes.LOGIN_FAILURE,
        action: 'Failed login attempt',
        req
      });

      expect(result.ipAddress).toBe('192.168.0.100');
    });

    test('should prioritize provided ipAddress over req.ip', () => {
      const req = {
        ip: '10.0.0.1'
      };

      const result = logAuditEvent({
        eventType: AuditEventTypes.LOGOUT,
        action: 'Logged out',
        req,
        ipAddress: '192.168.1.1'
      });

      expect(result.ipAddress).toBe('192.168.1.1');
    });

    test('should write to audit log file', () => {
      logAuditEvent({
        eventType: AuditEventTypes.PASSWORD_CHANGE,
        action: 'Changed password'
      });

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('audit.log'),
        expect.stringContaining('"eventType":"auth.password.change"')
      );
    });

    test('should handle write errors gracefully', () => {
      fs.appendFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = logAuditEvent({
        eventType: AuditEventTypes.USER_UPDATE,
        action: 'Updated user'
      });

      expect(result).toBeDefined();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to write to audit log file',
        expect.any(Object)
      );
    });

    test('should set default result to success', () => {
      const result = logAuditEvent({
        eventType: AuditEventTypes.VITALS_CREATE,
        action: 'Created vitals record'
      });

      expect(result.result).toBe('success');
    });

    test('should accept custom result value', () => {
      const result = logAuditEvent({
        eventType: AuditEventTypes.LOGIN_FAILURE,
        action: 'Failed login',
        result: 'failure'
      });

      expect(result.result).toBe('failure');
    });

    test('should include timestamp in ISO format', () => {
      const result = logAuditEvent({
        eventType: AuditEventTypes.DATA_EXPORT,
        action: 'Exported data'
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('auditLogMiddleware', () => {
    test('should create middleware function', () => {
      const middleware = auditLogMiddleware();
      expect(typeof middleware).toBe('function');
    });

    test('should skip excluded paths', () => {
      const middleware = auditLogMiddleware({
        excludePaths: ['/health', '/api/cache/stats']
      });

      const req = { path: '/health', method: 'POST' };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    test('should skip GET requests by default', () => {
      const middleware = auditLogMiddleware();

      const req = { path: '/api/users', method: 'GET' };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    test('should log POST requests', (done) => {
      const middleware = auditLogMiddleware();

      const req = {
        path: '/api/users',
        method: 'POST',
        body: { name: 'Test User' },
        params: {},
        query: {},
        session: { user: { id: 1, email: 'test@example.com', role: 'admin' } },
        connection: { remoteAddress: '127.0.0.1' }
      };

      const res = {
        statusCode: 200,
        json: jest.fn()
      };

      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Trigger the overridden json method
      res.json({ success: true, data: {} });

      expect(logger.info).toHaveBeenCalled();
      expect(fs.appendFileSync).toHaveBeenCalled();

      done();
    });

    test('should log PUT, PATCH, DELETE requests', () => {
      ['PUT', 'PATCH', 'DELETE'].forEach(method => {
        jest.clearAllMocks();

        const middleware = auditLogMiddleware();
        const req = {
          path: '/api/users/1',
          method,
          body: {},
          params: { id: '1' },
          query: {},
          connection: { remoteAddress: '127.0.0.1' }
        };

        const res = {
          statusCode: 200,
          json: jest.fn()
        };

        const next = jest.fn();

        middleware(req, res, next);
        res.json({ success: true });

        expect(fs.appendFileSync).toHaveBeenCalled();
      });
    });

    test('should detect failure from response body', (done) => {
      const middleware = auditLogMiddleware();

      const req = {
        path: '/api/appointments',
        method: 'POST',
        body: {},
        params: {},
        query: {},
        connection: { remoteAddress: '127.0.0.1' }
      };

      const res = {
        statusCode: 400,
        json: jest.fn()
      };

      const next = jest.fn();

      middleware(req, res, next);
      res.json({ success: false, error: 'Validation failed' });

      const auditCall = logger.info.mock.calls[0];
      expect(auditCall[1].audit.result).toBe('failure');

      done();
    });

    test('should sanitize sensitive fields in request body', (done) => {
      const middleware = auditLogMiddleware();

      const req = {
        path: '/api/auth/login',
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'secret123',
          apiKey: 'abc123',
          token: 'xyz789'
        },
        params: {},
        query: {},
        connection: { remoteAddress: '127.0.0.1' }
      };

      const res = {
        statusCode: 200,
        json: jest.fn()
      };

      const next = jest.fn();

      middleware(req, res, next);
      res.json({ success: true });

      const auditCall = logger.info.mock.calls[0];
      const metadata = auditCall[1].audit.metadata;

      expect(metadata.body.password).toBe('***REDACTED***');
      expect(metadata.body.apiKey).toBe('***REDACTED***');
      expect(metadata.body.token).toBe('***REDACTED***');
      expect(metadata.body.email).toBe('user@example.com');

      done();
    });

    test('should handle custom methods filter', () => {
      const middleware = auditLogMiddleware({
        methods: ['GET', 'POST']
      });

      const reqGet = { path: '/api/data', method: 'GET' };
      const resGet = { json: jest.fn() };
      const next = jest.fn();

      middleware(reqGet, resGet, next);

      expect(next).toHaveBeenCalled();
      // GET should not be skipped with custom methods filter
    });

    test('should call original json method with same arguments', (done) => {
      const middleware = auditLogMiddleware();

      const originalJson = jest.fn();
      const req = {
        path: '/api/test',
        method: 'POST',
        body: {},
        params: {},
        query: {},
        connection: { remoteAddress: '127.0.0.1' }
      };

      const res = {
        statusCode: 200,
        json: originalJson
      };

      const next = jest.fn();

      middleware(req, res, next);

      const responseBody = { success: true, data: { id: 1 } };
      res.json(responseBody);

      expect(originalJson).toHaveBeenCalledWith(responseBody);

      done();
    });
  });

  describe('getUserAuditLogs', () => {
    test('should return empty array if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const logs = getUserAuditLogs(123);

      expect(logs).toEqual([]);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('should read and parse audit logs for specific user', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, eventType: 'login', action: 'Login', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456 }, eventType: 'logout', action: 'Logout', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', user: { id: 123 }, eventType: 'update', action: 'Update', result: 'success' })
      );

      const logs = getUserAuditLogs(123);

      expect(logs).toHaveLength(2);
      expect(logs[0].user.id).toBe(123);
      expect(logs[1].user.id).toBe(123);
    });

    test('should sort logs by timestamp descending', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, action: 'First' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', user: { id: 123 }, action: 'Third' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 123 }, action: 'Second' })
      );

      const logs = getUserAuditLogs(123);

      expect(logs[0].action).toBe('Third');
      expect(logs[1].action).toBe('Second');
      expect(logs[2].action).toBe('First');
    });

    test('should limit number of results', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, action: '1' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 123 }, action: '2' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', user: { id: 123 }, action: '3' })
      );

      const logs = getUserAuditLogs(123, { limit: 2 });

      expect(logs).toHaveLength(2);
    });

    test('should filter by start date', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, action: 'Old' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-05T10:00:00Z', user: { id: 123 }, action: 'New' })
      );

      const logs = getUserAuditLogs(123, { startDate: new Date('2025-01-03') });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('New');
    });

    test('should filter by end date', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, action: 'Old' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-10T10:00:00Z', user: { id: 123 }, action: 'New' })
      );

      const logs = getUserAuditLogs(123, { endDate: new Date('2025-01-05') });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('Old');
    });

    test('should ignore invalid JSON lines', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        'invalid json\n' +
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, action: 'Valid' }) + '\n' +
        'another invalid line'
      );

      const logs = getUserAuditLogs(123);

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('Valid');
    });

    test('should handle read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const logs = getUserAuditLogs(123);

      expect(logs).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to read audit logs',
        expect.any(Object)
      );
    });
  });

  describe('getAuditLogs', () => {
    test('should return empty array if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const logs = getAuditLogs();

      expect(logs).toEqual([]);
    });

    test('should return all logs without filters', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123, role: 'admin' }, eventType: 'login', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456, role: 'doctor' }, eventType: 'logout', result: 'success' })
      );

      const logs = getAuditLogs();

      expect(logs).toHaveLength(2);
    });

    test('should filter by eventType', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, eventType: 'auth.login.success', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456 }, eventType: 'auth.logout', result: 'success' })
      );

      const logs = getAuditLogs({ eventType: 'auth.login.success' });

      expect(logs).toHaveLength(1);
      expect(logs[0].eventType).toBe('auth.login.success');
    });

    test('should filter by userRole', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123, role: 'admin' }, eventType: 'login', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456, role: 'doctor' }, eventType: 'logout', result: 'success' })
      );

      const logs = getAuditLogs({ userRole: 'admin' });

      expect(logs).toHaveLength(1);
      expect(logs[0].user.role).toBe('admin');
    });

    test('should filter by result', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, eventType: 'login', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456 }, eventType: 'login', result: 'failure' })
      );

      const logs = getAuditLogs({ result: 'failure' });

      expect(logs).toHaveLength(1);
      expect(logs[0].result).toBe('failure');
    });

    test('should filter by multiple criteria', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123, role: 'admin' }, eventType: 'login', result: 'success' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 456, role: 'admin' }, eventType: 'login', result: 'failure' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', user: { id: 789, role: 'doctor' }, eventType: 'login', result: 'success' })
      );

      const logs = getAuditLogs({ userRole: 'admin', result: 'success' });

      expect(logs).toHaveLength(1);
      expect(logs[0].user.id).toBe(123);
    });

    test('should handle read errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const logs = getAuditLogs();

      expect(logs).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should apply date range filters', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 123 }, eventType: 'login' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-05T10:00:00Z', user: { id: 456 }, eventType: 'logout' }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-10T10:00:00Z', user: { id: 789 }, eventType: 'update' })
      );

      const logs = getAuditLogs({
        startDate: new Date('2025-01-03'),
        endDate: new Date('2025-01-08')
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].user.id).toBe(456);
    });

    test('should respect limit parameter', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({ timestamp: '2025-01-01T10:00:00Z', user: { id: 1 } }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T11:00:00Z', user: { id: 2 } }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T12:00:00Z', user: { id: 3 } }) + '\n' +
        JSON.stringify({ timestamp: '2025-01-01T13:00:00Z', user: { id: 4 } })
      );

      const logs = getAuditLogs({ limit: 2 });

      expect(logs).toHaveLength(2);
    });
  });
});

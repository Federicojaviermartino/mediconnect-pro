const {
  performHealthCheck,
  livenessProbe,
  readinessProbe,
  HealthStatus,
  ComponentStatus
} = require('../utils/health-check');

describe('Health Check Module', () => {
  describe('livenessProbe', () => {
    test('should return alive status', () => {
      const result = livenessProbe();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    test('should return valid ISO timestamp', () => {
      const result = livenessProbe();
      const timestamp = new Date(result.timestamp);

      expect(timestamp.toISOString()).toBe(result.timestamp);
    });
  });

  describe('readinessProbe', () => {
    test('should return ready when database is available', async () => {
      const mockDb = {
        getUserByEmail: jest.fn()
      };

      const result = await readinessProbe(mockDb);

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('components');
      expect(result.components.database).toHaveProperty('status', 'up');
    });

    test('should return not ready when database is null', async () => {
      const result = await readinessProbe(null);

      expect(result).toHaveProperty('status', 'not ready');
      expect(result.components.database).toHaveProperty('status', 'down');
    });

    test('should return not ready when database is undefined', async () => {
      const result = await readinessProbe(undefined);

      expect(result).toHaveProperty('status', 'not ready');
      expect(result.components.database).toHaveProperty('status', 'down');
    });
  });

  describe('performHealthCheck', () => {
    test('should return degraded status with valid database but no redis', async () => {
      const mockDb = {
        getUserByEmail: jest.fn()
      };

      const result = await performHealthCheck(mockDb, null);

      // Without redis, system is degraded (not healthy)
      expect(result).toHaveProperty('status', HealthStatus.DEGRADED);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('components');
    });

    test('should return healthy status when all components are up', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const mockRedis = {
        isOpen: true,
        ping: jest.fn().mockResolvedValue('PONG')
      };

      const result = await performHealthCheck(mockDb, mockRedis);

      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    test('should return degraded status when redis is down', async () => {
      const mockDb = {
        getUserByEmail: jest.fn()
      };

      const result = await performHealthCheck(mockDb, null);

      // Without redis, system is degraded
      expect(result.components.redis.status).toBe(ComponentStatus.DOWN);
      expect([HealthStatus.HEALTHY, HealthStatus.DEGRADED]).toContain(result.status);
    });

    test('should return unhealthy when database is down', async () => {
      const result = await performHealthCheck(null, null);

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.components.database.status).toBe(ComponentStatus.DOWN);
    });

    test('should include memory usage information', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const result = await performHealthCheck(mockDb, null);

      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('percentage');
      expect(typeof result.memory.rss).toBe('number');
      expect(typeof result.memory.percentage).toBe('number');
    });

    test('should include system information', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const result = await performHealthCheck(mockDb, null);

      expect(result.system).toHaveProperty('platform');
      expect(result.system).toHaveProperty('arch');
      expect(result.system).toHaveProperty('cpus');
      expect(result.system).toHaveProperty('memory');
      expect(result.system.memory).toHaveProperty('total');
      expect(result.system.memory).toHaveProperty('free');
      expect(result.system.memory).toHaveProperty('percentage');
    });

    test('should include uptime information', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const result = await performHealthCheck(mockDb, null);

      expect(result.uptime).toHaveProperty('milliseconds');
      expect(result.uptime).toHaveProperty('seconds');
      expect(result.uptime).toHaveProperty('formatted');
      expect(result.uptime.milliseconds).toBeGreaterThanOrEqual(0);
      expect(result.uptime.formatted).toMatch(/\d+d \d+h \d+m \d+s/);
    });

    test('should include version information', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const result = await performHealthCheck(mockDb, null);

      expect(result.version).toHaveProperty('version');
      expect(result.version).toHaveProperty('name');
      expect(result.version).toHaveProperty('node');
      expect(result.version.name).toBe('mediconnect-pro');
    });

    test('should handle database with healthCheck method', async () => {
      const mockDb = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'healthy',
          database: 'postgresql',
          pool: { total: 10, idle: 5, waiting: 0 }
        })
      };

      const result = await performHealthCheck(mockDb, null);

      expect(result.components.database.status).toBe(ComponentStatus.UP);
      expect(result.components.database.type).toBe('postgresql');
    });

    test('should handle database healthCheck returning degraded', async () => {
      const mockDb = {
        healthCheck: jest.fn().mockResolvedValue({
          status: 'degraded',
          database: 'postgresql'
        })
      };

      const result = await performHealthCheck(mockDb, null);

      expect(result.components.database.status).toBe(ComponentStatus.DEGRADED);
    });

    test('should handle database healthCheck throwing error', async () => {
      const mockDb = {
        healthCheck: jest.fn().mockRejectedValue(new Error('Connection lost'))
      };

      const result = await performHealthCheck(mockDb, null);

      expect(result.components.database.status).toBe(ComponentStatus.DOWN);
      expect(result.components.database.message).toBe('Connection lost');
    });
  });

  describe('Redis health check', () => {
    test('should report redis up when connected and ping succeeds', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const mockRedis = {
        isOpen: true,
        ping: jest.fn().mockResolvedValue('PONG')
      };

      const result = await performHealthCheck(mockDb, mockRedis);

      expect(result.components.redis.status).toBe(ComponentStatus.UP);
      expect(result.components.redis.message).toBe('Redis operational');
    });

    test('should report redis down when not connected', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const mockRedis = {
        isOpen: false
      };

      const result = await performHealthCheck(mockDb, mockRedis);

      expect(result.components.redis.status).toBe(ComponentStatus.DOWN);
      expect(result.components.redis.fallback).toBe('Using in-memory sessions');
    });

    test('should report redis down when ping fails', async () => {
      const mockDb = { getUserByEmail: jest.fn() };
      const mockRedis = {
        isOpen: true,
        ping: jest.fn().mockRejectedValue(new Error('Redis timeout'))
      };

      const result = await performHealthCheck(mockDb, mockRedis);

      expect(result.components.redis.status).toBe(ComponentStatus.DOWN);
      expect(result.components.redis.message).toBe('Redis timeout');
    });
  });

  describe('Health Status Constants', () => {
    test('should export correct HealthStatus values', () => {
      expect(HealthStatus.HEALTHY).toBe('healthy');
      expect(HealthStatus.DEGRADED).toBe('degraded');
      expect(HealthStatus.UNHEALTHY).toBe('unhealthy');
    });

    test('should export correct ComponentStatus values', () => {
      expect(ComponentStatus.UP).toBe('up');
      expect(ComponentStatus.DOWN).toBe('down');
      expect(ComponentStatus.DEGRADED).toBe('degraded');
    });
  });
});

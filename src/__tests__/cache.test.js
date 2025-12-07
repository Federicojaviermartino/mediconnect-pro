const { MemoryCache, apiCache, cacheMiddleware, invalidateCache } = require('../utils/cache');

describe('MemoryCache', () => {
  let cache;

  beforeEach(() => {
    cache = new MemoryCache({
      defaultTTL: 1000,
      maxSize: 5,
      cleanupInterval: 60000
    });
  });

  afterEach(() => {
    cache.stop();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const defaultCache = new MemoryCache();
      expect(defaultCache.defaultTTL).toBe(60000);
      expect(defaultCache.maxSize).toBe(1000);
      defaultCache.stop();
    });

    test('should initialize with custom options', () => {
      expect(cache.defaultTTL).toBe(1000);
      expect(cache.maxSize).toBe(5);
    });
  });

  describe('set and get', () => {
    test('should store and retrieve value', () => {
      cache.set('key1', { data: 'value1' });
      const result = cache.get('key1');
      expect(result).toEqual({ data: 'value1' });
    });

    test('should return undefined for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeUndefined();
    });

    test('should track hits and misses', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('nonexistent'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    test('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 50); // 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete entry', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('invalidatePattern', () => {
    test('should invalidate entries matching pattern', () => {
      cache.set('user:1:data', 'data1');
      cache.set('user:1:settings', 'settings1');
      cache.set('user:2:data', 'data2');

      const count = cache.invalidatePattern('user:1');

      expect(count).toBe(2);
      expect(cache.get('user:1:data')).toBeUndefined();
      expect(cache.get('user:1:settings')).toBeUndefined();
      expect(cache.get('user:2:data')).toBe('data2');
    });

    test('should return 0 if no matches', () => {
      cache.set('key1', 'value1');
      const count = cache.invalidatePattern('nomatch');
      expect(count).toBe(0);
    });
  });

  describe('clear', () => {
    test('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('evictOldest', () => {
    test('should evict oldest entry when max size reached', () => {
      // Fill cache to max
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // This should trigger eviction of oldest (key0)
      cache.set('key5', 'value5');

      expect(cache.get('key0')).toBeUndefined();
      expect(cache.get('key5')).toBe('value5');
    });
  });

  describe('cleanup', () => {
    test('should remove expired entries', async () => {
      cache.set('short', 'value', 50);
      cache.set('long', 'value', 5000);

      await new Promise(resolve => setTimeout(resolve, 100));

      cache.cleanup();

      expect(cache.cache.has('short')).toBe(false);
      expect(cache.cache.has('long')).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('miss');

      const stats = cache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('defaultTTL');
    });

    test('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('miss'); // miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBe('66.67%');
    });

    test('should return 0% hit rate when no requests', () => {
      const stats = cache.getStats();
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('generateKey', () => {
    test('should generate key from request', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/users',
        session: { userId: 1, userRole: 'admin' }
      };

      const key = cache.generateKey(req);
      expect(key).toBe('GET:/api/users:1:admin');
    });

    test('should use defaults for missing session', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/public',
        session: null
      };

      const key = cache.generateKey(req);
      expect(key).toBe('GET:/api/public:anonymous:guest');
    });
  });

  describe('stop', () => {
    test('should stop cleanup timer', () => {
      cache.stop();
      expect(cache.cleanupTimer).toBeNull();
    });
  });
});

describe('apiCache singleton', () => {
  afterEach(() => {
    apiCache.clear();
  });

  test('should be a MemoryCache instance', () => {
    expect(apiCache).toBeInstanceOf(MemoryCache);
  });

  test('should have correct default TTL', () => {
    expect(apiCache.defaultTTL).toBe(30000);
  });
});

describe('cacheMiddleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    apiCache.clear();

    mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      session: { userId: 1, userRole: 'user' }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    mockNext = jest.fn();
  });

  test('should skip caching for non-GET requests', () => {
    mockReq.method = 'POST';
    const middleware = cacheMiddleware();

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  test('should return cached response on cache hit', () => {
    const cachedData = { data: 'cached' };
    apiCache.set('GET:/api/test:1:user', cachedData);

    const middleware = cacheMiddleware();
    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'HIT');
    expect(mockRes.json).toHaveBeenCalledWith(cachedData);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should cache successful responses on cache miss', () => {
    const middleware = cacheMiddleware();
    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();

    // Simulate response
    const responseData = { data: 'response' };
    mockRes.json(responseData);

    expect(mockRes.set).toHaveBeenCalledWith('X-Cache', 'MISS');
    expect(apiCache.get('GET:/api/test:1:user')).toEqual(responseData);
  });

  test('should not cache non-successful responses', () => {
    const middleware = cacheMiddleware();
    middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 500;
    mockRes.json({ error: 'Server error' });

    expect(apiCache.get('GET:/api/test:1:user')).toBeUndefined();
  });

  test('should skip caching when condition returns false', () => {
    const middleware = cacheMiddleware({
      condition: (req) => req.session?.userId !== 1
    });

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    // Should not have checked cache
    expect(mockRes.set).not.toHaveBeenCalled();
  });

  test('should use custom key generator', () => {
    const middleware = cacheMiddleware({
      keyGenerator: (req) => `custom:${req.originalUrl}`
    });

    const cachedData = { data: 'custom cached' };
    apiCache.set('custom:/api/test', cachedData);

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith(cachedData);
  });
});

describe('invalidateCache', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    apiCache.clear();
    apiCache.set('pattern:1', 'value1');
    apiCache.set('pattern:2', 'value2');
    apiCache.set('other:1', 'value3');

    mockReq = {
      params: { id: 1 }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      statusCode: 200
    };

    mockNext = jest.fn();
  });

  test('should invalidate single pattern', () => {
    const middleware = invalidateCache('pattern');
    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();

    // Simulate successful response
    mockRes.json({ success: true });

    expect(apiCache.get('pattern:1')).toBeUndefined();
    expect(apiCache.get('pattern:2')).toBeUndefined();
    expect(apiCache.get('other:1')).toBe('value3');
  });

  test('should invalidate array of patterns', () => {
    const middleware = invalidateCache(['pattern', 'other']);
    middleware(mockReq, mockRes, mockNext);

    mockRes.json({ success: true });

    expect(apiCache.get('pattern:1')).toBeUndefined();
    expect(apiCache.get('other:1')).toBeUndefined();
  });

  test('should support function patterns', () => {
    const middleware = invalidateCache((req) => `pattern:${req.params.id}`);
    middleware(mockReq, mockRes, mockNext);

    mockRes.json({ success: true });

    expect(apiCache.get('pattern:1')).toBeUndefined();
    expect(apiCache.get('pattern:2')).toBe('value2');
  });

  test('should support function returning array', () => {
    const middleware = invalidateCache((req) => ['pattern', 'other']);
    middleware(mockReq, mockRes, mockNext);

    mockRes.json({ success: true });

    expect(apiCache.get('pattern:1')).toBeUndefined();
    expect(apiCache.get('other:1')).toBeUndefined();
  });

  test('should not invalidate on non-successful response', () => {
    const middleware = invalidateCache('pattern');
    middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 500;
    mockRes.json({ error: 'Server error' });

    expect(apiCache.get('pattern:1')).toBe('value1');
  });
});

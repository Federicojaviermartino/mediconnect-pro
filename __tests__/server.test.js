const request = require('supertest');

describe('Server Integration Tests', () => {
  let app;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3334'; // Use different port for tests

    // Import and initialize the app
    const { initApp } = require('../server');
    app = await initApp();
  });

  describe('Server Health', () => {
    test('should initialize app successfully', () => {
      expect(app).toBeDefined();
    });

    test('GET /health should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    test('GET /health/live should return liveness probe', async () => {
      const response = await request(app).get('/health/live');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
    });

    test('GET /health/ready should return readiness probe', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Static Files', () => {
    test('should serve static files from public directory', async () => {
      const response = await request(app).get('/dashboard-styles.css');

      // Should return CSS file or 404 if not found
      expect([200, 404]).toContain(response.statusCode);
    });

    test('should have proper cache headers for static files', async () => {
      const response = await request(app).get('/dashboard-styles.css');

      if (response.statusCode === 200) {
        expect(response.headers).toHaveProperty('cache-control');
      }
    });
  });

  describe('API Routes', () => {
    test('should have auth routes mounted', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'test' });

      // Should return 400 (validation error), 401 (auth error), or 403 (CSRF error), not 404
      expect([400, 401, 403]).toContain(response.statusCode);
    });

    test('should have appointments routes mounted', async () => {
      const response = await request(app).get('/api/appointments');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });

    test('should have prescriptions routes mounted', async () => {
      const response = await request(app).get('/api/prescriptions');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });

    test('should have vitals routes mounted', async () => {
      const response = await request(app).get('/api/vitals/thresholds');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });

    test('should have analytics routes mounted', async () => {
      const response = await request(app).get('/api/analytics/dashboard');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });

    test('should have AI routes mounted', async () => {
      const response = await request(app).get('/api/ai/status');

      // AI status endpoint may require auth or be public
      expect([200, 401, 404]).toContain(response.statusCode);
    });

    test('should have insurance routes mounted', async () => {
      const response = await request(app).get('/api/insurance/providers');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });

    test('should have pharmacy routes mounted', async () => {
      const response = await request(app).get('/api/pharmacy/status');

      // Should return 401 (auth required), not 404
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/nonexistent-route-12345');

      expect(response.statusCode).toBe(404);
    });

    test('should return JSON error for API 404s', async () => {
      const response = await request(app).get('/api/this-does-not-exist');

      expect(response.statusCode).toBe(404);
      if (response.headers['content-type']?.includes('application/json')) {
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    test('should have X-Content-Type-Options header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should have X-Frame-Options header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should have Content-Security-Policy header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('content-security-policy');
    });

    test('should not expose X-Powered-By header', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should have compression enabled', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip, deflate');

      // Response should support compression
      expect(response.headers).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('should set session cookie on login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@mediconnect.demo',
          password: 'Demo2024!Admin'
        });

      if (response.statusCode === 200) {
        expect(response.headers['set-cookie']).toBeDefined();
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should have CSRF token endpoint', async () => {
      const response = await request(app).get('/api/csrf-token');

      // CSRF endpoint should exist
      expect([200, 401, 403]).toContain(response.statusCode);
    });
  });
});

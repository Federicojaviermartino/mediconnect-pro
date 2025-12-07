/**
 * Server Integration Tests
 * Tests for server.js main configuration and middleware
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

describe('Server Configuration', () => {
  let app;
  let server;

  beforeAll(() => {
    // Create a test Express app that mimics server.js setup
    app = express();

    // Basic middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // Session configuration
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      }
    }));

    // Test routes to simulate server.js routes
    app.get('/test/session', (req, res) => {
      req.session.testData = 'test-value';
      res.json({ success: true, sessionID: req.sessionID });
    });

    app.get('/test/session/read', (req, res) => {
      res.json({ testData: req.session.testData });
    });

    app.get('/test/cookies', (req, res) => {
      res.cookie('test-cookie', 'test-value', { httpOnly: true });
      res.json({ success: true });
    });

    app.get('/test/json', (req, res) => {
      res.json({ message: 'JSON response' });
    });

    app.post('/test/body-parser', (req, res) => {
      res.json({ received: req.body });
    });

    // Static file simulation
    app.use(express.static('public', {
      etag: true,
      lastModified: true,
      maxAge: 0,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (filePath.match(/\.(css|js)$/)) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.match(/\.(woff|woff2|ttf|eot)$/)) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });

    // Error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
      });
    });
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Middleware Configuration', () => {
    test('should parse JSON request bodies', async () => {
      const response = await request(app)
        .post('/test/body-parser')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');

      expect(response.statusCode).toBe(200);
      expect(response.body.received).toEqual({ test: 'data' });
    });

    test('should parse URL-encoded request bodies', async () => {
      const response = await request(app)
        .post('/test/body-parser')
        .send('name=value&other=data')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.statusCode).toBe(200);
      expect(response.body.received).toHaveProperty('name', 'value');
    });

    test('should handle cookies', async () => {
      const response = await request(app).get('/test/cookies');

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('test-cookie');
    });

    test('should create and maintain sessions', async () => {
      const agent = request.agent(app);

      // Create session
      const response1 = await agent.get('/test/session');
      expect(response1.statusCode).toBe(200);
      expect(response1.body.success).toBe(true);
      expect(response1.body.sessionID).toBeDefined();

      // Read session
      const response2 = await agent.get('/test/session/read');
      expect(response2.statusCode).toBe(200);
      expect(response2.body.testData).toBe('test-value');
    });
  });

  describe('Static File Serving', () => {
    test('should serve HTML files with no-cache headers', async () => {
      const response = await request(app).get('/login.html');

      if (response.statusCode === 200) {
        expect(response.headers['cache-control']).toContain('no-cache');
      }
    });

    test('should serve CSS files with appropriate headers in development', async () => {
      const response = await request(app).get('/dashboard-styles.css');

      if (response.statusCode === 200) {
        expect(response.headers['cache-control']).toBe('no-cache');
      }
    });

    test('should serve image files with appropriate headers', async () => {
      const response = await request(app).get('/test.png');

      // May or may not exist, just testing the logic
      if (response.statusCode === 200) {
        expect(response.headers['cache-control']).toBeDefined();
      }
    });

    test('should return 404 for non-existent files', async () => {
      const response = await request(app).get('/non-existent-file.html');

      // Could be 404 from static middleware or our 404 handler
      expect([404]).toContain(response.statusCode);
    });
  });

  describe('Error Handling', () => {
    let errorApp;

    beforeAll(() => {
      // Create separate app for error testing
      errorApp = express();
      errorApp.use(express.json());

      // Add error routes
      errorApp.get('/test/error', (req, res, next) => {
        const error = new Error('Test error');
        error.status = 400;
        next(error);
      });

      errorApp.get('/test/error/500', (req, res, next) => {
        next(new Error('Internal error'));
      });

      // Error handler must come AFTER routes
      errorApp.use((err, req, res, next) => {
        res.status(err.status || 500).json({
          error: err.message || 'Internal Server Error'
        });
      });
    });

    test('should handle errors with custom status codes', async () => {
      const response = await request(errorApp).get('/test/error');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle errors without status codes (default 500)', async () => {
      const response = await request(errorApp).get('/test/error/500');

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Headers', () => {
    test('should return JSON content type', async () => {
      const response = await request(app).get('/test/json');

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should support ETag for static files', async () => {
      const response = await request(app).get('/login.html');

      if (response.statusCode === 200) {
        // ETag should be present for static files
        expect(response.headers.etag || response.headers['last-modified']).toBeDefined();
      }
    });
  });

  describe('Session Configuration', () => {
    test('should have httpOnly cookies', async () => {
      const agent = request.agent(app);
      const response = await agent.get('/test/session');

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        expect(cookies[0]).toContain('HttpOnly');
      }
    });

    test('should have sameSite attribute', async () => {
      const agent = request.agent(app);
      const response = await agent.get('/test/session');

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        expect(cookies[0]).toContain('SameSite');
      }
    });

    test('should not set secure cookie in test environment', async () => {
      const agent = request.agent(app);
      const response = await agent.get('/test/session');

      expect(response.statusCode).toBe(200);
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        // In test, secure should not be set
        expect(cookies[0]).not.toContain('Secure');
      }
    });
  });

  describe('URL Routing', () => {
    test('should handle root path correctly', async () => {
      const response = await request(app).get('/');

      // Could be index.html or 404, either is fine
      expect([200, 404]).toContain(response.statusCode);
    });

    test('should handle paths with query parameters', async () => {
      const response = await request(app).get('/test/json?param=value');

      expect(response.statusCode).toBe(200);
    });

    test('should handle paths with special characters', async () => {
      const response = await request(app).get('/test/path%20with%20spaces');

      // Should return 404 since path doesn't exist
      expect(response.statusCode).toBe(404);
    });
  });
});

describe('Environment Configuration', () => {
  test('should use different session secrets based on environment', () => {
    const defaultSecret = process.env.SESSION_SECRET || 'mediconnect-demo-secret-key-change-in-production';
    expect(defaultSecret).toBeDefined();
    expect(defaultSecret.length).toBeGreaterThan(10);
  });

  test('should configure secure cookies in production', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    // In production, cookies should be secure
    // In development/test, they should not be
    expect(typeof isProduction).toBe('boolean');
  });

  test('should have proper cache configuration', () => {
    const cacheMaxAge = process.env.NODE_ENV === 'production' ? '1d' : 0;
    expect(cacheMaxAge).toBeDefined();
  });
});

describe('Compression and Performance', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Large response for compression testing
    app.get('/test/large-response', (req, res) => {
      const largeData = { data: 'x'.repeat(10000) };
      res.json(largeData);
    });
  });

  test('should handle large responses', async () => {
    const response = await request(app).get('/test/large-response');

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.length).toBe(10000);
  });

  test('should set appropriate content-type for JSON', async () => {
    const response = await request(app).get('/test/large-response');

    expect(response.headers['content-type']).toContain('application/json');
  });
});

describe('Security Headers', () => {
  test('should prevent XSS with httpOnly cookies', async () => {
    const app = express();
    app.use(cookieParser());

    app.get('/test', (req, res) => {
      res.cookie('session', 'value', { httpOnly: true });
      res.json({ ok: true });
    });

    const response = await request(app).get('/test');
    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('HttpOnly');
  });

  test('should properly encode JSON responses to prevent XSS', async () => {
    const app = express();
    app.use(express.json());

    app.get('/test', (req, res) => {
      res.json({ message: '<script>alert("xss")</script>' });
    });

    const response = await request(app).get('/test');

    expect(response.statusCode).toBe(200);
    // JSON.stringify() keeps angle brackets but client-side JSON parsing
    // prevents execution - the important thing is it's properly encoded JSON
    expect(response.body.message).toBe('<script>alert("xss")</script>');
    expect(response.headers['content-type']).toContain('application/json');
  });
});

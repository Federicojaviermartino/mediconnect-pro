const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');

describe('Authentication API', () => {
  let app;
  let db;

  beforeAll(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
      }
    }));

    // Initialize database
    db = initDatabase();

    // Setup auth routes
    setupAuthRoutes(app, db);
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid doctor credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'dr.smith@mediconnect.demo');
      expect(response.body.user).toHaveProperty('role', 'doctor');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should login successfully with valid patient credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.doe@mediconnect.demo',
          password: 'Demo2024!Patient'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('role', 'patient');
    });

    test('should login successfully with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@mediconnect.demo',
          password: 'Demo2024!Admin'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    test('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid');
    });

    test('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'wrongpassword'
        });

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Demo2024!Doctor'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should not expose password in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return current user when authenticated', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then get current user
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'dr.smith@mediconnect.demo');
    });

    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutResponse.statusCode).toBe(200);
      expect(logoutResponse.body).toHaveProperty('message');

      // Verify session is destroyed
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookies);

      expect(meResponse.statusCode).toBe(401);
    });

    test('should handle logout when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      // Should still succeed (idempotent)
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Session Security', () => {
    test('should set httpOnly cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('HttpOnly');
    });

    test('should set sameSite cookie attribute', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'dr.smith@mediconnect.demo',
          password: 'Demo2024!Doctor'
        });

      const cookies = response.headers['set-cookie'];
      expect(cookies[0]).toContain('SameSite');
    });
  });
});

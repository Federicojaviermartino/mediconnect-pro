/**
 * Admin Routes Tests
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupAdminRoutes } = require('../routes/admin');

describe('Admin Endpoints', () => {
  let app;
  let db;
  let adminCookies;
  let doctorCookies;
  let patientCookies;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
    }));

    db = await initDatabase();
    const authLimiter = (req, res, next) => next();

    setupAuthRoutes(app, db, authLimiter);
    setupAdminRoutes(app, db);

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@mediconnect.demo', password: 'Demo2024!Admin' });
    adminCookies = adminLogin.headers['set-cookie'];

    // Login as doctor
    const doctorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dr.smith@mediconnect.demo', password: 'Demo2024!Doctor' });
    doctorCookies = doctorLogin.headers['set-cookie'];

    // Login as patient
    const patientLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.doe@mediconnect.demo', password: 'Demo2024!Patient' });
    patientCookies = patientLogin.headers['set-cookie'];
  });

  describe('GET /api/admin/users', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/admin/users');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', doctorCookies);
      expect(response.statusCode).toBe(403);
    });

    test('should return users list for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should filter by role', async () => {
      const response = await request(app)
        .get('/api/admin/users?role=doctor')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      response.body.users.forEach(user => {
        expect(user.role).toBe('doctor');
      });
    });

    test('should filter by search term', async () => {
      const response = await request(app)
        .get('/api/admin/users?search=admin')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=2')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    test('should not include passwords in response', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });
  });

  describe('GET /api/admin/users/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/admin/users/1');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Cookie', patientCookies);
      expect(response.statusCode).toBe(403);
    });

    test('should return user details for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users/1')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.password).toBeUndefined();
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/99999')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/admin/users', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send({ email: 'new@test.demo', password: 'Test1234!', name: 'Test', role: 'patient' });
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', doctorCookies)
        .send({ email: 'new@test.demo', password: 'Test1234!', name: 'Test', role: 'patient' });
      expect(response.statusCode).toBe(403);
    });

    test('should require all fields', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookies)
        .send({ email: 'new@test.demo' });

      expect(response.statusCode).toBe(400);
    });

    test('should validate role', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookies)
        .send({ email: 'new@test.demo', password: 'Test1234!', name: 'Test', role: 'invalid' });

      expect(response.statusCode).toBe(400);
    });

    test('should create new user', async () => {
      const uniqueEmail = `test-${Date.now()}@test.demo`;
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookies)
        .send({
          email: uniqueEmail,
          password: 'Test1234!',
          name: 'Test User',
          role: 'patient'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(uniqueEmail);
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .set('Cookie', adminCookies)
        .send({
          email: 'admin@mediconnect.demo',
          password: 'Test1234!',
          name: 'Test',
          role: 'patient'
        });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/admin/users/1')
        .send({ name: 'Updated Name' });
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .put('/api/admin/users/1')
        .set('Cookie', patientCookies)
        .send({ name: 'Updated Name' });
      expect(response.statusCode).toBe(403);
    });

    test('should update user', async () => {
      // First get a user to update
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Cookie', adminCookies);

      if (usersResponse.body.users.length > 0) {
        const userId = usersResponse.body.users[0].id;
        const response = await request(app)
          .put(`/api/admin/users/${userId}`)
          .set('Cookie', adminCookies)
          .send({ name: 'Updated Test Name' });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      }
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .put('/api/admin/users/99999')
        .set('Cookie', adminCookies)
        .send({ name: 'Test' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).delete('/api/admin/users/1');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .delete('/api/admin/users/1')
        .set('Cookie', doctorCookies);
      expect(response.statusCode).toBe(403);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/api/admin/users/99999')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/admin/users/:id/reset-password', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/admin/users/1/reset-password')
        .send({ newPassword: 'NewPass123!' });
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .post('/api/admin/users/1/reset-password')
        .set('Cookie', patientCookies)
        .send({ newPassword: 'NewPass123!' });
      expect(response.statusCode).toBe(403);
    });

    test('should require minimum password length', async () => {
      const response = await request(app)
        .post('/api/admin/users/1/reset-password')
        .set('Cookie', adminCookies)
        .send({ newPassword: 'short' });

      expect(response.statusCode).toBe(400);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/admin/users/99999/reset-password')
        .set('Cookie', adminCookies)
        .send({ newPassword: 'NewPass123!' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/admin/stats', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/admin/stats');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', doctorCookies);
      expect(response.statusCode).toBe(403);
    });

    test('should return statistics for admin', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('usersByRole');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/admin/audit-log', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/admin/audit-log');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .get('/api/admin/audit-log')
        .set('Cookie', patientCookies);
      expect(response.statusCode).toBe(403);
    });

    test('should return audit log for admin', async () => {
      const response = await request(app)
        .get('/api/admin/audit-log')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('logs');
    });
  });
});

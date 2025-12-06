const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupApiRoutes } = require('../routes/api');

describe('API Endpoints', () => {
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
      cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
      }
    }));

    db = await initDatabase();

    const authLimiter = (req, res, next) => next();

    setupAuthRoutes(app, db, authLimiter);
    setupApiRoutes(app, db);

    // Login as admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@mediconnect.demo',
        password: 'Demo2024!Admin'
      });
    adminCookies = adminLogin.headers['set-cookie'];

    // Login as doctor
    const doctorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dr.smith@mediconnect.demo',
        password: 'Demo2024!Doctor'
      });
    doctorCookies = doctorLogin.headers['set-cookie'];

    // Login as patient
    const patientLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@mediconnect.demo',
        password: 'Demo2024!Patient'
      });
    patientCookies = patientLogin.headers['set-cookie'];
  });

  describe('GET /api/vitals', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/vitals');
      expect(response.statusCode).toBe(401);
    });

    test('should return vitals for authenticated patient', async () => {
      const response = await request(app)
        .get('/api/vitals')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('vitals');
      expect(Array.isArray(response.body.vitals)).toBe(true);
    });

    test('should return empty array if patient has no vitals', async () => {
      const response = await request(app)
        .get('/api/vitals')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('vitals');
    });
  });

  describe('GET /api/patients', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/patients');
      expect(response.statusCode).toBe(401);
    });

    test('should return 403 for patient role', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should return patients list for doctor', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patients');
      expect(Array.isArray(response.body.patients)).toBe(true);
    });

    test('should return patients list for admin', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patients');
    });
  });

  describe('GET /api/patients/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/patients/3');
      expect(response.statusCode).toBe(401);
    });

    test('should return 403 for patient role', async () => {
      const response = await request(app)
        .get('/api/patients/3')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should return patient details for doctor', async () => {
      const response = await request(app)
        .get('/api/patients/3')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patient');
      expect(response.body).toHaveProperty('vitals');
    });

    test('should return patient details for admin', async () => {
      const response = await request(app)
        .get('/api/patients/3')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patient');
    });

    test('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/patients/9999')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/stats', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/stats');
      expect(response.statusCode).toBe(401);
    });

    test('should return 403 for patient role', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should return 403 for doctor role', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should return stats for admin', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalUsers');
      expect(response.body.stats).toHaveProperty('totalPatients');
      expect(response.body.stats).toHaveProperty('totalDoctors');
    });
  });
});

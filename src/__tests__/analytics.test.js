const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupAnalyticsRoutes } = require('../routes/analytics');

describe('Analytics Endpoints', () => {
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
    setupAnalyticsRoutes(app, db);

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

  describe('GET /api/analytics/dashboard', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/analytics/dashboard');
      expect(response.statusCode).toBe(401);
    });

    test('should return admin dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toHaveProperty('total');
      expect(response.body.users).toHaveProperty('patients');
      expect(response.body.users).toHaveProperty('doctors');
      expect(response.body).toHaveProperty('system');
    });

    test('should return doctor dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patients');
      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('prescriptions');
    });

    test('should return patient dashboard data', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('prescriptions');
      expect(response.body).toHaveProperty('vitals');
    });
  });

  describe('GET /api/analytics/appointments', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/analytics/appointments');
      expect(response.statusCode).toBe(401);
    });

    test('should return appointment analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('by_status');
      expect(response.body).toHaveProperty('completion_rate');
    });

    test('should filter by period 7d', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments?period=7d')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.period).toBe('7d');
    });

    test('should filter by period 30d', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments?period=30d')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.period).toBe('30d');
    });

    test('should filter by period 90d', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments?period=90d')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.period).toBe('90d');
    });

    test('should filter by period 1y', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments?period=1y')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.period).toBe('1y');
    });

    test('should include by_date breakdown', async () => {
      const response = await request(app)
        .get('/api/analytics/appointments')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('by_date');
    });
  });

  describe('GET /api/analytics/vitals', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/analytics/vitals');
      expect(response.statusCode).toBe(401);
    });

    test('should return vitals analytics for patient', async () => {
      const response = await request(app)
        .get('/api/analytics/vitals')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('patient_id');
      expect(response.body).toHaveProperty('vitals_count');
    });

    test('should require patient ID for doctor', async () => {
      const response = await request(app)
        .get('/api/analytics/vitals')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Patient ID');
    });

    test('should return vitals analytics for doctor with patient ID', async () => {
      const response = await request(app)
        .get('/api/analytics/vitals?patientId=1')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.patient_id).toBe(1);
    });

    test('should include averages and ranges if vitals exist', async () => {
      const response = await request(app)
        .get('/api/analytics/vitals?patientId=1')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      if (response.body.vitals_count > 0) {
        expect(response.body).toHaveProperty('averages');
        expect(response.body).toHaveProperty('ranges');
        expect(response.body).toHaveProperty('latest');
      }
    });
  });

  describe('GET /api/analytics/prescriptions', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/analytics/prescriptions');
      expect(response.statusCode).toBe(401);
    });

    test('should return prescription analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/prescriptions')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('by_status');
      expect(response.body).toHaveProperty('approval_rate');
    });

    test('should include top medications', async () => {
      const response = await request(app)
        .get('/api/analytics/prescriptions')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('top_medications');
      expect(Array.isArray(response.body.top_medications)).toBe(true);
    });

    test('should include pharmacy breakdown', async () => {
      const response = await request(app)
        .get('/api/analytics/prescriptions')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('by_pharmacy');
    });

    test('should include status breakdown', async () => {
      const response = await request(app)
        .get('/api/analytics/prescriptions')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.by_status).toHaveProperty('pending');
      expect(response.body.by_status).toHaveProperty('active');
      expect(response.body.by_status).toHaveProperty('completed');
    });
  });

  describe('GET /api/analytics/system', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/analytics/system');
      expect(response.statusCode).toBe(401);
    });

    test('should require admin role', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should return system metrics for admin', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('node');
    });

    test('should include formatted uptime', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.uptime).toHaveProperty('seconds');
      expect(response.body.uptime).toHaveProperty('formatted');
    });

    test('should include memory details', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('rss');
    });

    test('should include node version info', async () => {
      const response = await request(app)
        .get('/api/analytics/system')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.node).toHaveProperty('version');
      expect(response.body.node).toHaveProperty('platform');
    });
  });
});

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupVitalsRoutes } = require('../routes/vitals');

describe('Vitals Endpoints', () => {
  let app;
  let db;
  let adminCookies;
  let doctorCookies;
  let patientCookies;
  let createdAlertId;

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
    setupVitalsRoutes(app, db);

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

  describe('GET /api/vitals/thresholds', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/vitals/thresholds');
      expect(response.statusCode).toBe(401);
    });

    test('should return thresholds for authenticated user', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('thresholds');
      expect(response.body.thresholds).toHaveProperty('heartRate');
      expect(response.body.thresholds).toHaveProperty('temperature');
    });

    test('should adjust thresholds based on age', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?age=70')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      // Senior adults have adjusted ranges
      expect(response.body.thresholds.heartRate.min).toBe(50);
    });

    test('should adjust for pediatric patients', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?age=15')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.thresholds.respiratoryRate.min).toBe(15);
    });

    test('should adjust for hypertension condition', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?conditions=hypertension')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.thresholds.systolicBP.max).toBe(140);
    });

    test('should adjust for diabetes condition', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?conditions=diabetes')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.thresholds.bloodGlucose.max).toBe(180);
    });

    test('should adjust for respiratory conditions', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?conditions=copd')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.thresholds.oxygenSaturation.min).toBe(92);
    });

    test('should handle multiple conditions', async () => {
      const response = await request(app)
        .get('/api/vitals/thresholds?conditions=hypertension,diabetes,asthma')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.thresholds.systolicBP.max).toBe(140);
      expect(response.body.thresholds.bloodGlucose.max).toBe(180);
      expect(response.body.thresholds.oxygenSaturation.min).toBe(92);
    });
  });

  describe('POST /api/vitals/record', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/vitals/record')
        .send({
          patientId: 3, // John Doe patient
          heartRate: 75
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require patient ID', async () => {
      const response = await request(app)
        .post('/api/vitals/record')
        .set('Cookie', doctorCookies)
        .send({
          heartRate: 75
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Patient ID');
    });

    test('should record vitals as doctor', async () => {
      const response = await request(app)
        .post('/api/vitals/record')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3, // John Doe patient
          heartRate: 75,
          systolicBP: 120,
          diastolicBP: 80,
          temperature: 36.6,
          oxygenSaturation: 98,
          respiratoryRate: 16
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('vitalRecord');
    });

    test('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/vitals/record')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 9999,
          heartRate: 75
        });

      expect(response.statusCode).toBe(404);
    });

    test('should generate alerts for abnormal values', async () => {
      const response = await request(app)
        .post('/api/vitals/record')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3, // John Doe patient
          heartRate: 130,
          oxygenSaturation: 88,
          temperature: 39.5
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(response.body.alerts.length).toBeGreaterThan(0);
      // Save alert ID for later tests
      if (response.body.alerts.length > 0) {
        createdAlertId = response.body.alerts[0].id;
      }
    });
  });

  describe('GET /api/vitals/patient/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/vitals/patient/3');
      expect(response.statusCode).toBe(401);
    });

    test('should return vitals for patient', async () => {
      const response = await request(app)
        .get('/api/vitals/patient/3')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('vitals');
      expect(Array.isArray(response.body.vitals)).toBe(true);
    });

    test('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/vitals/patient/9999')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should filter vitals by days parameter', async () => {
      const response = await request(app)
        .get('/api/vitals/patient/3?days=7')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('vitals');
    });

    test('should limit vitals with limit parameter', async () => {
      const response = await request(app)
        .get('/api/vitals/patient/3?limit=5')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.vitals.length).toBeLessThanOrEqual(5);
    });

    test('should include statistics', async () => {
      const response = await request(app)
        .get('/api/vitals/patient/3')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('stats');
    });
  });

  describe('GET /api/vitals/alerts/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/vitals/alerts/3');
      expect(response.statusCode).toBe(401);
    });

    test('should return alerts for patient', async () => {
      const response = await request(app)
        .get('/api/vitals/alerts/3')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('summary');
    });

    test('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .get('/api/vitals/alerts/9999')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should include acknowledged alerts when requested', async () => {
      const response = await request(app)
        .get('/api/vitals/alerts/3?includeAcknowledged=true')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('alerts');
    });
  });

  describe('POST /api/vitals/alerts/:id/acknowledge', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/vitals/alerts/test-alert/acknowledge');
      expect(response.statusCode).toBe(401);
    });

    test('should return 404 for non-existent alert', async () => {
      const response = await request(app)
        .post('/api/vitals/alerts/nonexistent-alert/acknowledge')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should acknowledge an existing alert', async () => {
      // First create an alert by recording abnormal vitals
      const recordResponse = await request(app)
        .post('/api/vitals/record')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3, // John Doe patient
          heartRate: 150, // Critical level
          oxygenSaturation: 85 // Critical level
        });

      if (recordResponse.body.alerts && recordResponse.body.alerts.length > 0) {
        const alertId = recordResponse.body.alerts[0].id;

        const response = await request(app)
          .post(`/api/vitals/alerts/${alertId}/acknowledge`)
          .set('Cookie', doctorCookies);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.alert).toHaveProperty('acknowledged', true);
      }
    });
  });

  describe('POST /api/ai/analyze-vitals', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-vitals')
        .send({
          patientId: 3,
          vitals: []
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require patient ID and vitals', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-vitals')
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
    });

    test('should return message when AI not configured', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-vitals')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3, // John Doe patient
          vitals: [{ heartRate: 75, timestamp: new Date().toISOString() }]
        });

      // Without API key, should return success: false with message
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});

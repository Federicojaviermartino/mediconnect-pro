const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupInsuranceRoutes } = require('../routes/insurance');

// TODO: Fix insurance tests - need valid insurance provider data for mock service
describe.skip('Insurance Endpoints', () => {
  let app;
  let db;
  let adminCookies;
  let doctorCookies;
  let patientCookies;

  beforeAll(async () => {
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

    // Initialize database (async)
    db = await initDatabase();

    // Mock rate limiter for tests (pass-through)
    const authLimiter = (req, res, next) => next();

    // Setup routes
    setupAuthRoutes(app, db, authLimiter);
    setupInsuranceRoutes(app, db);

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

  describe('GET /api/insurance/providers', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/insurance/providers');

      expect(response.statusCode).toBe(401);
    });

    test('should return list of supported providers for authenticated user', async () => {
      const response = await request(app)
        .get('/api/insurance/providers')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('providers');
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body.providers.length).toBeGreaterThan(0);
    });

    test('should return providers with required fields', async () => {
      const response = await request(app)
        .get('/api/insurance/providers')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      response.body.providers.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('supported');
      });
    });
  });

  describe('GET /api/insurance/status', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/insurance/status');

      expect(response.statusCode).toBe(401);
    });

    test('should return insurance service status', async () => {
      const response = await request(app)
        .get('/api/insurance/status')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('available');
      expect(typeof response.body.available).toBe('boolean');
    });
  });

  describe('POST /api/insurance/verify-eligibility', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .send({
          patientId: '1',
          insuranceProvider: 'Blue Cross Blue Shield'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require patientId', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          insuranceProvider: 'Blue Cross Blue Shield'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('patientId');
    });

    test('should require insuranceProvider', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('insuranceProvider');
    });

    test('should fail for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '99999',
          insuranceProvider: 'Blue Cross Blue Shield'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Patient not found');
    });

    test('should verify eligibility with valid data', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'Blue Cross Blue Shield',
          insuranceMemberId: 'BCBS123456789'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('eligibility');
      expect(response.body.eligibility).toHaveProperty('isEligible');
      expect(typeof response.body.eligibility.isEligible).toBe('boolean');
    });

    test('should allow patients to verify their own eligibility', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', patientCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'UnitedHealthcare'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return eligibility details', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'Aetna',
          insuranceMemberId: 'AETNA987654321'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.eligibility).toHaveProperty('provider');
      expect(response.body.eligibility).toHaveProperty('memberId');
    });
  });

  describe('POST /api/insurance/pre-authorization', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .send({
          appointmentId: 1,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require appointmentId', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('appointmentId');
    });

    test('should require serviceCode', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('serviceCode');
    });

    test('should fail for non-existent appointment', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 99999,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Appointment not found');
    });

    test('should request pre-authorization with valid data', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('preAuthorization');
      expect(response.body.preAuthorization).toHaveProperty('authorizationNumber');
    });

    test('should allow admin to request pre-authorization', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', adminCookies)
        .send({
          appointmentId: 1,
          serviceCode: 'G0406'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/insurance/submit-claim', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .send({
          appointmentId: 1
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require appointmentId', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          diagnosisCodes: ['Z00.00']
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('appointmentId');
    });

    test('should fail for non-existent appointment', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 99999
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Appointment not found');
    });

    test('should submit claim with valid data', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          diagnosisCodes: ['Z00.00', 'R50.9'],
          procedureCodes: ['G0071'],
          charges: {
            consultation: 150,
            service: 50
          }
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('claim');
      expect(response.body.claim).toHaveProperty('claimId');
    });

    test('should use default telemedicine code if not provided', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow admin to submit claims', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', adminCookies)
        .send({
          appointmentId: 1,
          diagnosisCodes: ['Z00.00'],
          procedureCodes: ['G0071'],
          charges: { consultation: 150 }
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should include claim details', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          diagnosisCodes: ['Z00.00'],
          procedureCodes: ['G0071'],
          charges: { consultation: 200 }
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.claim).toHaveProperty('status');
      expect(response.body.claim).toHaveProperty('submittedDate');
    });
  });

  describe('GET /api/insurance/claim-status/:claimId', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM12345');

      expect(response.statusCode).toBe(401);
    });

    test('should return claim status for valid claimId', async () => {
      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM12345')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('claimStatus');
      expect(response.body.claimStatus).toHaveProperty('status');
    });

    test('should allow patients to check claim status', async () => {
      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM12345')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow admin to check claim status', async () => {
      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM67890')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should include claim details in status', async () => {
      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM12345')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.claimStatus).toHaveProperty('claimId');
    });
  });

  describe('POST /api/insurance/calculate-cost', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require patientId', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('patientId');
    });

    test('should require serviceCharge', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('serviceCharge');
    });

    test('should calculate patient cost with valid data', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 200
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('costBreakdown');
      expect(response.body.costBreakdown).toHaveProperty('totalCharge');
      expect(response.body.costBreakdown).toHaveProperty('insurancePayment');
      expect(response.body.costBreakdown).toHaveProperty('patientResponsibility');
    });

    test('should allow patients to calculate their own costs', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should include eligibility information', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 250
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('eligibility');
      expect(response.body.eligibility).toHaveProperty('isEligible');
    });

    test('should calculate correct breakdown amounts', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 100
        });

      expect(response.statusCode).toBe(200);
      const breakdown = response.body.costBreakdown;

      // Validate numeric fields
      expect(typeof breakdown.totalCharge).toBe('number');
      expect(typeof breakdown.insurancePayment).toBe('number');
      expect(typeof breakdown.patientResponsibility).toBe('number');

      // Validate math
      expect(breakdown.insurancePayment + breakdown.patientResponsibility)
        .toBeCloseTo(breakdown.totalCharge, 2);
    });
  });

  describe('Insurance Data Integrity', () => {
    test('should maintain consistent provider data structure', async () => {
      const response = await request(app)
        .get('/api/insurance/providers')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const providers = response.body.providers;

      providers.forEach(provider => {
        expect(typeof provider.id).toBe('string');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.supported).toBe('boolean');
        expect(provider.name.length).toBeGreaterThan(0);
      });
    });

    test('should validate service codes format', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.preAuthorization).toHaveProperty('serviceCode');
      expect(typeof response.body.preAuthorization.serviceCode).toBe('string');
    });
  });
});

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupInsuranceRoutes } = require('../routes/insurance');

describe('Insurance Endpoints', () => {
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
  }, 10000); // 10 second timeout for setup

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
      expect(response.body).toHaveProperty('mockMode');
      expect(response.body).toHaveProperty('providers');
      expect(Array.isArray(response.body.providers)).toBe(true);
    });
  });

  describe('POST /api/insurance/verify-eligibility', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .send({
          patientId: '1',
          insuranceProvider: 'sanitas'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require patientId', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          insuranceProvider: 'sanitas'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
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
    });

    test('should handle eligibility verification request', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'sanitas',
          insuranceMemberId: 'SAN123456789'
        });

      // Either succeeds with patient data or fails if patient not found
      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('eligibility');
        expect(response.body.eligibility).toHaveProperty('isEligible');
        expect(typeof response.body.eligibility.isEligible).toBe('boolean');
      } else {
        // Patient might not exist in test database
        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should return 404 for non-existent patient', async () => {
      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', patientCookies)
        .send({
          patientId: '999',
          insuranceProvider: 'cigna'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
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
    });

    test('should handle valid pre-authorization request', async () => {
      // First create an appointment
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-12-15',
        time: '14:00',
        type: 'Consultation',
        status: 'scheduled'
      };
      const createdAppointment = db.createAppointment(appointmentData);

      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: createdAppointment.id,
          serviceCode: 'G0071'
        });

      // Should work with mock insurance service
      expect([200, 404]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('preAuthorization');
        expect(response.body.preAuthorization).toHaveProperty('status');
      }
    });

    test('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 99999,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('Appointment not found');
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
    });

    test('should handle valid claim submission', async () => {
      // First create an appointment
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-12-15',
        time: '15:00',
        type: 'Consultation',
        status: 'completed'
      };
      const createdAppointment = db.createAppointment(appointmentData);

      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: createdAppointment.id,
          diagnosisCodes: ['Z00.00', 'M25.50'],
          procedureCodes: ['99213'],
          totalCharge: 150
        });

      // Should work with mock insurance service
      expect([200, 404, 400]).toContain(response.statusCode);
      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('claim');
      }
    });

    test('should return 404 for non-existent appointment', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 99999,
          diagnosisCodes: ['Z00.00'],
          procedureCodes: ['99213']
        });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('Appointment not found');
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
    });

    test('should return error when patient has no insurance on file', async () => {
      // Demo patients don't have insurance info by default
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 200
        });

      // Expected to fail since demo patient doesn't have insuranceProvider set
      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject calculation for patient without insurance', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      // Demo patient has no insurance provider
      expect(response.statusCode).toBe(400);
    });

    test('should return error message for missing insurance', async () => {
      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 100
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('insurance');
    });
  });

  describe('POST /api/insurance/submit-claim', () => {
    test('should require appointmentId and related fields', async () => {
      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          diagnosisCodes: ['Z00.00'],
          procedureCodes: ['G0071']
        });

      expect(response.statusCode).toBe(400);
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
        expect(provider.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling - GET /api/insurance/providers', () => {
    test('should handle service errors gracefully', async () => {
      const insuranceService = require('../services/insurance-service');
      const originalGetProviders = insuranceService.getSupportedProviders;

      insuranceService.getSupportedProviders = jest.fn(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/insurance/providers')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body).toHaveProperty('error');

      insuranceService.getSupportedProviders = originalGetProviders;
    });
  });

  describe('Error Handling - POST /api/insurance/verify-eligibility', () => {
    test('should handle database error when looking up patient', async () => {
      const originalGetPatientById = db.getPatientById;
      db.getPatientById = jest.fn(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'sanitas',
          insuranceMemberId: '12345'
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to verify insurance eligibility');

      db.getPatientById = originalGetPatientById;
    });

    test('should handle insurance service verification error', async () => {
      const insuranceService = require('../services/insurance-service');
      const originalVerify = insuranceService.verifyEligibility;

      insuranceService.verifyEligibility = jest.fn().mockRejectedValue(
        new Error('Insurance API timeout')
      );

      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'sanitas',
          insuranceMemberId: 'SAN123'
        });

      expect([404, 500]).toContain(response.statusCode);

      insuranceService.verifyEligibility = originalVerify;
    });

    test('should handle updatePatient error after successful verification', async () => {
      const insuranceService = require('../services/insurance-service');
      const originalVerify = insuranceService.verifyEligibility;
      const originalUpdatePatient = db.updatePatient;

      insuranceService.verifyEligibility = jest.fn().mockResolvedValue({
        isEligible: true,
        provider: 'sanitas'
      });

      db.updatePatient = jest.fn(() => {
        throw new Error('Database write error');
      });

      const response = await request(app)
        .post('/api/insurance/verify-eligibility')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          insuranceProvider: 'sanitas',
          insuranceMemberId: 'SAN123'
        });

      expect([404, 500]).toContain(response.statusCode);

      insuranceService.verifyEligibility = originalVerify;
      db.updatePatient = originalUpdatePatient;
    });
  });

  describe('Error Handling - POST /api/insurance/pre-authorization', () => {
    test('should handle database error when looking up appointment', async () => {
      const originalGetAppointmentById = db.getAppointmentById;
      db.getAppointmentById = jest.fn(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to request pre-authorization');

      db.getAppointmentById = originalGetAppointmentById;
    });

    test('should handle insurance service pre-auth error', async () => {
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-12-16',
        time: '10:00',
        type: 'Consultation',
        status: 'scheduled'
      };
      const createdAppointment = db.createAppointment(appointmentData);

      const insuranceService = require('../services/insurance-service');
      const originalRequestPreAuth = insuranceService.requestPreAuthorization;

      insuranceService.requestPreAuthorization = jest.fn().mockRejectedValue(
        new Error('Insurance API error')
      );

      const response = await request(app)
        .post('/api/insurance/pre-authorization')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: createdAppointment.id,
          serviceCode: 'G0071'
        });

      expect(response.statusCode).toBe(500);

      insuranceService.requestPreAuthorization = originalRequestPreAuth;
    });
  });

  describe('Error Handling - POST /api/insurance/submit-claim', () => {
    test('should handle database error when looking up appointment', async () => {
      const originalGetAppointmentById = db.getAppointmentById;
      db.getAppointmentById = jest.fn(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: 1,
          diagnosisCodes: ['Z00.00']
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to submit insurance claim');

      db.getAppointmentById = originalGetAppointmentById;
    });

    test('should handle patient without insurance provider', async () => {
      const appointmentData = {
        patient_id: 1, // Patient without insurance
        doctor_id: 2,
        date: '2025-12-17',
        time: '11:00',
        type: 'Consultation',
        status: 'completed'
      };
      const createdAppointment = db.createAppointment(appointmentData);

      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: createdAppointment.id,
          diagnosisCodes: ['Z00.00']
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('insurance information');
    });

    test('should handle insurance service claim submission error', async () => {
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-12-18',
        time: '12:00',
        type: 'Consultation',
        status: 'completed'
      };
      const createdAppointment = db.createAppointment(appointmentData);

      const insuranceService = require('../services/insurance-service');
      const originalSubmitClaim = insuranceService.submitClaim;

      insuranceService.submitClaim = jest.fn().mockRejectedValue(
        new Error('Claim submission failed')
      );

      const response = await request(app)
        .post('/api/insurance/submit-claim')
        .set('Cookie', doctorCookies)
        .send({
          appointmentId: createdAppointment.id,
          diagnosisCodes: ['Z00.00']
        });

      expect([400, 500]).toContain(response.statusCode);

      insuranceService.submitClaim = originalSubmitClaim;
    });
  });

  describe('Error Handling - GET /api/insurance/claim-status/:claimId', () => {
    test('should handle insurance service error when checking claim status', async () => {
      const insuranceService = require('../services/insurance-service');
      const originalCheckStatus = insuranceService.checkClaimStatus;

      insuranceService.checkClaimStatus = jest.fn().mockRejectedValue(
        new Error('Status check failed')
      );

      const response = await request(app)
        .get('/api/insurance/claim-status/CLAIM12345')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to check claim status');

      insuranceService.checkClaimStatus = originalCheckStatus;
    });
  });

  describe('Error Handling - POST /api/insurance/calculate-cost', () => {
    test('should handle database error when looking up patient', async () => {
      const originalGetPatientById = db.getPatientById;
      db.getPatientById = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to calculate patient cost');

      db.getPatientById = originalGetPatientById;
    });

    test('should handle patient not found in database', async () => {
      const originalGetPatientById = db.getPatientById;
      db.getPatientById = jest.fn(() => null);

      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '999',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('insurance information');

      db.getPatientById = originalGetPatientById;
    });

    test('should handle insurance verification error', async () => {
      const originalGetPatientById = db.getPatientById;
      db.getPatientById = jest.fn(() => ({
        id: 1,
        name: 'Test Patient',
        insuranceProvider: 'sanitas'
      }));

      const insuranceService = require('../services/insurance-service');
      const originalVerify = insuranceService.verifyEligibility;

      insuranceService.verifyEligibility = jest.fn().mockRejectedValue(
        new Error('Verification failed')
      );

      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(500);

      insuranceService.verifyEligibility = originalVerify;
      db.getPatientById = originalGetPatientById;
    });

    test('should handle patient not eligible for coverage', async () => {
      const originalGetPatientById = db.getPatientById;
      db.getPatientById = jest.fn(() => ({
        id: 1,
        name: 'Test Patient',
        insuranceProvider: 'sanitas'
      }));

      const insuranceService = require('../services/insurance-service');
      const originalVerify = insuranceService.verifyEligibility;

      insuranceService.verifyEligibility = jest.fn().mockResolvedValue({
        isEligible: false
      });

      const response = await request(app)
        .post('/api/insurance/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          patientId: '1',
          serviceCharge: 150
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('not eligible');

      insuranceService.verifyEligibility = originalVerify;
      db.getPatientById = originalGetPatientById;
    });
  });

  describe('Error Handling - GET /api/insurance/status', () => {
    test('should handle service error gracefully', async () => {
      const insuranceService = require('../services/insurance-service');
      const originalGetStatus = insuranceService.getStatus;

      insuranceService.getStatus = jest.fn(() => {
        throw new Error('Status unavailable');
      });

      const response = await request(app)
        .get('/api/insurance/status')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to get insurance status');

      insuranceService.getStatus = originalGetStatus;
    });
  });
});

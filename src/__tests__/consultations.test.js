const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupConsultationRoutes } = require('../routes/consultations');

describe('Consultations Endpoints', () => {
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
    setupConsultationRoutes(app, db);

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

  describe('POST /api/consultations/initiate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .send({ notes: 'Test consultation' });

      expect(response.statusCode).toBe(401);
    });

    test('should initiate consultation as patient', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Feeling unwell' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('consultation');
      expect(response.body.consultation).toHaveProperty('room_id');
      expect(response.body.consultation).toHaveProperty('connection');
    });

    test('should initiate consultation as doctor with patient ID', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3,
          notes: 'Follow-up appointment'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.consultation.doctor_id).toBe(2);
      expect(response.body.consultation.patient_id).toBe(3);
    });

    test('should fail for doctor without patient ID', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', doctorCookies)
        .send({ notes: 'Missing patient' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Patient ID');
    });

    test('should not allow admin to initiate', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', adminCookies)
        .send({ notes: 'Admin consultation' });

      expect(response.statusCode).toBe(403);
    });

    test('should include WebRTC connection info', async () => {
      const response = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'WebRTC test' });

      expect(response.statusCode).toBe(201);
      expect(response.body.consultation.connection).toHaveProperty('signaling_server');
      expect(response.body.consultation.connection).toHaveProperty('ice_servers');
    });
  });

  describe('GET /api/consultations/:id', () => {
    let consultationId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test for GET' });
      consultationId = createResponse.body.consultation?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app).get(`/api/consultations/${consultationId}`);
      expect(response.statusCode).toBe(401);
    });

    test('should return consultation for participant', async () => {
      const response = await request(app)
        .get(`/api/consultations/${consultationId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('consultation');
      expect(response.body.consultation).toHaveProperty('status');
    });

    test('should return 404 for non-existent consultation', async () => {
      const response = await request(app)
        .get('/api/consultations/9999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should allow admin to view any consultation', async () => {
      const response = await request(app)
        .get(`/api/consultations/${consultationId}`)
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/consultations/:id/join', () => {
    let consultationId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test for join' });
      consultationId = createResponse.body.consultation?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/consultations/${consultationId}/join`);
      expect(response.statusCode).toBe(401);
    });

    test('should allow participant to join', async () => {
      const response = await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.consultation).toHaveProperty('participants');
    });

    test('should allow doctor to join', async () => {
      const response = await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.consultation.status).toBe('in_progress');
    });

    test('should return 404 for non-existent consultation', async () => {
      const response = await request(app)
        .post('/api/consultations/9999/join')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/consultations/:id/end', () => {
    test('should require authentication', async () => {
      // Create a fresh consultation for this test
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test auth for end' });
      const consultationId = createResponse.body.consultation?.id;

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/end`);
      expect(response.statusCode).toBe(401);
    });

    test('should not allow patient to end', async () => {
      // Create a fresh consultation for this test
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test patient cannot end' });
      const consultationId = createResponse.body.consultation?.id;

      // Join the consultation
      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', patientCookies);
      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', doctorCookies);

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/end`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should allow doctor to end', async () => {
      // Create a fresh consultation for this test
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test doctor can end' });
      const consultationId = createResponse.body.consultation?.id;

      // Join the consultation
      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', patientCookies);
      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', doctorCookies);

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/end`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.consultation.status).toBe('ended');
      expect(response.body.consultation).toHaveProperty('duration_minutes');
    });

    test('should return 404 for non-existent consultation', async () => {
      const response = await request(app)
        .post('/api/consultations/9999/end')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should not allow ending already ended consultation', async () => {
      // Create, join, and end a consultation
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test already ended' });
      const consultationId = createResponse.body.consultation?.id;

      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', patientCookies);
      await request(app)
        .post(`/api/consultations/${consultationId}/join`)
        .set('Cookie', doctorCookies);
      await request(app)
        .post(`/api/consultations/${consultationId}/end`)
        .set('Cookie', doctorCookies);

      // Try to end again
      const response = await request(app)
        .post(`/api/consultations/${consultationId}/end`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('already ended');
    });
  });

  describe('POST /api/consultations/:id/notes', () => {
    test('should require authentication', async () => {
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test auth for notes' });
      const consultationId = createResponse.body.consultation?.id;

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/notes`)
        .send({ notes: 'Clinical notes' });

      expect(response.statusCode).toBe(401);
    });

    test('should require doctor role', async () => {
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test patient cannot add notes' });
      const consultationId = createResponse.body.consultation?.id;

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/notes`)
        .set('Cookie', patientCookies)
        .send({ notes: 'Patient trying to add notes' });

      expect(response.statusCode).toBe(403);
    });

    test('should save notes as doctor', async () => {
      // Patient creates consultation with doctor_id = 2 (Dr. Smith)
      const createResponse = await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Test doctor adds notes' });
      const consultationId = createResponse.body.consultation?.id;

      const response = await request(app)
        .post(`/api/consultations/${consultationId}/notes`)
        .set('Cookie', doctorCookies)
        .send({
          notes: 'Patient presents with symptoms...',
          diagnosis: 'Common cold',
          recommendations: 'Rest and fluids',
          followUp: '2024-02-01'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.notes).toHaveProperty('diagnosis', 'Common cold');
    });

    test('should return 404 for non-existent consultation', async () => {
      const response = await request(app)
        .post('/api/consultations/9999/notes')
        .set('Cookie', doctorCookies)
        .send({ notes: 'Test' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/consultations/history', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/consultations/history');
      expect(response.statusCode).toBe(401);
    });

    test('should return consultation history for patient', async () => {
      const response = await request(app)
        .get('/api/consultations/history')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('consultations');
      expect(response.body).toHaveProperty('pagination');
    });

    test('should return consultation history for doctor', async () => {
      const response = await request(app)
        .get('/api/consultations/history')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('consultations');
    });

    test('should return all consultations for admin', async () => {
      const response = await request(app)
        .get('/api/consultations/history')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/consultations/history?status=ended')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      response.body.consultations.forEach(c => {
        expect(c.status).toBe('ended');
      });
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/consultations/history?page=1&limit=5')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/consultations/active', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/consultations/active');
      expect(response.statusCode).toBe(401);
    });

    test('should return active consultation if exists', async () => {
      // First create a new consultation
      await request(app)
        .post('/api/consultations/initiate')
        .set('Cookie', patientCookies)
        .send({ notes: 'Active consultation test' });

      const response = await request(app)
        .get('/api/consultations/active')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('active');
    });

    test('should return active:false when no active consultation', async () => {
      // Use admin who has no consultations
      const response = await request(app)
        .get('/api/consultations/active')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.active).toBe(false);
    });
  });
});

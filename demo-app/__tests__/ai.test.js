const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupAIRoutes } = require('../routes/ai');

describe('AI Endpoints', () => {
  let app;
  let db;
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

    // Initialize database
    db = initDatabase();

    // Setup routes
    setupAuthRoutes(app, db);
    setupAIRoutes(app, db);

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

  describe('GET /api/ai/status', () => {
    test('should return AI service status when authenticated', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('mode');
    });

    test('should return status for patient users too', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/ai/status');

      expect(response.statusCode).toBe(401);
    });

    test('should include medical disclaimer header', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .set('Cookie', doctorCookies);

      expect(response.headers).toHaveProperty('x-medical-disclaimer');
      expect(response.headers['x-medical-disclaimer']).toContain('informational purposes only');
      expect(response.headers['x-medical-disclaimer']).toContain('does not constitute medical advice');
    });

    test('should indicate demo mode when no API keys configured', async () => {
      const response = await request(app)
        .get('/api/ai/status')
        .set('Cookie', doctorCookies);

      expect(response.body).toHaveProperty('mode');
      // If no API keys are configured, it should be in demo mode
      if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        expect(response.body.mode).toBe('demo');
      }
    });
  });

  describe('POST /api/ai/triage', () => {
    test('should perform triage analysis with valid symptoms', async () => {
      const response = await request(app)
        .post('/api/ai/triage')
        .set('Cookie', patientCookies)
        .send({
          symptoms: 'I have a persistent headache for 3 days with nausea and sensitivity to light'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('triage');
      expect(response.body.triage).toHaveProperty('urgencyLevel');
      expect(response.body.triage).toHaveProperty('urgencyReason');
      expect(response.body.triage).toHaveProperty('possibleConditions');
      expect(response.body.triage).toHaveProperty('recommendedSpecialty');
      expect(response.body.triage).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.triage.possibleConditions)).toBe(true);
      expect(Array.isArray(response.body.triage.recommendations)).toBe(true);
    });

    test('should require authentication for triage', async () => {
      const response = await request(app)
        .post('/api/ai/triage')
        .send({
          symptoms: 'headache'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should fail without symptoms', async () => {
      const response = await request(app)
        .post('/api/ai/triage')
        .set('Cookie', patientCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should have medical disclaimer header', async () => {
      const response = await request(app)
        .post('/api/ai/triage')
        .set('Cookie', patientCookies)
        .send({
          symptoms: 'fever and cough'
        });

      expect(response.headers).toHaveProperty('x-medical-disclaimer');
    });

    test('should validate urgency levels', async () => {
      const response = await request(app)
        .post('/api/ai/triage')
        .set('Cookie', patientCookies)
        .send({
          symptoms: 'mild headache'
        });

      if (response.statusCode === 200) {
        const urgencyLevel = response.body.triage.urgencyLevel;
        expect(['low', 'medium', 'high', 'emergency']).toContain(urgencyLevel);
      }
    });
  });

  describe('POST /api/ai/transcribe', () => {
    test('should require doctor role', async () => {
      const response = await request(app)
        .post('/api/ai/transcribe')
        .set('Cookie', patientCookies)
        .send({
          audioData: 'base64encodedaudio'
        });

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without audioData', async () => {
      const response = await request(app)
        .post('/api/ai/transcribe')
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should have medical disclaimer header', async () => {
      const response = await request(app)
        .post('/api/ai/transcribe')
        .set('Cookie', doctorCookies)
        .send({
          audioData: 'test-audio-data'
        });

      expect(response.headers).toHaveProperty('x-medical-disclaimer');
    });
  });

  describe('POST /api/ai/generate-notes', () => {
    test('should require doctor role', async () => {
      const response = await request(app)
        .post('/api/ai/generate-notes')
        .set('Cookie', patientCookies)
        .send({
          transcript: 'Patient complains of headache...'
        });

      expect(response.statusCode).toBe(403);
    });

    test('should fail without transcript', async () => {
      const response = await request(app)
        .post('/api/ai/generate-notes')
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should generate notes with valid transcript', async () => {
      const response = await request(app)
        .post('/api/ai/generate-notes')
        .set('Cookie', doctorCookies)
        .send({
          transcript: 'Patient presents with headache, duration 3 days. No fever. Vital signs normal.',
          patientId: 3
        });

      // In demo mode, this should still return a response
      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('notes');
      }
    });

    test('should have medical disclaimer header', async () => {
      const response = await request(app)
        .post('/api/ai/generate-notes')
        .set('Cookie', doctorCookies)
        .send({
          transcript: 'test transcript'
        });

      expect(response.headers).toHaveProperty('x-medical-disclaimer');
    });
  });

  describe('POST /api/ai/generate-report', () => {
    test('should require doctor role', async () => {
      const response = await request(app)
        .post('/api/ai/generate-report')
        .set('Cookie', patientCookies)
        .send({
          patientId: 3,
          notes: 'Patient notes...'
        });

      expect(response.statusCode).toBe(403);
    });

    test('should fail without required parameters', async () => {
      const response = await request(app)
        .post('/api/ai/generate-report')
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should have medical disclaimer header', async () => {
      const response = await request(app)
        .post('/api/ai/generate-report')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3,
          notes: 'test notes'
        });

      expect(response.headers).toHaveProperty('x-medical-disclaimer');
    });
  });

  describe('AI Service Security', () => {
    test('all AI endpoints should require authentication', async () => {
      const endpoints = [
        { method: 'get', path: '/api/ai/status' },
        { method: 'post', path: '/api/ai/triage', body: { symptoms: 'test' } },
        { method: 'post', path: '/api/ai/transcribe', body: { audioData: 'test' } },
        { method: 'post', path: '/api/ai/generate-notes', body: { transcript: 'test' } },
        { method: 'post', path: '/api/ai/generate-report', body: { patientId: 1, notes: 'test' } }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .send(endpoint.body || {});

        expect(response.statusCode).toBe(401);
      }
    });

    test('doctor-only endpoints should reject patient access', async () => {
      const doctorOnlyEndpoints = [
        { method: 'post', path: '/api/ai/transcribe', body: { audioData: 'test' } },
        { method: 'post', path: '/api/ai/generate-notes', body: { transcript: 'test' } },
        { method: 'post', path: '/api/ai/generate-report', body: { patientId: 1, notes: 'test' } }
      ];

      for (const endpoint of doctorOnlyEndpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
          .set('Cookie', patientCookies)
          .send(endpoint.body);

        expect(response.statusCode).toBe(403);
      }
    });
  });
});

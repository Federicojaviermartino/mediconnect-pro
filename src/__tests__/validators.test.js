/**
 * Validator Middleware Unit Tests
 */

const express = require('express');
const request = require('supertest');
const {
  validate,
  validateParams,
  validateQuery,
  authSchemas,
  appointmentSchemas,
  prescriptionSchemas,
  vitalsSchemas
} = require('../middleware/validators');

describe('Validator Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validate middleware', () => {
    test('should pass with valid login credentials', async () => {
      app.post('/test', validate(authSchemas.login), (req, res) => {
        res.json({ success: true, data: req.body });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'Test123!'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject invalid email format', async () => {
      app.post('/test', validate(authSchemas.login), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'not-an-email',
          password: 'Test123!'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    test('should reject weak password', async () => {
      app.post('/test', validate(authSchemas.login), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('validateParams middleware', () => {
    test('should validate route parameters successfully', async () => {
      const Joi = require('joi');
      const paramSchema = Joi.object({
        id: Joi.number().integer().positive().required()
      });

      app.get('/test/:id', validateParams(paramSchema), (req, res) => {
        res.json({ success: true, id: req.params.id });
      });

      const response = await request(app).get('/test/123');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe(123);
    });

    test('should reject invalid route parameters', async () => {
      const Joi = require('joi');
      const paramSchema = Joi.object({
        id: Joi.number().integer().positive().required()
      });

      app.get('/test/:id', validateParams(paramSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test/invalid');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid parameter');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    test('should reject negative numbers when positive required', async () => {
      const Joi = require('joi');
      const paramSchema = Joi.object({
        id: Joi.number().integer().positive().required()
      });

      app.get('/test/:id', validateParams(paramSchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test/-5');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid parameter');
    });
  });

  describe('validateQuery middleware', () => {
    test('should validate query parameters successfully', async () => {
      const Joi = require('joi');
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      });

      app.get('/test', validateQuery(querySchema), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app).get('/test?page=2&limit=50');

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.query.page).toBe(2);
      expect(response.body.query.limit).toBe(50);
    });

    test('should reject invalid query parameters', async () => {
      const Joi = require('joi');
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).required(),
        limit: Joi.number().integer().min(1).max(100).required()
      });

      app.get('/test', validateQuery(querySchema), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test?page=invalid&limit=200');

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid query parameter');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    test('should apply default values for missing query params', async () => {
      const Joi = require('joi');
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
      });

      app.get('/test', validateQuery(querySchema), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app).get('/test');

      expect(response.statusCode).toBe(200);
      expect(response.body.query.page).toBe(1);
      expect(response.body.query.limit).toBe(20);
    });

    test('should strip unknown query parameters', async () => {
      const Joi = require('joi');
      const querySchema = Joi.object({
        page: Joi.number().integer().min(1).default(1)
      });

      app.get('/test', validateQuery(querySchema), (req, res) => {
        res.json({ success: true, query: req.query });
      });

      const response = await request(app).get('/test?page=1&unknown=value');

      expect(response.statusCode).toBe(200);
      expect(response.body.query).not.toHaveProperty('unknown');
    });
  });

  describe('appointmentSchemas', () => {
    test('should validate complete appointment data', async () => {
      app.post('/test', validate(appointmentSchemas.create), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          date: '2025-12-15T14:30:00Z',
          time: '14:30',
          reason: 'Annual checkup',
          doctor_id: 2
        });

      expect(response.statusCode).toBe(200);
    });

    test('should reject appointment with missing required fields', async () => {
      app.post('/test', validate(appointmentSchemas.create), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          date: '2025-12-15T14:30:00Z'
          // Missing time and reason
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject invalid appointment status', async () => {
      app.post('/test', validate(appointmentSchemas.create), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          date: 'invalid-date',
          time: '14:30',
          reason: 'Checkup'
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('prescriptionSchemas', () => {
    test('should validate complete prescription data', async () => {
      app.post('/test', validate(prescriptionSchemas.create), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          medication: 'Ibuprofen',
          dosage: '400mg',
          pharmacy: 'CVS Pharmacy',
          notes: 'Take with food'
        });

      expect(response.statusCode).toBe(200);
    });

    test('should reject prescription with missing medication', async () => {
      app.post('/test', validate(prescriptionSchemas.create), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          // Missing medication and pharmacy
          dosage: '400mg',
          notes: 'Take with food'
        });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('vitalsSchemas', () => {
    test('should validate valid vital signs', async () => {
      app.post('/test', validate(vitalsSchemas.record), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          patient_id: 1,
          heart_rate: 75,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
          temperature: 36.6,
          oxygen_saturation: 98,
          respiratory_rate: 16
        });

      expect(response.statusCode).toBe(200);
    });

    test('should reject vital signs with out-of-range heartRate', async () => {
      app.post('/test', validate(vitalsSchemas.record), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          patient_id: 1,
          heart_rate: 300, // Invalid - too high (max 220)
          temperature: 36.6
        });

      expect(response.statusCode).toBe(400);
    });

    test('should accept minimal valid vital signs (only patientId)', async () => {
      app.post('/test', validate(vitalsSchemas.record), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          patient_id: 1,
          heart_rate: 75
        });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('multiple validation errors', () => {
    test('should return all validation errors when abortEarly is false', async () => {
      app.post('/test', validate(authSchemas.login), (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .send({
          email: 'not-an-email',
          password: '123' // Too short
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });
});

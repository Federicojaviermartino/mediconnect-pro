const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupMedicalRecordsRoutes } = require('../routes/medical-records');

describe('Medical Records Endpoints', () => {
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
    setupMedicalRecordsRoutes(app, db);

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

  describe('GET /api/medical-records', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/medical-records');
      expect(response.statusCode).toBe(401);
    });

    test('should return records for patient', async () => {
      const response = await request(app)
        .get('/api/medical-records')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('records');
      expect(response.body).toHaveProperty('pagination');
    });

    test('should return records for doctor', async () => {
      const response = await request(app)
        .get('/api/medical-records')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('records');
    });

    test('should return all records for admin', async () => {
      const response = await request(app)
        .get('/api/medical-records')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('records');
    });

    test('should filter by type', async () => {
      const response = await request(app)
        .get('/api/medical-records?type=lab_result')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/medical-records?page=1&limit=5')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /api/medical-records', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .send({
          type: 'lab_result',
          title: 'Blood Test'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should create record as patient', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'lab_result',
          title: 'Blood Test Results',
          description: 'Annual blood work',
          content: 'All values normal'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.record).toHaveProperty('id');
    });

    test('should create record as doctor with patient ID', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', doctorCookies)
        .send({
          patientId: 3,
          type: 'note',
          title: 'Consultation Notes',
          description: 'Regular checkup notes'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.record.patient_id).toBe(3);
    });

    test('should fail without title', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'lab_result'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Title');
    });

    test('should fail without type', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          title: 'Missing Type'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('type');
    });

    test('should fail with invalid type', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'invalid_type',
          title: 'Invalid Type Test'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Invalid record type');
    });

    test('should require patient ID for doctor', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', doctorCookies)
        .send({
          type: 'note',
          title: 'Missing Patient'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Patient ID');
    });

    test('should accept file data', async () => {
      const response = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'imaging',
          title: 'X-Ray Results',
          fileData: {
            name: 'xray.jpg',
            type: 'image/jpeg',
            size: 1024000
          }
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.record).toHaveProperty('file_name', 'xray.jpg');
    });
  });

  describe('GET /api/medical-records/:id', () => {
    let recordId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'lab_result',
          title: 'Test for GET by ID',
          description: 'Testing single record retrieval'
        });
      recordId = createResponse.body.record?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app).get(`/api/medical-records/${recordId}`);
      expect(response.statusCode).toBe(401);
    });

    test('should return record for owner', async () => {
      const response = await request(app)
        .get(`/api/medical-records/${recordId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('record');
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .get('/api/medical-records/9999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/medical-records/:id', () => {
    let recordId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'note',
          title: 'Test for UPDATE',
          description: 'Initial description'
        });
      recordId = createResponse.body.record?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .send({ title: 'Updated Title' });

      expect(response.statusCode).toBe(401);
    });

    test('should update record by owner', async () => {
      const response = await request(app)
        .put(`/api/medical-records/${recordId}`)
        .set('Cookie', patientCookies)
        .send({
          title: 'Updated Title',
          description: 'Updated description'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .put('/api/medical-records/9999')
        .set('Cookie', patientCookies)
        .send({ title: 'Update Nothing' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/medical-records/:id', () => {
    let recordId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'other',
          title: 'Test for DELETE'
        });
      recordId = createResponse.body.record?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app).delete(`/api/medical-records/${recordId}`);
      expect(response.statusCode).toBe(401);
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .delete('/api/medical-records/9999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should delete record by uploader', async () => {
      const response = await request(app)
        .delete(`/api/medical-records/${recordId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/medical-records/:id/share', () => {
    let recordId;

    beforeAll(async () => {
      const createResponse = await request(app)
        .post('/api/medical-records')
        .set('Cookie', patientCookies)
        .send({
          type: 'lab_result',
          title: 'Test for SHARE'
        });
      recordId = createResponse.body.record?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/medical-records/${recordId}/share`)
        .send({ doctorId: 2 });

      expect(response.statusCode).toBe(401);
    });

    test('should share record with doctor', async () => {
      const response = await request(app)
        .post(`/api/medical-records/${recordId}/share`)
        .set('Cookie', patientCookies)
        .send({ doctorId: 2 });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.shared_with).toContain(2);
    });

    test('should fail without doctor ID', async () => {
      const response = await request(app)
        .post(`/api/medical-records/${recordId}/share`)
        .set('Cookie', patientCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Doctor ID');
    });

    test('should fail with non-existent doctor', async () => {
      const response = await request(app)
        .post(`/api/medical-records/${recordId}/share`)
        .set('Cookie', patientCookies)
        .send({ doctorId: 9999 });

      expect(response.statusCode).toBe(404);
    });

    test('should return 404 for non-existent record', async () => {
      const response = await request(app)
        .post('/api/medical-records/9999/share')
        .set('Cookie', patientCookies)
        .send({ doctorId: 2 });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/medical-records/types/summary', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/medical-records/types/summary');
      expect(response.statusCode).toBe(401);
    });

    test('should return types summary for patient', async () => {
      const response = await request(app)
        .get('/api/medical-records/types/summary')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total');
    });

    test('should return types summary for admin', async () => {
      const response = await request(app)
        .get('/api/medical-records/types/summary')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.summary).toHaveProperty('lab_result');
      expect(response.body.summary).toHaveProperty('imaging');
    });
  });
});

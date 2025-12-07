const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupPrescriptionRoutes } = require('../routes/prescriptions');

describe('Prescriptions Endpoints', () => {
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
    setupPrescriptionRoutes(app, db);

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

  describe('GET /api/prescriptions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/prescriptions');

      expect(response.statusCode).toBe(401);
    });

    test('should return prescriptions for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
    });

    test('should return prescriptions for authenticated doctor', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
    });

    test('should return prescriptions for authenticated patient', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('prescriptions');
      expect(Array.isArray(response.body.prescriptions)).toBe(true);
    });

    test('should filter prescriptions by patient role', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      const prescriptions = response.body.prescriptions;

      // All prescriptions should belong to patient (user_id 3)
      prescriptions.forEach(rx => {
        expect(rx.patient_id).toBe(3);
      });
    });

    test('should filter prescriptions by doctor role', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      const prescriptions = response.body.prescriptions;

      // All prescriptions should belong to doctor (user_id 2)
      prescriptions.forEach(rx => {
        expect(rx.doctor_id).toBe(2);
      });
    });
  });

  describe('POST /api/prescriptions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .send({
          patient_id: 3,
          medication: 'Test Medication',
          dosage: '10mg',
          frequency: 'Once daily',
          duration: '7 days'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should allow patients to create prescription requests', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Medication',
          dosage: '10mg',
          pharmacy: 'CVS Pharmacy',
          notes: 'Need refill'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should create prescription with valid data', async () => {
      const prescriptionData = {
        medication: 'Amoxicillin',
        dosage: '500mg',
        pharmacy: 'Walgreens',
        notes: 'Take with food'
      };

      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send(prescriptionData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('prescription');
      expect(response.body.prescription).toHaveProperty('id');
      expect(response.body.prescription.medication).toBe('Amoxicillin');
      expect(response.body.prescription.dosage).toBe('500mg');
    });

    test('should allow doctor to create prescriptions', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', doctorCookies)
        .send({
          medication: 'Ibuprofen',
          dosage: '400mg',
          pharmacy: 'CVS Pharmacy'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should fail without required medication', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          dosage: '10mg',
          pharmacy: 'CVS Pharmacy'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required pharmacy', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Med',
          dosage: '10mg'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should set default dosage if not provided', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Metformin',
          pharmacy: 'Walgreens'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.prescription).toHaveProperty('dosage', 'As prescribed');
    });

    test('should include optional notes', async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Atorvastatin',
          dosage: '20mg',
          pharmacy: 'CVS Pharmacy',
          notes: 'Take with a glass of water. Avoid grapefruit juice.'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.prescription).toHaveProperty('notes', 'Take with a glass of water. Avoid grapefruit juice.');
    });
  });


  describe('GET /api/prescriptions/:id', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Get Single',
          dosage: '10mg',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = response.body.prescription.id;
    });

    test('should require authentication', async () => {
      const response = await request(app).get(`/api/prescriptions/${testPrescriptionId}`);
      expect(response.statusCode).toBe(401);
    });

    test('should return prescription for authorized patient', async () => {
      const response = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('prescription');
      expect(response.body.prescription.id).toBe(testPrescriptionId);
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .get('/api/prescriptions/99999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should include patient and doctor names', async () => {
      const response = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.prescription).toHaveProperty('patient_name');
      expect(response.body.prescription).toHaveProperty('doctor_name');
    });
  });

  describe('GET /api/prescriptions/:id/status', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Status',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = response.body.prescription.id;
    });

    test('should require authentication', async () => {
      const response = await request(app).get(`/api/prescriptions/${testPrescriptionId}/status`);
      expect(response.statusCode).toBe(401);
    });

    test('should return prescription status', async () => {
      const response = await request(app)
        .get(`/api/prescriptions/${testPrescriptionId}/status`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('prescription_id');
      expect(response.body).toHaveProperty('status');
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .get('/api/prescriptions/99999/status')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/prescriptions/:id', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Update',
          dosage: '10mg',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = response.body.prescription.id;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}`)
        .send({ dosage: '20mg' });

      expect(response.statusCode).toBe(401);
    });

    test('should require doctor role', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}`)
        .set('Cookie', patientCookies)
        .send({ dosage: '20mg' });

      expect(response.statusCode).toBe(403);
    });

    test('should update prescription for assigned doctor', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}`)
        .set('Cookie', doctorCookies)
        .send({ dosage: '25mg' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.prescription.dosage).toBe('25mg');
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .put('/api/prescriptions/99999')
        .set('Cookie', doctorCookies)
        .send({ dosage: '10mg' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/prescriptions/:id/approve', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Approve',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = response.body.prescription.id;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/approve`);

      expect(response.statusCode).toBe(401);
    });

    test('should require doctor role', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/approve`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should approve prescription for assigned doctor', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.prescription.status).toBe('active');
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .put('/api/prescriptions/99999/approve')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should not approve already approved prescription', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/prescriptions/:id/reject', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Reject',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = response.body.prescription.id;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/reject`)
        .send({ reason: 'Not appropriate' });

      expect(response.statusCode).toBe(401);
    });

    test('should require doctor role', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/reject`)
        .set('Cookie', patientCookies)
        .send({ reason: 'Not appropriate' });

      expect(response.statusCode).toBe(403);
    });

    test('should require rejection reason', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
    });

    test('should reject prescription for assigned doctor', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({ reason: 'Patient allergic to this medication' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.prescription.status).toBe('rejected');
      expect(response.body.prescription.rejection_reason).toBe('Patient allergic to this medication');
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .put('/api/prescriptions/88888/reject')
        .set('Cookie', doctorCookies)
        .send({ reason: 'Test reason' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/prescriptions/:id/complete', () => {
    let testPrescriptionId;

    beforeAll(async () => {
      // Create and approve a prescription
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Complete',
          pharmacy: 'Test Pharmacy'
        });
      testPrescriptionId = createResponse.body.prescription.id;

      // Approve it first
      await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/approve`)
        .set('Cookie', doctorCookies);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/complete`);

      expect(response.statusCode).toBe(401);
    });

    test('should require doctor role', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/complete`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
    });

    test('should complete prescription for assigned doctor', async () => {
      const response = await request(app)
        .put(`/api/prescriptions/${testPrescriptionId}/complete`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.prescription.status).toBe('completed');
    });

    test('should return 404 for non-existent prescription', async () => {
      const response = await request(app)
        .put('/api/prescriptions/99999/complete')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });

    test('should not complete pending prescription', async () => {
      // Create a new pending prescription
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Pending Complete',
          pharmacy: 'Test Pharmacy'
        });
      const pendingId = createResponse.body.prescription.id;

      const response = await request(app)
        .put(`/api/prescriptions/${pendingId}/complete`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Prescriptions Data Integrity', () => {
    test('should maintain consistent patient and doctor IDs', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const prescriptions = response.body.prescriptions;

      prescriptions.forEach(rx => {
        expect(typeof rx.patient_id).toBe('number');
        expect(typeof rx.doctor_id).toBe('number');
        expect(rx.patient_id).toBeGreaterThan(0);
        expect(rx.doctor_id).toBeGreaterThan(0);
      });
    });

    test('should have required fields in prescriptions', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const prescriptions = response.body.prescriptions;

      if (prescriptions.length > 0) {
        prescriptions.forEach(rx => {
          expect(rx).toHaveProperty('id');
          expect(rx).toHaveProperty('patient_id');
          expect(rx).toHaveProperty('doctor_id');
          expect(rx).toHaveProperty('medication');
          expect(rx).toHaveProperty('dosage');
          expect(rx).toHaveProperty('frequency');
        });
      }
    });

    test('should validate medication names are strings', async () => {
      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const prescriptions = response.body.prescriptions;

      prescriptions.forEach(rx => {
        expect(typeof rx.medication).toBe('string');
        expect(rx.medication.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling - Database Errors', () => {
    test('should handle database error when getting prescriptions', async () => {
      const originalGetPrescriptions = db.getPrescriptions;
      db.getPrescriptions = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/prescriptions')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch prescriptions');

      db.getPrescriptions = originalGetPrescriptions;
    });

    test('should handle database error when creating prescription', async () => {
      const originalCreate = db.createPrescription;
      db.createPrescription = jest.fn().mockImplementation(() => {
        throw new Error('Database write failed');
      });

      const response = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Medication',
          dosage: '10mg',
          pharmacy: 'Test Pharmacy'
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to create prescription request');

      db.createPrescription = originalCreate;
    });

    test('should handle database error when getting single prescription', async () => {
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockImplementation(() => {
        throw new Error('Database read failed');
      });

      const response = await request(app)
        .get('/api/prescriptions/1')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch prescription');

      db.getPrescriptionById = originalGetById;
    });

    test('should handle database error when getting prescription status', async () => {
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockImplementation(() => {
        throw new Error('Database read failed');
      });

      const response = await request(app)
        .get('/api/prescriptions/1/status')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch prescription status');

      db.getPrescriptionById = originalGetById;
    });

    test('should handle database error when updating prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Update Error',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      const originalUpdate = db.updatePrescription;
      db.updatePrescription = jest.fn().mockImplementation(() => {
        throw new Error('Database update failed');
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}`)
        .set('Cookie', doctorCookies)
        .send({ dosage: '20mg' });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to update prescription');

      db.updatePrescription = originalUpdate;
    });

    test('should handle database error when approving prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Approve Error',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      const originalUpdate = db.updatePrescription;
      db.updatePrescription = jest.fn().mockImplementation(() => {
        throw new Error('Database approve failed');
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to approve prescription');

      db.updatePrescription = originalUpdate;
    });

    test('should handle database error when rejecting prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Reject Error',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      const originalUpdate = db.updatePrescription;
      db.updatePrescription = jest.fn().mockImplementation(() => {
        throw new Error('Database reject failed');
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({ reason: 'Test reason' });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to reject prescription');

      db.updatePrescription = originalUpdate;
    });

    test('should handle database error when completing prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Complete Error',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      // Approve it first
      await request(app)
        .put(`/api/prescriptions/${prescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      const originalUpdate = db.updatePrescription;
      db.updatePrescription = jest.fn().mockImplementation(() => {
        throw new Error('Database complete failed');
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/complete`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to complete prescription');

      db.updatePrescription = originalUpdate;
    });
  });

  describe('Error Handling - Authorization Edge Cases', () => {
    test('should prevent patient from viewing another patient prescription', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 999, // Different patient
        doctor_id: 2,
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .get(`/api/prescriptions/${prescriptionId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent doctor from viewing prescription not assigned to them', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 3,
        doctor_id: 999, // Different doctor
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .get(`/api/prescriptions/${prescriptionId}`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent patient from viewing status of another patient prescription', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 999, // Different patient
        doctor_id: 2,
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .get(`/api/prescriptions/${prescriptionId}/status`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent doctor from updating prescription not assigned to them', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 3,
        doctor_id: 999, // Different doctor
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}`)
        .set('Cookie', doctorCookies)
        .send({ dosage: '20mg' });

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent doctor from approving prescription not assigned to them', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 3,
        doctor_id: 999, // Different doctor
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent doctor from rejecting prescription not assigned to them', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 3,
        doctor_id: 999, // Different doctor
        medication: 'Test',
        dosage: '10mg',
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({ reason: 'Test reason' });

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent doctor from completing prescription not assigned to them', async () => {
      const prescriptionId = 1;
      const originalGetById = db.getPrescriptionById;
      db.getPrescriptionById = jest.fn().mockReturnValue({
        id: prescriptionId,
        patient_id: 3,
        doctor_id: 999, // Different doctor
        medication: 'Test',
        dosage: '10mg',
        status: 'active'
      });

      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/complete`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(403);
      expect(response.body.error).toContain('Unauthorized');

      db.getPrescriptionById = originalGetById;
    });

    test('should prevent updating rejected prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Rejected Update',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      // Reject it
      await request(app)
        .put(`/api/prescriptions/${prescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({ reason: 'Test rejection' });

      // Try to update
      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}`)
        .set('Cookie', doctorCookies)
        .send({ dosage: '20mg' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('rejected');
    });

    test('should prevent rejecting non-pending prescription', async () => {
      const createResponse = await request(app)
        .post('/api/prescriptions')
        .set('Cookie', patientCookies)
        .send({
          medication: 'Test Reject Active',
          pharmacy: 'Test Pharmacy'
        });
      const prescriptionId = createResponse.body.prescription.id;

      // Approve it first
      await request(app)
        .put(`/api/prescriptions/${prescriptionId}/approve`)
        .set('Cookie', doctorCookies);

      // Try to reject
      const response = await request(app)
        .put(`/api/prescriptions/${prescriptionId}/reject`)
        .set('Cookie', doctorCookies)
        .send({ reason: 'Test reason' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Cannot reject');
    });
  });
});

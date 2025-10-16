const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupPharmacyRoutes } = require('../routes/pharmacy');
const { setupPrescriptionRoutes } = require('../routes/prescriptions');

describe('Pharmacy Endpoints', () => {
  let app;
  let db;
  let adminCookies;
  let doctorCookies;
  let patientCookies;
  let testPrescriptionId;

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
    setupPharmacyRoutes(app, db);
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

    // Create a test prescription for pharmacy tests
    const prescriptionResponse = await request(app)
      .post('/api/prescriptions')
      .set('Cookie', patientCookies)
      .send({
        medication: 'Amoxicillin',
        dosage: '500mg',
        pharmacy: 'CVS Pharmacy',
        notes: 'Test prescription for pharmacy tests'
      });
    testPrescriptionId = prescriptionResponse.body?.prescription?.id || 1;
  });

  describe('GET /api/pharmacy/network', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network');

      expect(response.statusCode).toBe(401);
    });

    test('should return pharmacy network for authenticated user', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pharmacies');
      expect(Array.isArray(response.body.pharmacies)).toBe(true);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter by country', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network?country=USA')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.pharmacies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ country: 'USA' })
        ])
      );
    });

    test('should filter by delivery availability', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network?deliveryAvailable=true')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      response.body.pharmacies.forEach(pharmacy => {
        expect(pharmacy.deliveryAvailable).toBe(true);
      });
    });

    test('should filter by service type', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network?service=mail-order')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return pharmacies with required fields', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      if (response.body.pharmacies.length > 0) {
        response.body.pharmacies.forEach(pharmacy => {
          expect(pharmacy).toHaveProperty('id');
          expect(pharmacy).toHaveProperty('name');
          expect(pharmacy).toHaveProperty('country');
        });
      }
    });
  });

  describe('GET /api/pharmacy/:pharmacyId', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/pharmacy/cvs-usa');

      expect(response.statusCode).toBe(401);
    });

    test('should return pharmacy details for valid ID', async () => {
      const response = await request(app)
        .get('/api/pharmacy/cvs-usa')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pharmacy');
      expect(response.body.pharmacy).toHaveProperty('id', 'cvs-usa');
      expect(response.body.pharmacy).toHaveProperty('name');
    });

    test('should return 404 for non-existent pharmacy', async () => {
      const response = await request(app)
        .get('/api/pharmacy/nonexistent-pharmacy')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Pharmacy not found');
    });

    test('should allow all authenticated users to view pharmacy details', async () => {
      const response = await request(app)
        .get('/api/pharmacy/walgreens-usa')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/pharmacy/status', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/pharmacy/status');

      expect(response.statusCode).toBe(401);
    });

    test('should return pharmacy service status', async () => {
      const response = await request(app)
        .get('/api/pharmacy/status')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('available');
      expect(typeof response.body.available).toBe('boolean');
    });

    test('should include service details in status', async () => {
      const response = await request(app)
        .get('/api/pharmacy/status')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('networkSize');
    });
  });

  describe('POST /api/pharmacy/check-stock', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .send({
          medicationId: 'amoxicillin-500mg',
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require medicationId', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', patientCookies)
        .send({
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('medicationId');
    });

    test('should require pharmacyId', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'amoxicillin-500mg'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('pharmacyId');
    });

    test('should check stock with valid data', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', doctorCookies)
        .send({
          medicationId: 'amoxicillin-500mg',
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stock');
      expect(response.body.stock).toHaveProperty('available');
      expect(typeof response.body.stock.available).toBe('boolean');
    });

    test('should return stock quantity information', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'lisinopril-10mg',
          pharmacyId: 'walgreens-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.stock).toHaveProperty('medicationId');
      expect(response.body.stock).toHaveProperty('pharmacyId');
    });

    test('should allow patients to check stock', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'metformin-850mg',
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/pharmacy/send-prescription', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .send({
          prescriptionId: testPrescriptionId,
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require prescriptionId', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', doctorCookies)
        .send({
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('prescriptionId');
    });

    test('should require pharmacyId', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', doctorCookies)
        .send({
          prescriptionId: testPrescriptionId
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('pharmacyId');
    });

    test('should fail for non-existent prescription', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', doctorCookies)
        .send({
          prescriptionId: 99999,
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Prescription not found');
    });

    test('should send prescription with valid data (doctor)', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', doctorCookies)
        .send({
          prescriptionId: testPrescriptionId,
          pharmacyId: 'cvs-usa',
          deliveryRequested: false
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('order');
      expect(response.body.order).toHaveProperty('orderId');
    });

    test('should send prescription with delivery (patient)', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', patientCookies)
        .send({
          prescriptionId: testPrescriptionId,
          pharmacyId: 'walgreens-usa',
          deliveryRequested: true,
          deliveryAddress: {
            street: '123 Main St',
            city: 'Springfield',
            state: 'IL',
            zip: '62701'
          }
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.order).toHaveProperty('deliveryRequested', true);
    });

    test('should include order details', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', doctorCookies)
        .send({
          prescriptionId: testPrescriptionId,
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.order).toHaveProperty('status');
      expect(response.body.order).toHaveProperty('pharmacyId');
      expect(response.body.order).toHaveProperty('estimatedReady');
    });

    test('should allow admin to send prescriptions', async () => {
      const response = await request(app)
        .post('/api/pharmacy/send-prescription')
        .set('Cookie', adminCookies)
        .send({
          prescriptionId: testPrescriptionId,
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET /api/pharmacy/track-order/:orderId', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD123456');

      expect(response.statusCode).toBe(401);
    });

    test('should track order with valid ID', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD123456')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('tracking');
      expect(response.body.tracking).toHaveProperty('orderId');
      expect(response.body.tracking).toHaveProperty('status');
    });

    test('should include tracking details', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD654321')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.tracking).toHaveProperty('estimatedReady');
    });

    test('should allow patients to track their orders', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD999888')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow doctors to track orders', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD111222')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow admin to track orders', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD333444')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/pharmacy/calculate-cost', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .send({
          medicationId: 'amoxicillin-500mg',
          quantity: 30
        });

      expect(response.statusCode).toBe(401);
    });

    test('should require medicationId', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          quantity: 30
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('medicationId');
    });

    test('should require quantity', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'amoxicillin-500mg'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('quantity');
    });

    test('should calculate cost without insurance', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'amoxicillin-500mg',
          quantity: 30
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('cost');
      expect(response.body.cost).toHaveProperty('retail');
      expect(response.body.cost).toHaveProperty('patientPays');
    });

    test('should calculate cost with insurance', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', doctorCookies)
        .send({
          medicationId: 'lisinopril-10mg',
          quantity: 90,
          insuranceCoverage: {
            copay: 10,
            coinsurance: 0.2,
            deductible: 500,
            deductibleMet: 300
          }
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.cost).toHaveProperty('insurancePays');
      expect(response.body.cost).toHaveProperty('patientPays');
    });

    test('should validate numeric values in cost breakdown', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', patientCookies)
        .send({
          medicationId: 'metformin-850mg',
          quantity: 60
        });

      expect(response.statusCode).toBe(200);
      expect(typeof response.body.cost.retail).toBe('number');
      expect(typeof response.body.cost.patientPays).toBe('number');
      expect(response.body.cost.retail).toBeGreaterThan(0);
    });

    test('should allow all users to calculate costs', async () => {
      const response = await request(app)
        .post('/api/pharmacy/calculate-cost')
        .set('Cookie', adminCookies)
        .send({
          medicationId: 'atorvastatin-20mg',
          quantity: 30
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Pharmacy Data Integrity', () => {
    test('should maintain consistent pharmacy data structure', async () => {
      const response = await request(app)
        .get('/api/pharmacy/network')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      response.body.pharmacies.forEach(pharmacy => {
        expect(typeof pharmacy.id).toBe('string');
        expect(typeof pharmacy.name).toBe('string');
        expect(typeof pharmacy.country).toBe('string');
        expect(pharmacy.id.length).toBeGreaterThan(0);
        expect(pharmacy.name.length).toBeGreaterThan(0);
      });
    });

    test('should validate order ID format', async () => {
      const response = await request(app)
        .get('/api/pharmacy/track-order/ORD123456')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.tracking.orderId).toMatch(/^ORD/);
    });

    test('should ensure medication IDs are consistent', async () => {
      const response = await request(app)
        .post('/api/pharmacy/check-stock')
        .set('Cookie', doctorCookies)
        .send({
          medicationId: 'amoxicillin-500mg',
          pharmacyId: 'cvs-usa'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.stock.medicationId).toBe('amoxicillin-500mg');
    });
  });
});

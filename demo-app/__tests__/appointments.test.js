const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupAppointmentRoutes } = require('../routes/appointments');

describe('Appointments Endpoints', () => {
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

    // Initialize database
    db = initDatabase();

    // Setup routes
    setupAuthRoutes(app, db);
    setupAppointmentRoutes(app, db);

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

  describe('GET /api/appointments', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/appointments');

      expect(response.statusCode).toBe(401);
    });

    test('should return appointments for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);
    });

    test('should return appointments for authenticated doctor', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);
    });

    test('should return appointments for authenticated patient', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('appointments');
      expect(Array.isArray(response.body.appointments)).toBe(true);
    });

    test('should filter appointments by patient role', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      const appointments = response.body.appointments;

      // All appointments should belong to patient (user_id 3)
      appointments.forEach(apt => {
        expect(apt.patient_id).toBe(3);
      });
    });

    test('should filter appointments by doctor role', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      const appointments = response.body.appointments;

      // All appointments should belong to doctor (user_id 2)
      appointments.forEach(apt => {
        expect(apt.doctor_id).toBe(2);
      });
    });
  });

  describe('POST /api/appointments', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-01',
          time: '10:00',
          type: 'Consultation'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should create appointment with valid data', async () => {
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-12-15',
        time: '14:00',
        type: 'Follow-up',
        reason: 'Test appointment'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send(appointmentData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('appointment');
      expect(response.body.appointment).toHaveProperty('id');
      expect(response.body.appointment.type).toBe('Follow-up');
      expect(response.body.appointment.date).toBe('2025-12-15');
    });

    test('should fail without required patient_id', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          doctor_id: 2,
          date: '2025-12-01',
          time: '10:00'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required doctor_id', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          patient_id: 3,
          date: '2025-12-01',
          time: '10:00'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required date', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          time: '10:00'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required time', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-01'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should set default status to scheduled', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', doctorCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-20',
          time: '09:00',
          type: 'Consultation'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.appointment).toHaveProperty('status', 'scheduled');
    });

    test('should allow doctor to create appointments', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', doctorCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-25',
          time: '11:00',
          type: 'Check-up'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow admin to create appointments', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', adminCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-30',
          time: '15:00',
          type: 'Emergency'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    let appointmentId;

    beforeAll(async () => {
      // Create an appointment to update
      const createResponse = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          patient_id: 3,
          doctor_id: 2,
          date: '2025-12-31',
          time: '10:00',
          type: 'Test for Update'
        });

      appointmentId = createResponse.body.appointment.id;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .send({ status: 'completed' });

      expect(response.statusCode).toBe(401);
    });

    test('should update appointment status', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Cookie', doctorCookies)
        .send({ status: 'completed' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.appointment).toHaveProperty('status', 'completed');
    });

    test('should update appointment notes', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Cookie', doctorCookies)
        .send({ notes: 'Patient responded well to treatment' });

      expect(response.statusCode).toBe(200);
      expect(response.body.appointment).toHaveProperty('notes', 'Patient responded well to treatment');
    });

    test('should fail for non-existent appointment', async () => {
      const response = await request(app)
        .patch('/api/appointments/99999')
        .set('Cookie', doctorCookies)
        .send({ status: 'completed' });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    test('should allow multiple field updates', async () => {
      const response = await request(app)
        .patch(`/api/appointments/${appointmentId}`)
        .set('Cookie', doctorCookies)
        .send({
          status: 'completed',
          notes: 'Final consultation notes',
          type: 'Follow-up Completed'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.appointment.status).toBe('completed');
      expect(response.body.appointment.notes).toBe('Final consultation notes');
      expect(response.body.appointment.type).toBe('Follow-up Completed');
    });
  });

  describe('Appointments Data Integrity', () => {
    test('should maintain consistent patient and doctor IDs', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const appointments = response.body.appointments;

      appointments.forEach(apt => {
        expect(typeof apt.patient_id).toBe('number');
        expect(typeof apt.doctor_id).toBe('number');
        expect(apt.patient_id).toBeGreaterThan(0);
        expect(apt.doctor_id).toBeGreaterThan(0);
      });
    });

    test('should have required fields in appointments', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const appointments = response.body.appointments;

      if (appointments.length > 0) {
        appointments.forEach(apt => {
          expect(apt).toHaveProperty('id');
          expect(apt).toHaveProperty('patient_id');
          expect(apt).toHaveProperty('doctor_id');
          expect(apt).toHaveProperty('date');
          expect(apt).toHaveProperty('time');
        });
      }
    });
  });
});

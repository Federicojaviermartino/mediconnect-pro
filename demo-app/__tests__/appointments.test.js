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

  // Helper to get future date string
  const getFutureDate = (daysAhead) => {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0];
  };

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
          date: getFutureDate(7),
          time: '10:00',
          reason: 'Regular checkup'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should create appointment with valid data', async () => {
      const appointmentData = {
        date: getFutureDate(15),
        time: '14:00',
        reason: 'Follow-up consultation for test'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send(appointmentData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('appointment');
      expect(response.body.appointment).toHaveProperty('id');
      expect(response.body.appointment.reason).toBe('Follow-up consultation for test');
    });

    test('should fail without required date', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          time: '10:00',
          reason: 'Missing date test'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required time', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: getFutureDate(5),
          reason: 'Missing time test'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without required reason', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: getFutureDate(5),
          time: '11:00'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with past date', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: '2020-01-01',
          time: '10:00',
          reason: 'Past date test'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with invalid time format', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: getFutureDate(5),
          time: '25:00',
          reason: 'Invalid time test'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should allow doctor to create appointments', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', doctorCookies)
        .send({
          date: getFutureDate(20),
          time: '11:00',
          reason: 'Doctor scheduled appointment'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should allow admin to create appointments', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', adminCookies)
        .send({
          date: getFutureDate(25),
          time: '15:00',
          reason: 'Admin scheduled appointment'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should accept optional doctor_id', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: getFutureDate(30),
          time: '09:00',
          reason: 'Appointment with specific doctor',
          doctor_id: 2
        });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.appointment.doctor_id).toBe(2);
    });

    test('should use default doctor_id when not provided', async () => {
      const response = await request(app)
        .post('/api/appointments')
        .set('Cookie', patientCookies)
        .send({
          date: getFutureDate(35),
          time: '16:00',
          reason: 'Appointment without specific doctor'
        });

      expect(response.statusCode).toBe(200);
      expect(response.body.appointment.doctor_id).toBe(2); // Default is Dr. Smith
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

    test('should enrich appointments with user names', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      const appointments = response.body.appointments;

      if (appointments.length > 0) {
        appointments.forEach(apt => {
          expect(apt).toHaveProperty('patient_name');
          expect(apt).toHaveProperty('doctor_name');
        });
      }
    });
  });
});

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { initDatabase } = require('../database/init');
const { setupAuthRoutes } = require('../routes/auth');
const { setupMessageRoutes } = require('../routes/messages');

describe('Messages Endpoints', () => {
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
    setupMessageRoutes(app, db);

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

  describe('GET /api/messages', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/messages');
      expect(response.statusCode).toBe(401);
    });

    test('should return conversations for authenticated user', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('conversations');
      expect(Array.isArray(response.body.conversations)).toBe(true);
    });

    test('should return conversations for doctor', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('conversations');
    });

    test('should return conversations for admin', async () => {
      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('conversations');
    });
  });

  describe('POST /api/messages', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/messages')
        .send({
          to_user_id: 2,
          subject: 'Test message',
          content: 'This is a test'
        });

      expect(response.statusCode).toBe(401);
    });

    test('should create message with valid data', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Question about medication',
          content: 'I have a question about my prescription.'
        });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toHaveProperty('id');
    });

    test('should fail without recipient', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          subject: 'Test',
          content: 'Missing recipient'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without subject', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          content: 'Missing subject'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail without content', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test subject'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should fail with non-existent recipient', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 9999,
          subject: 'Test',
          content: 'Non-existent recipient'
        });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/messages/:id', () => {
    let messageId;

    beforeAll(async () => {
      // Create a message first
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test for GET',
          content: 'Testing single message retrieval'
        });
      messageId = createResponse.body.message?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app).get(`/api/messages/${messageId}`);
      expect(response.statusCode).toBe(401);
    });

    test('should return message for sender', async () => {
      const response = await request(app)
        .get(`/api/messages/${messageId}`)
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    test('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .get('/api/messages/9999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/messages/:id/read', () => {
    let messageId;

    beforeAll(async () => {
      // Create a message from patient to doctor
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test for read status',
          content: 'Testing read status update'
        });
      messageId = createResponse.body.message?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/messages/${messageId}/read`);
      expect(response.statusCode).toBe(401);
    });

    test('should mark message as read by recipient', async () => {
      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .put('/api/messages/9999/read')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/messages/:id/reply', () => {
    let messageId;

    beforeAll(async () => {
      // Create a message from patient to doctor
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test for reply',
          content: 'Testing reply functionality'
        });
      messageId = createResponse.body.message?.id || 1;
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/messages/${messageId}/reply`)
        .send({ content: 'Reply content' });
      expect(response.statusCode).toBe(401);
    });

    test('should allow recipient to reply', async () => {
      const response = await request(app)
        .post(`/api/messages/${messageId}/reply`)
        .set('Cookie', doctorCookies)
        .send({ content: 'This is my reply to your message.' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    test('should fail without content', async () => {
      const response = await request(app)
        .post(`/api/messages/${messageId}/reply`)
        .set('Cookie', doctorCookies)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 for non-existent message', async () => {
      const response = await request(app)
        .post('/api/messages/9999/reply')
        .set('Cookie', doctorCookies)
        .send({ content: 'Reply to nothing' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/messages/unread/count', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/messages/unread/count');
      expect(response.statusCode).toBe(401);
    });

    test('should return unread count for user', async () => {
      const response = await request(app)
        .get('/api/messages/unread/count')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('unread');
      expect(typeof response.body.unread).toBe('number');
    });
  });

  describe('GET /api/messages/recipients', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/messages/recipients');
      expect(response.statusCode).toBe(401);
    });

    test('should return available recipients for patient', async () => {
      const response = await request(app)
        .get('/api/messages/recipients')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('recipients');
      expect(Array.isArray(response.body.recipients)).toBe(true);
    });

    test('should return available recipients for doctor', async () => {
      const response = await request(app)
        .get('/api/messages/recipients')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('recipients');
    });
  });

  describe('GET /api/messages/conversation/:userId', () => {
    test('should require authentication', async () => {
      const response = await request(app).get('/api/messages/conversation/2');
      expect(response.statusCode).toBe(401);
    });

    test('should return conversation with specific user', async () => {
      const response = await request(app)
        .get('/api/messages/conversation/2')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('messages');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/messages/conversation/9999')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(404);
    });
  });
});

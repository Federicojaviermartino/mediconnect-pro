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

  describe('Error Handling - GET /api/messages/unread/count', () => {
    test('should handle database error when fetching messages', async () => {
      const originalGetMessages = db.getMessages;
      db.getMessages = jest.fn(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .get('/api/messages/unread/count')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to get unread count');

      db.getMessages = originalGetMessages;
    });
  });

  describe('Error Handling - GET /api/messages/recipients', () => {
    test('should handle database error when fetching users', async () => {
      const originalGetAllUsers = db.getAllUsers;
      db.getAllUsers = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/messages/recipients')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to get recipients');

      db.getAllUsers = originalGetAllUsers;
    });
  });

  describe('Error Handling - GET /api/messages', () => {
    test('should handle database error when fetching conversations', async () => {
      const originalGetMessages = db.getMessages;
      db.getMessages = jest.fn(() => {
        throw new Error('Database connection lost');
      });

      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch messages');

      db.getMessages = originalGetMessages;
    });

    test('should handle getUserById error when building conversations', async () => {
      const originalGetMessages = db.getMessages;
      const originalGetUserById = db.getUserById;

      db.getMessages = jest.fn(() => [{
        id: 1,
        from_user_id: 2,
        to_user_id: 3,
        subject: 'Test',
        content: 'Test content',
        created_at: new Date().toISOString(),
        read: false
      }]);

      db.getUserById = jest.fn(() => {
        throw new Error('User lookup failed');
      });

      const response = await request(app)
        .get('/api/messages')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);

      db.getMessages = originalGetMessages;
      db.getUserById = originalGetUserById;
    });
  });

  describe('Error Handling - GET /api/messages/conversation/:userId', () => {
    test('should handle database error when fetching conversation', async () => {
      const originalGetMessages = db.getMessages;
      db.getMessages = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/messages/conversation/2')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch conversation');

      db.getMessages = originalGetMessages;
    });
  });

  describe('Error Handling - GET /api/messages/:id', () => {
    test('should handle database error when fetching message', async () => {
      const originalGetMessageById = db.getMessageById;
      db.getMessageById = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/messages/1')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to fetch message');

      db.getMessageById = originalGetMessageById;
    });

    test('should handle unauthorized access to message', async () => {
      // Create a message between doctor and admin
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', doctorCookies)
        .send({
          to_user_id: 1, // Admin
          subject: 'Private message',
          content: 'This is private'
        });

      const messageId = createResponse.body.message?.id;

      if (messageId) {
        // Try to access it as patient
        const response = await request(app)
          .get(`/api/messages/${messageId}`)
          .set('Cookie', patientCookies);

        expect(response.statusCode).toBe(403);
        expect(response.body.error).toContain('Unauthorized');
      }
    });
  });

  describe('Error Handling - POST /api/messages', () => {
    test('should handle database error when creating message', async () => {
      const originalCreateMessage = db.createMessage;
      db.createMessage = jest.fn(() => {
        throw new Error('Database write error');
      });

      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test',
          content: 'Test message'
        });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to send message');

      db.createMessage = originalCreateMessage;
    });

    test('should prevent sending message to yourself', async () => {
      const response = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 3, // Same as logged in patient
          subject: 'To myself',
          content: 'Cannot send to self'
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('yourself');
    });
  });

  describe('Error Handling - POST /api/messages/:id/reply', () => {
    test('should handle database error when fetching original message', async () => {
      const originalGetMessageById = db.getMessageById;
      db.getMessageById = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .post('/api/messages/1/reply')
        .set('Cookie', doctorCookies)
        .send({ content: 'Reply content' });

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to send reply');

      db.getMessageById = originalGetMessageById;
    });

    test('should handle unauthorized reply to message', async () => {
      // Create a message between doctor and admin
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', doctorCookies)
        .send({
          to_user_id: 1, // Admin
          subject: 'Private conversation',
          content: 'Test'
        });

      const messageId = createResponse.body.message?.id;

      if (messageId) {
        // Patient tries to reply to conversation they're not part of
        const response = await request(app)
          .post(`/api/messages/${messageId}/reply`)
          .set('Cookie', patientCookies)
          .send({ content: 'Unauthorized reply' });

        expect(response.statusCode).toBe(403);
        expect(response.body.error).toContain('Unauthorized');
      }
    });

    test('should handle database error when creating reply', async () => {
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test for reply error',
          content: 'Original message'
        });

      const messageId = createResponse.body.message?.id;

      if (messageId) {
        const originalCreateMessage = db.createMessage;
        db.createMessage = jest.fn(() => {
          throw new Error('Database write error');
        });

        const response = await request(app)
          .post(`/api/messages/${messageId}/reply`)
          .set('Cookie', doctorCookies)
          .send({ content: 'Reply content' });

        expect(response.statusCode).toBe(500);

        db.createMessage = originalCreateMessage;
      }
    });
  });

  describe('Error Handling - PUT /api/messages/:id/read', () => {
    test('should handle database error when fetching message', async () => {
      const originalGetMessageById = db.getMessageById;
      db.getMessageById = jest.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .put('/api/messages/1/read')
        .set('Cookie', doctorCookies);

      expect(response.statusCode).toBe(500);
      expect(response.body.error).toBe('Failed to mark message as read');

      db.getMessageById = originalGetMessageById;
    });

    test('should prevent marking message as read by sender', async () => {
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test read permission',
          content: 'Testing read permissions'
        });

      const messageId = createResponse.body.message?.id;

      if (messageId) {
        // Sender tries to mark their own sent message as read
        const response = await request(app)
          .put(`/api/messages/${messageId}/read`)
          .set('Cookie', patientCookies);

        expect(response.statusCode).toBe(403);
        expect(response.body.error).toContain('Unauthorized');
      }
    });

    test('should handle already read message', async () => {
      const createResponse = await request(app)
        .post('/api/messages')
        .set('Cookie', patientCookies)
        .send({
          to_user_id: 2,
          subject: 'Test already read',
          content: 'Testing already read status'
        });

      const messageId = createResponse.body.message?.id;

      if (messageId) {
        // Mark as read first time
        await request(app)
          .put(`/api/messages/${messageId}/read`)
          .set('Cookie', doctorCookies);

        // Try to mark as read again
        const response = await request(app)
          .put(`/api/messages/${messageId}/read`)
          .set('Cookie', doctorCookies);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toContain('already');
      }
    });
  });

  describe('GET /api/messages/recipients - Role-based filtering', () => {
    test('should filter recipients correctly for patient', async () => {
      const response = await request(app)
        .get('/api/messages/recipients')
        .set('Cookie', patientCookies);

      expect(response.statusCode).toBe(200);
      // Patients should only see doctors and admins
      response.body.recipients.forEach(recipient => {
        expect(['doctor', 'admin']).toContain(recipient.role);
      });
    });

    test('should show all users (except self) for admin', async () => {
      const response = await request(app)
        .get('/api/messages/recipients')
        .set('Cookie', adminCookies);

      expect(response.statusCode).toBe(200);
      expect(response.body.recipients.length).toBeGreaterThan(0);
      // Admin should not see themselves
      response.body.recipients.forEach(recipient => {
        expect(recipient.id).not.toBe(1); // Admin ID
      });
    });
  });
});

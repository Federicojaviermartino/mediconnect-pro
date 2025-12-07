// Message routes - Patient-Doctor communication
const { requireAuth } = require('../middleware/auth');
const { validate, validateParams, messageSchemas, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupMessageRoutes(app, db) {
  // Get unread message count - MUST be before /:id route
  app.get('/api/messages/unread/count', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const messages = db.getMessages(userId);

      const unreadCount = messages.filter(msg =>
        msg.to_user_id === userId && !msg.read
      ).length;

      res.json({ unread: unreadCount });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get unread count' });
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  // Get available recipients - MUST be before /:id route
  app.get('/api/messages/recipients', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const allUsers = db.getAllUsers();

      // Filter recipients based on role
      let recipients;
      if (userRole === 'patient') {
        // Patients can message doctors and admins
        recipients = allUsers.filter(u =>
          u.id !== userId && (u.role === 'doctor' || u.role === 'admin')
        );
      } else if (userRole === 'doctor') {
        // Doctors can message patients, other doctors, and admins
        recipients = allUsers.filter(u => u.id !== userId);
      } else {
        // Admins can message everyone
        recipients = allUsers.filter(u => u.id !== userId);
      }

      res.json({
        recipients: recipients.map(u => ({
          id: u.id,
          name: u.name,
          role: u.role,
          specialization: u.specialization
        }))
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get recipients' });
      res.status(500).json({ error: 'Failed to get recipients' });
    }
  });

  // Get all conversations (grouped messages)
  app.get('/api/messages', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const messages = db.getMessages(userId);

      // Group messages by conversation (other participant)
      const conversationsMap = new Map();

      messages.forEach(msg => {
        const otherUserId = msg.from_user_id === userId ? msg.to_user_id : msg.from_user_id;
        const conversationKey = otherUserId;

        if (!conversationsMap.has(conversationKey)) {
          const otherUser = db.getUserById(otherUserId);
          conversationsMap.set(conversationKey, {
            participant_id: otherUserId,
            participant_name: otherUser?.name || 'Unknown',
            participant_role: otherUser?.role || 'unknown',
            messages: [],
            last_message_at: msg.created_at,
            unread_count: 0
          });
        }

        const conversation = conversationsMap.get(conversationKey);
        conversation.messages.push({
          id: msg.id,
          from_user_id: msg.from_user_id,
          to_user_id: msg.to_user_id,
          subject: msg.subject,
          content: msg.content,
          priority: msg.priority || 'normal',
          read: msg.read || false,
          created_at: msg.created_at
        });

        // Update last message time
        if (new Date(msg.created_at) > new Date(conversation.last_message_at)) {
          conversation.last_message_at = msg.created_at;
        }

        // Count unread
        if (msg.to_user_id === userId && !msg.read) {
          conversation.unread_count++;
        }
      });

      // Convert to array and sort by last message
      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

      res.json({ conversations });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get messages' });
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Get conversation with specific user
  app.get('/api/messages/conversation/:userId', requireAuth, validateParams(paramSchemas.userId), (req, res) => {
    try {
      const currentUserId = req.session.user.id;
      const otherUserId = parseInt(req.params.userId);

      const otherUser = db.getUserById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const allMessages = db.getMessages(currentUserId);

      // Filter messages for this conversation
      const conversationMessages = allMessages
        .filter(msg =>
          (msg.from_user_id === currentUserId && msg.to_user_id === otherUserId) ||
          (msg.from_user_id === otherUserId && msg.to_user_id === currentUserId)
        )
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      // Mark messages as read
      conversationMessages.forEach(msg => {
        if (msg.to_user_id === currentUserId && !msg.read) {
          db.updateMessage(msg.id, { read: true, read_at: new Date().toISOString() });
        }
      });

      res.json({
        participant: {
          id: otherUser.id,
          name: otherUser.name,
          role: otherUser.role
        },
        messages: conversationMessages.map(msg => ({
          id: msg.id,
          from_user_id: msg.from_user_id,
          to_user_id: msg.to_user_id,
          subject: msg.subject,
          content: msg.content,
          priority: msg.priority || 'normal',
          read: msg.read || false,
          created_at: msg.created_at
        }))
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get conversation' });
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

  // Get single message
  app.get('/api/messages/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const message = db.getMessageById(messageId);

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Authorization check
      if (message.from_user_id !== userId && message.to_user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this message' });
      }

      // Mark as read if recipient
      if (message.to_user_id === userId && !message.read) {
        db.updateMessage(messageId, { read: true, read_at: new Date().toISOString() });
        message.read = true;
      }

      // Enrich with user names
      const fromUser = db.getUserById(message.from_user_id);
      const toUser = db.getUserById(message.to_user_id);

      res.json({
        message: {
          ...message,
          from_name: fromUser?.name || 'Unknown',
          to_name: toUser?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get message' });
      res.status(500).json({ error: 'Failed to fetch message' });
    }
  });

  // Send a new message
  app.post('/api/messages', requireAuth, validate(messageSchemas.create), (req, res) => {
    try {
      const fromUserId = req.session.user.id;
      const { to_user_id, subject, content, priority } = req.body;

      // Verify recipient exists
      const recipient = db.getUserById(to_user_id);
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // Cannot message yourself
      if (to_user_id === fromUserId) {
        return res.status(400).json({ error: 'Cannot send message to yourself' });
      }

      const messageData = {
        from_user_id: fromUserId,
        to_user_id,
        subject,
        content,
        priority: priority || 'normal',
        read: false
      };

      const message = db.createMessage(messageData);

      // Enrich response
      const fromUser = db.getUserById(fromUserId);

      res.status(201).json({
        success: true,
        message: {
          ...message,
          from_name: fromUser?.name || 'Unknown',
          to_name: recipient.name
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Send message' });
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Reply to a message (creates new message in conversation)
  app.post('/api/messages/:id/reply', requireAuth, validateParams(paramSchemas.id), validate(messageSchemas.reply), (req, res) => {
    try {
      const originalMessageId = parseInt(req.params.id);
      const fromUserId = req.session.user.id;
      const { content } = req.body;

      const originalMessage = db.getMessageById(originalMessageId);

      if (!originalMessage) {
        return res.status(404).json({ error: 'Original message not found' });
      }

      // Authorization check - must be part of the conversation
      if (originalMessage.from_user_id !== fromUserId && originalMessage.to_user_id !== fromUserId) {
        return res.status(403).json({ error: 'Unauthorized to reply to this message' });
      }

      // Reply goes to the other person in the conversation
      const toUserId = originalMessage.from_user_id === fromUserId
        ? originalMessage.to_user_id
        : originalMessage.from_user_id;

      const messageData = {
        from_user_id: fromUserId,
        to_user_id: toUserId,
        subject: `Re: ${originalMessage.subject}`,
        content,
        priority: originalMessage.priority || 'normal',
        reply_to_id: originalMessageId,
        read: false
      };

      const message = db.createMessage(messageData);

      const fromUser = db.getUserById(fromUserId);
      const toUser = db.getUserById(toUserId);

      res.status(201).json({
        success: true,
        message: {
          ...message,
          from_name: fromUser?.name || 'Unknown',
          to_name: toUser?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Reply to message' });
      res.status(500).json({ error: 'Failed to send reply' });
    }
  });

  // Mark message as read
  app.put('/api/messages/:id/read', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.session.user.id;

      const message = db.getMessageById(messageId);

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Only recipient can mark as read
      if (message.to_user_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to mark this message as read' });
      }

      if (message.read) {
        return res.json({ success: true, message: 'Message already marked as read' });
      }

      db.updateMessage(messageId, { read: true, read_at: new Date().toISOString() });

      res.json({ success: true, message: 'Message marked as read' });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Mark message read' });
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

}

module.exports = { setupMessageRoutes };

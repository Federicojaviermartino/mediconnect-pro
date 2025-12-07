// Admin routes - User and system management
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, validateParams, authSchemas, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupAdminRoutes(app, db) {
  // Get all users (admin only)
  app.get('/api/admin/users', requireAuth, requireRole('admin'), (req, res) => {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      let users = db.getAllUsers();

      // Filter by role
      if (role && ['admin', 'doctor', 'patient'].includes(role)) {
        users = users.filter(u => u.role === role);
      }

      // Search by name or email
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const total = users.length;
      const startIndex = (page - 1) * limit;
      const paginatedUsers = users.slice(startIndex, startIndex + parseInt(limit));

      // Remove passwords from response
      const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

      res.json({
        users: safeUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get users' });
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get single user (admin only)
  app.get('/api/admin/users/:id', requireAuth, requireRole('admin'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = db.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Remove password
      const { password, ...safeUser } = user;

      // Get additional info based on role
      let additionalInfo = {};
      if (user.role === 'patient') {
        const patient = db.getPatientByUserId(userId);
        additionalInfo = {
          blood_type: patient?.blood_type,
          allergies: patient?.allergies,
          conditions: patient?.conditions
        };
      }

      res.json({
        user: {
          ...safeUser,
          ...additionalInfo
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get user' });
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // Create new user (admin only)
  app.post('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const { email, password, name, role, specialization } = req.body;

      // Validate required fields
      if (!email || !password || !name || !role) {
        return res.status(400).json({ error: 'Email, password, name, and role are required' });
      }

      // Validate role
      if (!['admin', 'doctor', 'patient'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Check if email exists
      const existingUser = db.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = db.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        specialization: role === 'doctor' ? specialization : null
      });

      // Create patient record if patient role
      if (role === 'patient') {
        db.createPatientRecord(user.id);
      }

      // Remove password from response
      const { password: _, ...safeUser } = user;

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: safeUser
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Create user' });
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Update user (admin only)
  app.put('/api/admin/users/:id', requireAuth, requireRole('admin'), validateParams(paramSchemas.id), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { name, email, role, specialization, active } = req.body;

      const user = db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is being changed and already exists
      if (email && email !== user.email) {
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ error: 'Email already in use' });
        }
      }

      // Validate role if provided
      if (role && !['admin', 'doctor', 'patient'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (role) updateData.role = role;
      if (specialization !== undefined) updateData.specialization = specialization;
      if (active !== undefined) updateData.active = active;

      const updatedUser = db.updateUser(userId, updateData);

      // Remove password from response
      const { password, ...safeUser } = updatedUser;

      res.json({
        success: true,
        message: 'User updated successfully',
        user: safeUser
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Update user' });
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Deactivate user (admin only) - soft delete
  app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.session.user.id;

      // Cannot delete yourself
      if (userId === adminId) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      const user = db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Soft delete - set active to false
      const deactivatedUser = db.updateUser(userId, { active: false });

      res.json({
        success: true,
        message: 'User deactivated successfully',
        user_id: userId
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Deactivate user' });
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  });

  // Reset user password (admin only)
  app.post('/api/admin/users/:id/reset-password', requireAuth, requireRole('admin'), validateParams(paramSchemas.id), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }

      const user = db.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      db.updateUser(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Reset password' });
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  // Get system statistics (admin only)
  app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req, res) => {
    try {
      const stats = db.getStats();
      const allUsers = db.getAllUsers();

      // Additional statistics
      const activeUsers = allUsers.filter(u => u.active !== false).length;
      const usersByRole = {
        admins: allUsers.filter(u => u.role === 'admin').length,
        doctors: allUsers.filter(u => u.role === 'doctor').length,
        patients: allUsers.filter(u => u.role === 'patient').length
      };

      res.json({
        ...stats,
        activeUsers,
        usersByRole,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get stats' });
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Get audit log (admin only) - placeholder for future implementation
  app.get('/api/admin/audit-log', requireAuth, requireRole('admin'), (req, res) => {
    try {
      // Placeholder - would integrate with logger in production
      res.json({
        logs: [],
        message: 'Audit logging available in production environment'
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get audit log' });
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });
}

module.exports = { setupAdminRoutes };

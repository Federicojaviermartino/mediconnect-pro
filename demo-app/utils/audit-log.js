/**
 * Audit Logging System
 * Tracks important user actions and system events
 */

const logger = require('./logger');
const fs = require('fs');
const path = require('path');

// Audit log file path
const AUDIT_LOG_FILE = path.join(__dirname, '../logs/audit.log');

// Ensure logs directory exists
const logsDir = path.dirname(AUDIT_LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Audit event types
 */
const AuditEventTypes = {
  // Authentication events
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET_REQUEST: 'auth.password_reset.request',
  PASSWORD_RESET_COMPLETE: 'auth.password_reset.complete',
  PASSWORD_CHANGE: 'auth.password.change',

  // User management events
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // Patient data events
  PATIENT_VIEW: 'patient.view',
  PATIENT_UPDATE: 'patient.update',
  VITALS_VIEW: 'vitals.view',
  VITALS_CREATE: 'vitals.create',

  // Appointment events
  APPOINTMENT_CREATE: 'appointment.create',
  APPOINTMENT_UPDATE: 'appointment.update',
  APPOINTMENT_CANCEL: 'appointment.cancel',
  APPOINTMENT_CONFIRM: 'appointment.confirm',
  APPOINTMENT_COMPLETE: 'appointment.complete',

  // Prescription events
  PRESCRIPTION_CREATE: 'prescription.create',
  PRESCRIPTION_UPDATE: 'prescription.update',
  PRESCRIPTION_APPROVE: 'prescription.approve',
  PRESCRIPTION_REJECT: 'prescription.reject',
  PRESCRIPTION_DISPENSE: 'prescription.dispense',

  // Insurance events
  INSURANCE_VERIFY: 'insurance.verify',
  INSURANCE_UPDATE: 'insurance.update',

  // AI events
  AI_TRANSCRIBE: 'ai.transcribe',
  AI_GENERATE_NOTES: 'ai.generate_notes',
  AI_TRIAGE: 'ai.triage',

  // System events
  DATA_EXPORT: 'system.data_export',
  BACKUP_CREATE: 'system.backup.create',
  CONFIG_CHANGE: 'system.config.change',

  // Security events
  UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity'
};

/**
 * Log an audit event
 * @param {Object} options - Audit event options
 * @param {string} options.eventType - Type of event (from AuditEventTypes)
 * @param {number} options.userId - ID of user performing action
 * @param {string} options.userEmail - Email of user performing action
 * @param {string} options.userRole - Role of user
 * @param {string} options.action - Description of action
 * @param {Object} options.metadata - Additional metadata
 * @param {Object} options.req - Express request object (optional)
 * @param {string} options.result - Result of action (success/failure)
 * @param {string} options.ipAddress - IP address of user
 */
function logAuditEvent({
  eventType,
  userId = null,
  userEmail = null,
  userRole = null,
  action,
  metadata = {},
  req = null,
  result = 'success',
  ipAddress = null
}) {
  const timestamp = new Date().toISOString();

  // Extract info from request if provided
  if (req) {
    ipAddress = ipAddress || req.ip || req.connection.remoteAddress;
    userId = userId || req.session?.user?.id;
    userEmail = userEmail || req.session?.user?.email;
    userRole = userRole || req.session?.user?.role;
  }

  const auditEntry = {
    timestamp,
    eventType,
    user: {
      id: userId,
      email: userEmail,
      role: userRole
    },
    action,
    result,
    ipAddress,
    metadata,
    userAgent: req?.headers?.['user-agent'] || null
  };

  // Log to Winston
  logger.info('Audit event', { audit: auditEntry });

  // Also write to dedicated audit log file
  writeToAuditFile(auditEntry);

  return auditEntry;
}

/**
 * Write audit entry to dedicated audit log file
 * @param {Object} entry - Audit entry object
 */
function writeToAuditFile(entry) {
  try {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(AUDIT_LOG_FILE, logLine);
  } catch (error) {
    logger.error('Failed to write to audit log file', { error: error.message });
  }
}

/**
 * Middleware to automatically log API requests
 * @param {Object} options - Middleware options
 * @param {Array<string>} options.excludePaths - Paths to exclude from audit logging
 * @param {Array<string>} options.methods - HTTP methods to log (default: POST, PUT, PATCH, DELETE)
 */
function auditLogMiddleware(options = {}) {
  const {
    excludePaths = ['/health', '/api/cache/stats'],
    methods = ['POST', 'PUT', 'PATCH', 'DELETE']
  } = options;

  return (req, res, next) => {
    // Skip if path is excluded
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip if method is not in the list
    if (!methods.includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to capture response
    res.json = function(body) {
      const result = body.success !== false ? 'success' : 'failure';

      // Log the audit event
      logAuditEvent({
        eventType: `api.${req.method.toLowerCase()}.${req.path.replace(/\//g, '.')}`,
        userId: req.session?.user?.id,
        userEmail: req.session?.user?.email,
        userRole: req.session?.user?.role,
        action: `${req.method} ${req.path}`,
        metadata: {
          statusCode: res.statusCode,
          body: sanitizeRequestBody(req.body),
          params: req.params,
          query: req.query
        },
        req,
        result
      });

      // Call original json method
      return originalJson(body);
    };

    next();
  };
}

/**
 * Sanitize request body to remove sensitive data
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'ssn'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });

  return sanitized;
}

/**
 * Get audit logs for a specific user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @returns {Array} Array of audit log entries
 */
function getUserAuditLogs(userId, options = {}) {
  const { limit = 100, startDate = null, endDate = null } = options;

  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const fileContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    let logs = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null && log.user.id === userId);

    // Filter by date range
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp descending and limit
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return logs.slice(0, limit);
  } catch (error) {
    logger.error('Failed to read audit logs', { error: error.message });
    return [];
  }
}

/**
 * Get all audit logs with filters
 * @param {Object} options - Query options
 * @param {string} options.eventType - Filter by event type
 * @param {string} options.userRole - Filter by user role
 * @param {string} options.result - Filter by result (success/failure)
 * @param {number} options.limit - Maximum number of logs
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @returns {Array} Array of audit log entries
 */
function getAuditLogs(options = {}) {
  const {
    eventType = null,
    userRole = null,
    result = null,
    limit = 100,
    startDate = null,
    endDate = null
  } = options;

  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const fileContent = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    let logs = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);

    // Apply filters
    if (eventType) {
      logs = logs.filter(log => log.eventType === eventType);
    }
    if (userRole) {
      logs = logs.filter(log => log.user.role === userRole);
    }
    if (result) {
      logs = logs.filter(log => log.result === result);
    }
    if (startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp descending and limit
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return logs.slice(0, limit);
  } catch (error) {
    logger.error('Failed to read audit logs', { error: error.message });
    return [];
  }
}

module.exports = {
  AuditEventTypes,
  logAuditEvent,
  auditLogMiddleware,
  getUserAuditLogs,
  getAuditLogs
};

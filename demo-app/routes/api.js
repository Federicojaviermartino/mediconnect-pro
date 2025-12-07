// API routes for demo data
const { requireAuth } = require('../middleware/auth');
const { cacheMiddleware } = require('../utils/cache');
const { validateParams, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

// Cache configurations
const vitalsCache = cacheMiddleware({ ttl: 15000 }); // 15 seconds for vitals
const patientsCache = cacheMiddleware({ ttl: 30000 }); // 30 seconds for patient list
const statsCache = cacheMiddleware({ ttl: 60000 }); // 1 minute for stats

function setupApiRoutes(app, db) {
  // Get patient vitals (cached for 15 seconds)
  app.get('/api/vitals', requireAuth, vitalsCache, (req, res) => {
    try {
      const userId = req.session.user.id;

      // Get patient record
      const patient = db.getPatientByUserId(userId);

      if (!patient) {
        return res.json({ vitals: [] });
      }

      // Get vitals
      const vitals = db.getVitalsByPatientId(patient.id);

      res.json({ vitals });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get vitals' });
      res.status(500).json({ error: 'Failed to fetch vitals' });
    }
  });

  // Get all patients (for doctors/admin - cached for 30 seconds)
  app.get('/api/patients', requireAuth, patientsCache, (req, res) => {
    try {
      if (req.session.user.role !== 'doctor' && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const patients = db.getAllPatients();

      res.json({ patients });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get patients' });
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  });

  // Get patient details with vitals (for doctors/admin)
  app.get('/api/patients/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      if (req.session.user.role !== 'doctor' && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const patientId = req.params.id;

      const patient = db.getPatientById(patientId);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const vitals = db.getVitalsByPatientId(patient.patient_id);

      res.json({ patient, vitals });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get patient details' });
      res.status(500).json({ error: 'Failed to fetch patient details' });
    }
  });

  // Get stats (for admin - cached for 1 minute)
  app.get('/api/stats', requireAuth, statsCache, (req, res) => {
    try {
      if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const stats = db.getStats();

      res.json({ stats });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get stats' });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
}

module.exports = { setupApiRoutes };

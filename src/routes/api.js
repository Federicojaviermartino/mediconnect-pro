// API routes for demo data
const { requireAuth, requireRole } = require('../middleware/auth');
const { cacheMiddleware } = require('../utils/cache');
const { validateParams, paramSchemas, validate } = require('../middleware/validators');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

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

  // Get current patient's info (for patients to get their own profile)
  app.get('/api/me/patient', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;

      // Get patient record for current user
      const patient = db.getPatientByUserId(userId);

      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }

      res.json({
        success: true,
        patient: {
          id: patient.id,
          userId: patient.userId,
          name: patient.name,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          conditions: patient.conditions,
          allergies: patient.allergies,
          medications: patient.medications
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get my patient profile' });
      res.status(500).json({ error: 'Failed to fetch patient profile' });
    }
  });

  // Get all patients (for doctors/admin - cached for 30 seconds)
  app.get('/api/patients', requireAuth, patientsCache, (req, res) => {
    try {
      if (req.session.user.role !== 'doctor' && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { search, page = 1, limit = 20 } = req.query;
      let patients = db.getAllPatients();

      // Search by name
      if (search) {
        const searchLower = search.toLowerCase();
        patients = patients.filter(p =>
          p.name?.toLowerCase().includes(searchLower)
        );
      }

      // Pagination
      const total = patients.length;
      const startIndex = (page - 1) * limit;
      const paginatedPatients = patients.slice(startIndex, startIndex + parseInt(limit));

      res.json({
        patients: paginatedPatients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get patients' });
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  });

  // Create new patient (for doctors)
  app.post('/api/patients', requireAuth, requireRole('doctor'), async (req, res) => {
    try {
      const { name, email, phone, dateOfBirth, gender, bloodType, conditions, allergies } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      // Check if email already exists
      const existingUser = db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }

      // Generate a temporary password
      const tempPassword = 'TempPass123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create user account
      const user = db.createUser({
        name,
        email,
        password: hashedPassword,
        role: 'patient'
      });

      // Create patient record
      const patient = db.createPatientRecord(user.id, {
        name,
        email,
        phone: phone || '',
        dateOfBirth: dateOfBirth || '',
        gender: gender || '',
        bloodType: bloodType || '',
        conditions: conditions || '',
        allergies: allergies || ''
      });

      logger.info(`Doctor ${req.session.user.id} created new patient ${patient.id}`);

      res.status(201).json({
        success: true,
        patient,
        message: `Patient created. Temporary password: ${tempPassword}`
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Create patient' });
      res.status(500).json({ error: 'Failed to create patient' });
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

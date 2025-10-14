// API routes for demo data
const { requireAuth } = require('../middleware/auth');

function setupApiRoutes(app, db) {
  // Get patient vitals
  app.get('/api/vitals', requireAuth, (req, res) => {
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
      console.error('Get vitals error:', error);
      res.status(500).json({ error: 'Failed to fetch vitals' });
    }
  });

  // Get all patients (for doctors/admin)
  app.get('/api/patients', requireAuth, (req, res) => {
    try {
      if (req.session.user.role !== 'doctor' && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const patients = db.getAllPatients();

      res.json({ patients });
    } catch (error) {
      console.error('Get patients error:', error);
      res.status(500).json({ error: 'Failed to fetch patients' });
    }
  });

  // Get patient details with vitals (for doctors/admin)
  app.get('/api/patients/:id', requireAuth, (req, res) => {
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
      console.error('Get patient details error:', error);
      res.status(500).json({ error: 'Failed to fetch patient details' });
    }
  });

  // Get stats (for admin)
  app.get('/api/stats', requireAuth, (req, res) => {
    try {
      if (req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const stats = db.getStats();

      res.json({ stats });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
}

module.exports = { setupApiRoutes };

// API routes for demo data
const { requireAuth } = require('../middleware/auth');

function setupApiRoutes(app, db) {
  // Get patient vitals
  app.get('/api/vitals', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;

      // Get patient record
      const patient = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId);

      if (!patient) {
        return res.json({ vitals: [] });
      }

      // Get vitals
      const vitals = db.prepare(`
        SELECT * FROM vital_signs
        WHERE patient_id = ?
        ORDER BY recorded_at DESC
        LIMIT 10
      `).all(patient.id);

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

      const patients = db.prepare(`
        SELECT u.id, u.name, u.email, p.blood_type, p.allergies, p.conditions
        FROM users u
        LEFT JOIN patients p ON u.id = p.user_id
        WHERE u.role = 'patient'
      `).all();

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

      const patient = db.prepare(`
        SELECT u.id, u.name, u.email, u.created_at, p.id as patient_id, p.blood_type, p.allergies, p.conditions
        FROM users u
        LEFT JOIN patients p ON u.id = p.user_id
        WHERE u.id = ? AND u.role = 'patient'
      `).get(patientId);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const vitals = db.prepare(`
        SELECT * FROM vital_signs
        WHERE patient_id = ?
        ORDER BY recorded_at DESC
        LIMIT 20
      `).all(patient.patient_id);

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

      const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const totalPatients = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "patient"').get();
      const totalDoctors = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = "doctor"').get();
      const totalVitals = db.prepare('SELECT COUNT(*) as count FROM vital_signs').get();

      res.json({
        stats: {
          totalUsers: totalUsers.count,
          totalPatients: totalPatients.count,
          totalDoctors: totalDoctors.count,
          totalVitals: totalVitals.count
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
}

module.exports = { setupApiRoutes };

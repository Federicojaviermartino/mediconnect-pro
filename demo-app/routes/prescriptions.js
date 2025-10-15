// Prescription routes
const { requireAuth } = require('../middleware/auth');

function setupPrescriptionRoutes(app, db) {
  // Get prescriptions
  app.get('/api/prescriptions', requireAuth, (req, res) => {
    try {
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const prescriptions = db.getPrescriptions(userId, role);

      // Enrich with user names
      const enrichedPrescriptions = prescriptions.map(presc => {
        const patient = db.getUserById(presc.patient_id);
        const doctor = db.getUserById(presc.doctor_id);
        return {
          ...presc,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        };
      });

      res.json({ prescriptions: enrichedPrescriptions });
    } catch (error) {
      console.error('Get prescriptions error:', error);
      res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
  });

  // Create prescription request
  app.post('/api/prescriptions', requireAuth, (req, res) => {
    try {
      const { medication, dosage, pharmacy, notes } = req.body;
      const userId = req.session.user.id;

      if (!medication || !pharmacy) {
        return res.status(400).json({ error: 'Medication and pharmacy are required' });
      }

      const prescriptionData = {
        patient_id: userId,
        doctor_id: 2, // Default to Dr. Smith
        medication,
        dosage: dosage || 'As prescribed',
        frequency: 'As directed',
        pharmacy,
        notes: notes || ''
      };

      const prescription = db.createPrescription(prescriptionData);
      res.json({ success: true, prescription });
    } catch (error) {
      console.error('Create prescription error:', error);
      res.status(500).json({ error: 'Failed to create prescription request' });
    }
  });
}

module.exports = { setupPrescriptionRoutes };

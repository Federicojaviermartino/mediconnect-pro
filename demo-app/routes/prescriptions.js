// Prescription routes
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate, validateParams, prescriptionSchemas, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupPrescriptionRoutes(app, db) {
  // Get all prescriptions
  app.get('/api/prescriptions', requireAuth, (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user.id) {
        logger.warn('Invalid session in prescriptions GET');
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

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
      logger.logApiError(error, req, { context: 'Get prescriptions' });
      res.status(500).json({ error: 'Failed to fetch prescriptions' });
    }
  });

  // Get single prescription
  app.get('/api/prescriptions/:id', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      // Authorization check
      if (role === 'patient' && prescription.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this prescription' });
      }
      if (role === 'doctor' && prescription.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this prescription' });
      }

      // Enrich with user names
      const patient = db.getUserById(prescription.patient_id);
      const doctor = db.getUserById(prescription.doctor_id);

      res.json({
        prescription: {
          ...prescription,
          patient_name: patient?.name || 'Unknown',
          doctor_name: doctor?.name || 'Unknown'
        }
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get prescription' });
      res.status(500).json({ error: 'Failed to fetch prescription' });
    }
  });

  // Get prescription status
  app.get('/api/prescriptions/:id/status', requireAuth, validateParams(paramSchemas.id), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const userId = req.session.user.id;
      const role = req.session.user.role;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      // Authorization check
      if (role === 'patient' && prescription.patient_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this prescription status' });
      }
      if (role === 'doctor' && prescription.doctor_id !== userId) {
        return res.status(403).json({ error: 'Unauthorized to view this prescription status' });
      }

      res.json({
        prescription_id: prescription.id,
        status: prescription.status,
        created_at: prescription.created_at,
        updated_at: prescription.updated_at,
        rejection_reason: prescription.rejection_reason
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get prescription status' });
      res.status(500).json({ error: 'Failed to fetch prescription status' });
    }
  });

  // Create prescription request
  app.post('/api/prescriptions', requireAuth, validate(prescriptionSchemas.create), (req, res) => {
    try {
      if (!req.session || !req.session.user || !req.session.user.id) {
        logger.warn('Invalid session in prescriptions POST');
        return res.status(401).json({ error: 'Invalid session. Please login again.' });
      }

      const { medication, dosage, pharmacy, notes } = req.body;
      const userId = req.session.user.id;

      const prescriptionData = {
        patient_id: userId,
        doctor_id: 2,
        medication,
        dosage: dosage || 'As prescribed',
        frequency: 'As directed',
        pharmacy,
        notes: notes || ''
      };

      const prescription = db.createPrescription(prescriptionData);
      res.status(201).json({ success: true, prescription });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Create prescription' });
      res.status(500).json({ error: 'Failed to create prescription request' });
    }
  });

  // Update prescription (doctor only)
  app.put('/api/prescriptions/:id', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), validate(prescriptionSchemas.update), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const doctorId = req.session.user.id;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      // Doctor can only update their assigned prescriptions
      if (prescription.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to update this prescription' });
      }

      // Cannot update rejected or completed prescriptions
      if (prescription.status === 'rejected') {
        return res.status(400).json({ error: 'Cannot update a rejected prescription' });
      }

      const updatedPrescription = db.updatePrescription(prescriptionId, req.body);

      res.json({ success: true, prescription: updatedPrescription });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Update prescription' });
      res.status(500).json({ error: 'Failed to update prescription' });
    }
  });

  // Approve prescription (doctor only)
  app.put('/api/prescriptions/:id/approve', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const doctorId = req.session.user.id;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      if (prescription.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to approve this prescription' });
      }

      if (prescription.status !== 'pending') {
        return res.status(400).json({ error: `Cannot approve a ${prescription.status} prescription` });
      }

      const approvedPrescription = db.updatePrescription(prescriptionId, {
        status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: doctorId
      });

      res.json({ success: true, message: 'Prescription approved', prescription: approvedPrescription });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Approve prescription' });
      res.status(500).json({ error: 'Failed to approve prescription' });
    }
  });

  // Reject prescription (doctor only)
  app.put('/api/prescriptions/:id/reject', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), validate(prescriptionSchemas.reject), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const doctorId = req.session.user.id;
      const { reason } = req.body;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      if (prescription.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to reject this prescription' });
      }

      if (prescription.status !== 'pending') {
        return res.status(400).json({ error: `Cannot reject a ${prescription.status} prescription` });
      }

      const rejectedPrescription = db.updatePrescription(prescriptionId, {
        status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        rejected_by: doctorId
      });

      res.json({ success: true, message: 'Prescription rejected', prescription: rejectedPrescription });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Reject prescription' });
      res.status(500).json({ error: 'Failed to reject prescription' });
    }
  });

  // Complete/dispense prescription (doctor or pharmacy)
  app.put('/api/prescriptions/:id/complete', requireAuth, requireRole('doctor'), validateParams(paramSchemas.id), (req, res) => {
    try {
      const prescriptionId = parseInt(req.params.id);
      const doctorId = req.session.user.id;

      const prescription = db.getPrescriptionById(prescriptionId);

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      if (prescription.doctor_id !== doctorId) {
        return res.status(403).json({ error: 'Unauthorized to complete this prescription' });
      }

      if (prescription.status !== 'active') {
        return res.status(400).json({ error: 'Only active prescriptions can be completed' });
      }

      const completedPrescription = db.updatePrescription(prescriptionId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      res.json({ success: true, message: 'Prescription completed', prescription: completedPrescription });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Complete prescription' });
      res.status(500).json({ error: 'Failed to complete prescription' });
    }
  });
}

module.exports = { setupPrescriptionRoutes };

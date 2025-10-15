/**
 * Insurance Integration Routes
 * Handles insurance eligibility, pre-authorization, and claims
 */

const insuranceService = require('../services/insurance-service');
const { requireAuth } = require('../middleware/auth');

function setupInsuranceRoutes(app, db) {
  /**
   * GET /api/insurance/providers
   * Get list of supported insurance providers
   */
  app.get('/api/insurance/providers', requireAuth, async (req, res) => {
    try {
      const providers = insuranceService.getSupportedProviders();
      res.json({ providers });
    } catch (error) {
      console.error('Error fetching insurance providers:', error);
      res.status(500).json({ error: 'Failed to fetch insurance providers' });
    }
  });

  /**
   * POST /api/insurance/verify-eligibility
   * Verify patient insurance eligibility
   * Body: { patientId, insuranceProvider, insuranceMemberId }
   */
  app.post('/api/insurance/verify-eligibility', requireAuth, async (req, res) => {
    try {
      const { patientId, insuranceProvider, insuranceMemberId } = req.body;

      if (!patientId || !insuranceProvider) {
        return res.status(400).json({ error: 'patientId and insuranceProvider are required' });
      }

      // Get patient data
      const patient = db.getPatientById(patientId);

      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      // Verify eligibility
      const patientData = {
        ...patient,
        insuranceMemberId: insuranceMemberId || patient.insuranceMemberId,
        id: patientId
      };

      const eligibility = await insuranceService.verifyEligibility(patientData, insuranceProvider);

      // Save insurance info to patient record
      if (eligibility.isEligible) {
        db.updatePatient(patientId, {
          insuranceProvider: insuranceProvider,
          insuranceMemberId: insuranceMemberId,
          lastEligibilityCheck: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        eligibility
      });

    } catch (error) {
      console.error('Error verifying eligibility:', error);
      res.status(500).json({ error: 'Failed to verify insurance eligibility' });
    }
  });

  /**
   * POST /api/insurance/pre-authorization
   * Request pre-authorization for a service
   * Body: { appointmentId, serviceCode }
   */
  app.post('/api/insurance/pre-authorization', requireAuth, async (req, res) => {
    try {
      const { appointmentId, serviceCode } = req.body;

      if (!appointmentId || !serviceCode) {
        return res.status(400).json({ error: 'appointmentId and serviceCode are required' });
      }

      // Get appointment data
      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Request pre-authorization
      const preAuth = await insuranceService.requestPreAuthorization(appointment, serviceCode);

      // Save pre-authorization to appointment
      db.updateAppointment(appointmentId, {
        preAuthorization: preAuth,
        preAuthDate: new Date().toISOString()
      });

      res.json({
        success: true,
        preAuthorization: preAuth
      });

    } catch (error) {
      console.error('Error requesting pre-authorization:', error);
      res.status(500).json({ error: 'Failed to request pre-authorization' });
    }
  });

  /**
   * POST /api/insurance/submit-claim
   * Submit insurance claim
   * Body: { appointmentId, diagnosisCodes, procedureCodes, charges }
   */
  app.post('/api/insurance/submit-claim', requireAuth, async (req, res) => {
    try {
      const { appointmentId, diagnosisCodes, procedureCodes, charges } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ error: 'appointmentId is required' });
      }

      // Get appointment data
      const appointment = db.getAppointmentById(appointmentId);

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // Get patient data
      const patient = db.getPatientById(appointment.patientId);

      if (!patient || !patient.insuranceProvider) {
        return res.status(400).json({ error: 'Patient does not have insurance information on file' });
      }

      // Submit claim
      const claimData = {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentDate: appointment.date,
        diagnosisCodes: diagnosisCodes || [],
        procedureCodes: procedureCodes || ['G0071'], // Default telemedicine code
        charges: charges || { consultation: 150 }
      };

      const claim = await insuranceService.submitClaim(claimData);

      // Save claim to appointment
      db.updateAppointment(appointmentId, {
        claim: claim,
        claimSubmittedDate: new Date().toISOString()
      });

      res.json({
        success: true,
        claim
      });

    } catch (error) {
      console.error('Error submitting claim:', error);
      res.status(500).json({ error: 'Failed to submit insurance claim' });
    }
  });

  /**
   * GET /api/insurance/claim-status/:claimId
   * Check status of submitted claim
   */
  app.get('/api/insurance/claim-status/:claimId', requireAuth, async (req, res) => {
    try {
      const { claimId } = req.params;

      if (!claimId) {
        return res.status(400).json({ error: 'claimId is required' });
      }

      const claimStatus = await insuranceService.checkClaimStatus(claimId);

      res.json({
        success: true,
        claimStatus
      });

    } catch (error) {
      console.error('Error checking claim status:', error);
      res.status(500).json({ error: 'Failed to check claim status' });
    }
  });

  /**
   * POST /api/insurance/calculate-cost
   * Calculate patient responsibility for a service
   * Body: { patientId, serviceCharge }
   */
  app.post('/api/insurance/calculate-cost', requireAuth, async (req, res) => {
    try {
      const { patientId, serviceCharge } = req.body;

      if (!patientId || !serviceCharge) {
        return res.status(400).json({ error: 'patientId and serviceCharge are required' });
      }

      // Get patient data
      const patient = db.getPatientById(patientId);

      if (!patient || !patient.insuranceProvider) {
        return res.status(400).json({ error: 'Patient does not have insurance information on file' });
      }

      // Verify eligibility to get current coverage details
      const eligibility = await insuranceService.verifyEligibility(patient, patient.insuranceProvider);

      if (!eligibility.isEligible) {
        return res.status(400).json({ error: 'Patient is not eligible for coverage' });
      }

      // Calculate patient responsibility
      const costBreakdown = insuranceService.calculatePatientResponsibility(
        eligibility,
        parseFloat(serviceCharge)
      );

      res.json({
        success: true,
        costBreakdown,
        eligibility
      });

    } catch (error) {
      console.error('Error calculating patient cost:', error);
      res.status(500).json({ error: 'Failed to calculate patient cost' });
    }
  });

  /**
   * GET /api/insurance/status
   * Get insurance service status
   */
  app.get('/api/insurance/status', requireAuth, async (req, res) => {
    try {
      const status = insuranceService.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting insurance status:', error);
      res.status(500).json({ error: 'Failed to get insurance status' });
    }
  });

  console.log('✅ Insurance routes configured');
}

module.exports = { setupInsuranceRoutes };

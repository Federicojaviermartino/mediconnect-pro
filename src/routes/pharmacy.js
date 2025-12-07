/**
 * Pharmacy Integration Routes
 * Handles pharmacy network, e-prescriptions, stock checking, and order tracking
 */

const pharmacyService = require('../services/pharmacy-service');
const { requireAuth } = require('../middleware/auth');
const { validateParams, paramSchemas } = require('../middleware/validators');
const logger = require('../utils/logger');

function setupPharmacyRoutes(app, db) {
  /**
   * GET /api/pharmacy/network
   * Get list of pharmacies in the network
   * Query params: country, deliveryAvailable, service
   */
  app.get('/api/pharmacy/network', requireAuth, async (req, res) => {
    try {
      const filters = {};

      if (req.query.country) {
        filters.country = req.query.country;
      }

      if (req.query.deliveryAvailable !== undefined) {
        filters.deliveryAvailable = req.query.deliveryAvailable === 'true';
      }

      if (req.query.service) {
        filters.service = req.query.service;
      }

      const pharmacies = pharmacyService.getPharmacyNetwork(filters);

      res.json({
        success: true,
        count: pharmacies.length,
        pharmacies
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Fetch pharmacy network' });
      res.status(500).json({ error: 'Failed to fetch pharmacy network' });
    }
  });

  /**
   * GET /api/pharmacy/status
   * Get pharmacy service status
   * Note: This route must be defined BEFORE /api/pharmacy/:pharmacyId
   */
  app.get('/api/pharmacy/status', requireAuth, async (req, res) => {
    try {
      const status = pharmacyService.getStatus();
      res.json(status);
    } catch (error) {
      logger.logApiError(error, req, { context: 'Get pharmacy status' });
      res.status(500).json({ error: 'Failed to get pharmacy status' });
    }
  });

  /**
   * GET /api/pharmacy/:pharmacyId
   * Get details of a specific pharmacy
   */
  app.get('/api/pharmacy/:pharmacyId', requireAuth, validateParams(paramSchemas.pharmacyId), async (req, res) => {
    try {
      const { pharmacyId } = req.params;

      const pharmacy = pharmacyService.getPharmacyById(pharmacyId);

      if (!pharmacy) {
        return res.status(404).json({ error: 'Pharmacy not found' });
      }

      res.json({
        success: true,
        pharmacy
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Fetch pharmacy' });
      res.status(500).json({ error: 'Failed to fetch pharmacy details' });
    }
  });

  /**
   * POST /api/pharmacy/check-stock
   * Check medication stock availability
   * Body: { medicationId, pharmacyId }
   */
  app.post('/api/pharmacy/check-stock', requireAuth, async (req, res) => {
    try {
      const { medicationId, pharmacyId } = req.body;

      if (!medicationId || !pharmacyId) {
        return res.status(400).json({
          error: 'medicationId and pharmacyId are required'
        });
      }

      const stockInfo = await pharmacyService.checkMedicationStock(
        medicationId,
        pharmacyId
      );

      res.json({
        success: true,
        stock: stockInfo
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Check medication stock' });
      res.status(500).json({ error: error.message || 'Failed to check medication stock' });
    }
  });

  /**
   * POST /api/pharmacy/send-prescription
   * Send e-prescription to pharmacy
   * Body: { prescriptionId, pharmacyId, deliveryRequested, deliveryAddress }
   */
  app.post('/api/pharmacy/send-prescription', requireAuth, async (req, res) => {
    try {
      const { prescriptionId, pharmacyId, deliveryRequested, deliveryAddress } = req.body;

      if (!prescriptionId || !pharmacyId) {
        return res.status(400).json({
          error: 'prescriptionId and pharmacyId are required'
        });
      }

      // Get prescription from database
      const prescription = db.getPrescriptionById(parseInt(prescriptionId));

      if (!prescription) {
        return res.status(404).json({ error: 'Prescription not found' });
      }

      // Check if user has permission to send this prescription
      const user = req.session.user;
      if (user.role === 'patient' && prescription.patient_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized access to prescription' });
      }

      if (user.role === 'doctor' && prescription.doctor_id !== user.id) {
        return res.status(403).json({ error: 'Unauthorized access to prescription' });
      }

      // Prepare prescription data
      const prescriptionData = {
        prescriptionId: prescription.id,
        patientId: prescription.patient_id,
        doctorId: prescription.doctor_id,
        medicationId: prescription.medication_id || 'amoxicillin-500mg', // Default for demo
        medication: prescription.medication,
        dosage: prescription.dosage,
        quantity: prescription.quantity || 30,
        instructions: prescription.instructions,
        deliveryRequested: deliveryRequested || false,
        deliveryAddress: deliveryAddress || null
      };

      // Send e-prescription
      const result = await pharmacyService.sendEPrescription(
        prescriptionData,
        pharmacyId
      );

      if (result.success) {
        // Save order info to prescription
        db.updatePrescription(prescriptionId, {
          pharmacyId: pharmacyId,
          orderId: result.order.orderId,
          orderStatus: 'received',
          sentToPharmacyAt: new Date().toISOString()
        });
      }

      res.json(result);
    } catch (error) {
      logger.logApiError(error, req, { context: 'Send e-prescription' });
      res.status(500).json({ error: error.message || 'Failed to send e-prescription' });
    }
  });

  /**
   * GET /api/pharmacy/track-order/:orderId
   * Track prescription order status
   */
  app.get('/api/pharmacy/track-order/:orderId', requireAuth, validateParams(paramSchemas.orderId), async (req, res) => {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({ error: 'orderId is required' });
      }

      const tracking = await pharmacyService.trackOrder(orderId);

      res.json({
        success: true,
        tracking
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Track order' });
      res.status(500).json({ error: 'Failed to track order' });
    }
  });

  /**
   * POST /api/pharmacy/calculate-cost
   * Calculate prescription cost with insurance
   * Body: { medicationId, quantity, insuranceCoverage }
   */
  app.post('/api/pharmacy/calculate-cost', requireAuth, async (req, res) => {
    try {
      const { medicationId, quantity, insuranceCoverage } = req.body;

      if (!medicationId || !quantity) {
        return res.status(400).json({
          error: 'medicationId and quantity are required'
        });
      }

      const costBreakdown = pharmacyService.calculatePrescriptionCost(
        medicationId,
        parseInt(quantity),
        insuranceCoverage
      );

      res.json({
        success: true,
        cost: costBreakdown
      });
    } catch (error) {
      logger.logApiError(error, req, { context: 'Calculate prescription cost' });
      res.status(500).json({ error: error.message || 'Failed to calculate cost' });
    }
  });

  logger.info('Pharmacy routes configured');
}

module.exports = { setupPharmacyRoutes };

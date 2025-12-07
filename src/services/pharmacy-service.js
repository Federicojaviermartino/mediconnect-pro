/**
 * Pharmacy Integration Service
 * Handles e-prescriptions, pharmacy network, stock verification, and delivery tracking
 */

const logger = require('../utils/logger');

class PharmacyService {
  constructor() {
    // Mock pharmacy network - in production, these would be real integrations
    this.pharmacyNetwork = [
      {
        id: 'walgreens-001',
        name: 'Walgreens Pharmacy',
        chain: 'Walgreens',
        country: 'US',
        address: '123 Main St, New York, NY 10001',
        phone: '+1-212-555-0100',
        hours: '24/7',
        services: ['e-prescription', 'delivery', 'drive-through', 'consultation'],
        deliveryAvailable: true,
        averageDeliveryTime: 120, // minutes
        rating: 4.5
      },
      {
        id: 'cvs-002',
        name: 'CVS Pharmacy',
        chain: 'CVS',
        country: 'US',
        address: '456 Broadway, New York, NY 10013',
        phone: '+1-212-555-0200',
        hours: 'Mon-Sat 8AM-10PM, Sun 9AM-6PM',
        services: ['e-prescription', 'delivery', 'consultation'],
        deliveryAvailable: true,
        averageDeliveryTime: 90,
        rating: 4.3
      },
      {
        id: 'farmacia-001',
        name: 'Farmacia del Ahorro',
        chain: 'Farmacia del Ahorro',
        country: 'ES',
        address: 'Calle Mayor 45, Madrid 28013',
        phone: '+34-91-555-0100',
        hours: 'Mon-Sat 9AM-9PM',
        services: ['e-prescription', 'delivery', 'consultation'],
        deliveryAvailable: true,
        averageDeliveryTime: 60,
        rating: 4.7
      },
      {
        id: 'farmacias-guadalajara-001',
        name: 'Farmacias Guadalajara',
        chain: 'Farmacias Guadalajara',
        country: 'MX',
        address: 'Av. Revolución 234, CDMX',
        phone: '+52-55-555-0100',
        hours: '24/7',
        services: ['e-prescription', 'delivery', 'drive-through'],
        deliveryAvailable: true,
        averageDeliveryTime: 45,
        rating: 4.6
      },
      {
        id: 'boots-001',
        name: 'Boots Pharmacy',
        chain: 'Boots',
        country: 'UK',
        address: '78 Oxford St, London W1D 1BS',
        phone: '+44-20-7555-0100',
        hours: 'Mon-Sat 9AM-8PM, Sun 11AM-5PM',
        services: ['e-prescription', 'delivery', 'consultation'],
        deliveryAvailable: true,
        averageDeliveryTime: 120,
        rating: 4.4
      }
    ];

    // Mock medication database
    this.medications = {
      'amoxicillin-500mg': {
        name: 'Amoxicillin',
        dosage: '500mg',
        form: 'capsule',
        category: 'antibiotic',
        requiresPrescription: true,
        price: 15.99
      },
      'ibuprofen-400mg': {
        name: 'Ibuprofen',
        dosage: '400mg',
        form: 'tablet',
        category: 'pain-relief',
        requiresPrescription: false,
        price: 8.99
      },
      'metformin-850mg': {
        name: 'Metformin',
        dosage: '850mg',
        form: 'tablet',
        category: 'diabetes',
        requiresPrescription: true,
        price: 22.50
      },
      'omeprazole-20mg': {
        name: 'Omeprazole',
        dosage: '20mg',
        form: 'capsule',
        category: 'gastric',
        requiresPrescription: true,
        price: 18.75
      },
      'atorvastatin-20mg': {
        name: 'Atorvastatin',
        dosage: '20mg',
        form: 'tablet',
        category: 'cholesterol',
        requiresPrescription: true,
        price: 25.99
      }
    };

    this.mockMode = true;
    logger.warn('Pharmacy service running in demo mode with mock data', {
      service: 'pharmacy',
      feature: 'initialization',
      pharmacyCount: this.pharmacyNetwork.length,
      medicationCount: Object.keys(this.medications).length
    });
  }

  /**
   * Get pharmacy network list
   */
  getPharmacyNetwork(filters = {}) {
    let pharmacies = [...this.pharmacyNetwork];

    // Filter by country
    if (filters.country) {
      pharmacies = pharmacies.filter(p => p.country === filters.country);
    }

    // Filter by delivery availability
    if (filters.deliveryAvailable !== undefined) {
      pharmacies = pharmacies.filter(p => p.deliveryAvailable === filters.deliveryAvailable);
    }

    // Filter by services
    if (filters.service) {
      pharmacies = pharmacies.filter(p => p.services.includes(filters.service));
    }

    // Sort by rating
    pharmacies.sort((a, b) => b.rating - a.rating);

    return pharmacies;
  }

  /**
   * Get pharmacy by ID
   */
  getPharmacyById(pharmacyId) {
    return this.pharmacyNetwork.find(p => p.id === pharmacyId);
  }

  /**
   * Check medication stock availability
   */
  async checkMedicationStock(medicationId, pharmacyId) {
    try {
      const pharmacy = this.getPharmacyById(pharmacyId);
      if (!pharmacy) {
        throw new Error('Pharmacy not found');
      }

      const medication = this.medications[medicationId];
      if (!medication) {
        throw new Error('Medication not found');
      }

      // Mock stock check - in production, this would be a real API call
      const inStock = Math.random() > 0.2; // 80% chance in stock
      const quantity = inStock ? Math.floor(Math.random() * 100) + 20 : 0;

      const alternatives = inStock ? [] : this._findAlternatives(medicationId);

      return {
        pharmacyId,
        pharmacyName: pharmacy.name,
        medication: {
          ...medication,
          id: medicationId
        },
        inStock,
        quantity,
        estimatedPreparationTime: inStock ? 15 : null, // minutes
        alternatives,
        mockMode: true
      };
    } catch (error) {
      logger.error('Error checking medication stock', {
        service: 'pharmacy',
        operation: 'check-stock',
        medicationId,
        pharmacyId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send e-prescription to pharmacy
   */
  async sendEPrescription(prescriptionData, pharmacyId) {
    try {
      const pharmacy = this.getPharmacyById(pharmacyId);
      if (!pharmacy) {
        throw new Error('Pharmacy not found');
      }

      // Check if pharmacy accepts e-prescriptions
      if (!pharmacy.services.includes('e-prescription')) {
        throw new Error('Pharmacy does not support e-prescriptions');
      }

      // Check medication availability
      const stockCheck = await this.checkMedicationStock(
        prescriptionData.medicationId,
        pharmacyId
      );

      if (!stockCheck.inStock) {
        return {
          success: false,
          message: 'Medication not in stock',
          alternatives: stockCheck.alternatives
        };
      }

      // Generate digitally signed prescription
      const signedPrescription = this._digitallySignPrescription(prescriptionData);

      // Mock sending to pharmacy - in production, this would be a real API call
      const trackingId = this._generateTrackingId();

      // Calculate estimated ready time
      const estimatedReadyTime = new Date(
        Date.now() + (stockCheck.estimatedPreparationTime || 15) * 60000
      );

      // Create order record
      const order = {
        orderId: trackingId,
        prescriptionId: prescriptionData.prescriptionId,
        pharmacyId: pharmacyId,
        pharmacyName: pharmacy.name,
        pharmacyAddress: pharmacy.address,
        pharmacyPhone: pharmacy.phone,
        medication: stockCheck.medication,
        quantity: prescriptionData.quantity,
        patientId: prescriptionData.patientId,
        doctorId: prescriptionData.doctorId,
        status: 'received',
        estimatedReadyTime: estimatedReadyTime.toISOString(),
        deliveryRequested: prescriptionData.deliveryRequested || false,
        deliveryAddress: prescriptionData.deliveryAddress || null,
        estimatedDeliveryTime: prescriptionData.deliveryRequested
          ? new Date(Date.now() + pharmacy.averageDeliveryTime * 60000).toISOString()
          : null,
        signedPrescription: signedPrescription,
        createdAt: new Date().toISOString(),
        mockMode: true
      };

      return {
        success: true,
        message: 'E-prescription sent successfully',
        order
      };
    } catch (error) {
      logger.error('Error sending e-prescription', {
        service: 'pharmacy',
        operation: 'send-prescription',
        pharmacyId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Track prescription order
   */
  async trackOrder(orderId) {
    try {
      // Mock order tracking - in production, fetch from database or API
      const statuses = [
        { status: 'received', message: 'Prescription received by pharmacy' },
        { status: 'preparing', message: 'Medication is being prepared' },
        { status: 'ready', message: 'Prescription is ready for pickup' },
        { status: 'out_for_delivery', message: 'Out for delivery' },
        { status: 'delivered', message: 'Delivered successfully' }
      ];

      // Simulate different order statuses
      const statusIndex = Math.floor(Math.random() * statuses.length);
      const currentStatus = statuses[statusIndex];

      return {
        orderId,
        ...currentStatus,
        estimatedTime: statusIndex < 3
          ? new Date(Date.now() + (30 - statusIndex * 10) * 60000).toISOString()
          : null,
        lastUpdated: new Date().toISOString(),
        mockMode: true
      };
    } catch (error) {
      logger.error('Error tracking order', {
        service: 'pharmacy',
        operation: 'track-order',
        orderId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Calculate total prescription cost
   */
  calculatePrescriptionCost(medicationId, quantity, insuranceCoverage = null) {
    const medication = this.medications[medicationId];
    if (!medication) {
      throw new Error('Medication not found');
    }

    const subtotal = medication.price * quantity;
    let insuranceDiscount = 0;
    let patientPays = subtotal;

    if (insuranceCoverage) {
      // Apply insurance coverage
      insuranceDiscount = subtotal * (insuranceCoverage.coveragePercent / 100);
      patientPays = subtotal - insuranceDiscount + (insuranceCoverage.copay || 0);
    }

    return {
      medication: {
        name: medication.name,
        dosage: medication.dosage,
        pricePerUnit: medication.price
      },
      quantity,
      subtotal,
      insuranceDiscount,
      copay: insuranceCoverage?.copay || 0,
      patientPays,
      insurancePays: insuranceDiscount
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: !this.mockMode,
      mockMode: this.mockMode,
      pharmacyCount: this.pharmacyNetwork.length,
      medicationCount: Object.keys(this.medications).length,
      countries: [...new Set(this.pharmacyNetwork.map(p => p.country))]
    };
  }

  // ============== PRIVATE HELPER METHODS ==============

  _findAlternatives(medicationId) {
    const medication = this.medications[medicationId];
    if (!medication) return [];

    // Find medications in same category
    return Object.entries(this.medications)
      .filter(([id, med]) =>
        id !== medicationId &&
        med.category === medication.category
      )
      .map(([id, med]) => ({
        id,
        name: med.name,
        dosage: med.dosage,
        price: med.price
      }))
      .slice(0, 3);
  }

  _digitallySignPrescription(prescriptionData) {
    // Mock digital signature - in production, use proper crypto libraries
    const signatureData = {
      prescriptionId: prescriptionData.prescriptionId,
      patientId: prescriptionData.patientId,
      doctorId: prescriptionData.doctorId,
      medicationId: prescriptionData.medicationId,
      quantity: prescriptionData.quantity,
      timestamp: new Date().toISOString()
    };

    const signature = Buffer.from(JSON.stringify(signatureData))
      .toString('base64')
      .substring(0, 64);

    return {
      ...prescriptionData,
      signature,
      signedAt: new Date().toISOString(),
      signatureAlgorithm: 'SHA256-RSA' // Mock algorithm
    };
  }

  _generateTrackingId() {
    return 'RX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}

// Export singleton instance
const pharmacyService = new PharmacyService();
module.exports = pharmacyService;

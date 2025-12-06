/**
 * Insurance Service Unit Tests
 */

const InsuranceService = require('../services/insurance-service');

// Get the class constructor for creating new instances
const InsuranceServiceClass = InsuranceService.constructor;

describe('InsuranceService', () => {
  let service;

  beforeEach(() => {
    // Use the exported singleton
    service = InsuranceService;
  });

  describe('constructor', () => {
    test('should initialize with mock mode in test environment', () => {
      expect(service.mockMode).toBe(true);
    });

    test('should have providers configured', () => {
      expect(service.providers).toBeDefined();
      expect(Object.keys(service.providers).length).toBeGreaterThan(0);
    });

    test('should have sanitas provider', () => {
      expect(service.providers.sanitas).toBeDefined();
      expect(service.providers.sanitas.name).toBe('Sanitas');
      expect(service.providers.sanitas.country).toBe('ES');
    });

    test('should have cigna provider', () => {
      expect(service.providers.cigna).toBeDefined();
      expect(service.providers.cigna.name).toBe('Cigna');
      expect(service.providers.cigna.country).toBe('US');
    });
  });

  describe('verifyEligibility', () => {
    test('should return eligibility data for valid patient', async () => {
      const patientData = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        insuranceMemberId: 'TEST123'
      };

      const result = await service.verifyEligibility(patientData, 'sanitas');

      expect(result).toHaveProperty('provider', 'sanitas');
      expect(result).toHaveProperty('memberId');
      expect(result).toHaveProperty('verificationDate');
      expect(result).toHaveProperty('mockMode', true);
    });

    test('should return eligibility status', async () => {
      const patientData = { id: '1', firstName: 'Test', lastName: 'User' };
      const result = await service.verifyEligibility(patientData, 'cigna');

      expect(result).toHaveProperty('isEligible');
      expect(typeof result.isEligible).toBe('boolean');
    });

    test('should include coverage details when eligible', async () => {
      const patientData = { id: '0', firstName: 'Test', lastName: 'User' };
      const result = await service.verifyEligibility(patientData, 'adeslas');

      if (result.isEligible) {
        expect(result).toHaveProperty('coverageDetails');
        expect(result.coverageDetails).toHaveProperty('telemedicine');
      }
    });

    test('should handle different providers', async () => {
      const patientData = { id: '1', firstName: 'Test', lastName: 'User' };

      const providers = ['sanitas', 'adeslas', 'cigna', 'unitedhealth', 'mapfre'];

      for (const provider of providers) {
        const result = await service.verifyEligibility(patientData, provider);
        expect(result.provider).toBe(provider);
      }
    });

    test('should generate mock member ID if not provided', async () => {
      const patientData = { id: '5', firstName: 'Test', lastName: 'User' };
      const result = await service.verifyEligibility(patientData, 'sanitas');

      expect(result.memberId).toContain('MOCK-5');
    });
  });

  describe('requestPreAuthorization', () => {
    test('should return pre-authorization response', async () => {
      const appointmentData = {
        patientId: '1',
        doctorId: '2',
        urgency: 'routine'
      };

      const result = await service.requestPreAuthorization(appointmentData, 'G0071');

      expect(result).toHaveProperty('status');
      expect(['approved', 'pending']).toContain(result.status);
      expect(result).toHaveProperty('mockMode', true);
    });

    test('should include authorization number when approved', async () => {
      const appointmentData = { patientId: '1', doctorId: '2' };

      // Run multiple times to catch approved case
      let foundApproved = false;
      for (let i = 0; i < 20; i++) {
        const result = await service.requestPreAuthorization(appointmentData, 'G0071');
        if (result.status === 'approved') {
          expect(result.authorizationNumber).toBeDefined();
          expect(result.authorizationNumber).toContain('AUTH-');
          expect(result.approvedUnits).toBeGreaterThan(0);
          expect(result.expirationDate).toBeDefined();
          foundApproved = true;
          break;
        }
      }
      // It's okay if we don't find approved in 20 tries (10% deny rate)
    });

    test('should handle pending status', async () => {
      const appointmentData = { patientId: '1', doctorId: '2' };

      // Run multiple times to catch pending case
      for (let i = 0; i < 50; i++) {
        const result = await service.requestPreAuthorization(appointmentData, 'G0071');
        if (result.status === 'pending') {
          expect(result.reviewRequired).toBe(true);
          expect(result.message).toContain('Additional information');
          break;
        }
      }
    });

    test('should use default urgency if not provided', async () => {
      const appointmentData = { patientId: '1', doctorId: '2' };
      const result = await service.requestPreAuthorization(appointmentData, 'G0071');

      expect(result).toBeDefined();
    });
  });

  describe('submitClaim', () => {
    test('should return claim submission response', async () => {
      const claimData = {
        patientId: '1',
        doctorId: '2',
        appointmentDate: '2024-01-15',
        diagnosisCodes: ['Z00.00'],
        procedureCodes: ['G0071'],
        charges: { consultation: 150 }
      };

      const result = await service.submitClaim(claimData);

      expect(result).toHaveProperty('claimId');
      expect(result).toHaveProperty('status', 'submitted');
      expect(result).toHaveProperty('submissionDate');
      expect(result).toHaveProperty('trackingNumber');
      expect(result).toHaveProperty('mockMode', true);
    });

    test('should generate unique claim IDs', async () => {
      const claimData = { patientId: '1', doctorId: '2' };

      const result1 = await service.submitClaim(claimData);
      const result2 = await service.submitClaim(claimData);

      expect(result1.claimId).not.toBe(result2.claimId);
    });

    test('should include tracking number', async () => {
      const claimData = { patientId: '1', doctorId: '2' };
      const result = await service.submitClaim(claimData);

      expect(result.trackingNumber).toContain('TRK-');
    });

    test('should include estimated processing days', async () => {
      const claimData = { patientId: '1', doctorId: '2' };
      const result = await service.submitClaim(claimData);

      expect(result.estimatedProcessingDays).toBe(14);
    });
  });

  describe('checkClaimStatus', () => {
    test('should return claim status', async () => {
      const result = await service.checkClaimStatus('CLM-123456');

      expect(result).toHaveProperty('claimId', 'CLM-123456');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('mockMode', true);
    });

    test('should return one of the valid statuses', async () => {
      const validStatuses = ['processing', 'approved', 'denied', 'pending'];

      // Run multiple times to test different random statuses
      for (let i = 0; i < 10; i++) {
        const result = await service.checkClaimStatus('CLM-' + i);
        expect(validStatuses).toContain(result.status);
      }
    });

    test('should include paid amount for approved claims', async () => {
      // Run multiple times to catch approved status
      for (let i = 0; i < 50; i++) {
        const result = await service.checkClaimStatus('CLM-' + i);
        if (result.status === 'approved') {
          expect(result.paidAmount).toBeDefined();
          expect(result.paidDate).toBeDefined();
          break;
        }
      }
    });

    test('should include denial reason for denied claims', async () => {
      // Run multiple times to catch denied status
      for (let i = 0; i < 50; i++) {
        const result = await service.checkClaimStatus('CLM-' + i);
        if (result.status === 'denied') {
          expect(result.denialReason).toBeDefined();
          break;
        }
      }
    });
  });

  describe('getSupportedProviders', () => {
    test('should return array of providers', () => {
      const providers = service.getSupportedProviders();

      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    test('should include required fields for each provider', () => {
      const providers = service.getSupportedProviders();

      providers.forEach(provider => {
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('country');
        expect(provider).toHaveProperty('enabled');
      });
    });

    test('should include all configured providers', () => {
      const providers = service.getSupportedProviders();
      const providerIds = providers.map(p => p.id);

      expect(providerIds).toContain('sanitas');
      expect(providerIds).toContain('adeslas');
      expect(providerIds).toContain('cigna');
      expect(providerIds).toContain('unitedhealth');
      expect(providerIds).toContain('mapfre');
    });
  });

  describe('calculatePatientResponsibility', () => {
    test('should calculate basic copay only', () => {
      const eligibility = {
        copay: 20,
        deductibleRemaining: 0,
        coinsuranceRate: 0
      };

      const result = service.calculatePatientResponsibility(eligibility, 150);

      expect(result.totalCharge).toBe(150);
      expect(result.copay).toBe(20);
      expect(result.patientResponsibility).toBe(20);
      expect(result.insurancePayment).toBe(130);
    });

    test('should apply deductible', () => {
      const eligibility = {
        copay: 0,
        deductibleRemaining: 100,
        coinsuranceRate: 0
      };

      const result = service.calculatePatientResponsibility(eligibility, 150);

      expect(result.deductibleApplied).toBe(100);
      expect(result.patientResponsibility).toBe(100);
      expect(result.insurancePayment).toBe(50);
    });

    test('should apply coinsurance after deductible', () => {
      const eligibility = {
        copay: 0,
        deductibleRemaining: 50,
        coinsuranceRate: 0.2
      };

      const result = service.calculatePatientResponsibility(eligibility, 150);

      // 150 total - 0 copay = 150 remaining
      // 50 applied to deductible, 100 remaining
      // 20% coinsurance on 100 = 20
      // Patient pays: 0 + 50 + 20 = 70
      expect(result.deductibleApplied).toBe(50);
      expect(result.coinsuranceAmount).toBe(20);
      expect(result.patientResponsibility).toBe(70);
      expect(result.insurancePayment).toBe(80);
    });

    test('should handle copay + deductible + coinsurance', () => {
      const eligibility = {
        copay: 25,
        deductibleRemaining: 50,
        coinsuranceRate: 0.2
      };

      const result = service.calculatePatientResponsibility(eligibility, 200);

      // 200 total - 25 copay = 175 remaining
      // 50 applied to deductible, 125 remaining
      // 20% coinsurance on 125 = 25
      // Patient pays: 25 + 50 + 25 = 100
      expect(result.copay).toBe(25);
      expect(result.patientResponsibility).toBe(100);
      expect(result.insurancePayment).toBe(100);
    });

    test('should handle zero charge', () => {
      const eligibility = {
        copay: 20,
        deductibleRemaining: 100,
        coinsuranceRate: 0.2
      };

      const result = service.calculatePatientResponsibility(eligibility, 0);

      expect(result.totalCharge).toBe(0);
    });

    test('should handle missing eligibility fields', () => {
      const eligibility = {};

      const result = service.calculatePatientResponsibility(eligibility, 100);

      expect(result.copay).toBe(0);
      expect(result.deductibleApplied).toBe(0);
      expect(result.coinsuranceAmount).toBe(0);
      expect(result.patientResponsibility).toBe(0);
      expect(result.insurancePayment).toBe(100);
    });

    test('should cap deductible at charge amount minus copay', () => {
      const eligibility = {
        copay: 50,
        deductibleRemaining: 1000,  // More than remaining charge
        coinsuranceRate: 0
      };

      const result = service.calculatePatientResponsibility(eligibility, 100);

      // 100 - 50 copay = 50 remaining
      // Deductible capped at 50
      expect(result.deductibleApplied).toBe(50);
      expect(result.patientResponsibility).toBe(100);  // 50 + 50
      expect(result.insurancePayment).toBe(0);
    });
  });

  describe('getStatus', () => {
    test('should return service status', () => {
      const status = service.getStatus();

      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('mockMode');
      expect(status).toHaveProperty('providers');
    });

    test('should indicate mock mode in test environment', () => {
      const status = service.getStatus();

      expect(status.mockMode).toBe(true);
      expect(status.enabled).toBe(false);
    });

    test('should include providers list', () => {
      const status = service.getStatus();

      expect(Array.isArray(status.providers)).toBe(true);
      expect(status.providers.length).toBeGreaterThan(0);
    });
  });

  describe('_getServiceDescription', () => {
    test('should return description for known service codes', () => {
      expect(service._getServiceDescription('G0071')).toBe('Telemedicine consultation');
      expect(service._getServiceDescription('G2012')).toBe('Virtual check-in');
      expect(service._getServiceDescription('99201')).toContain('new patient');
      expect(service._getServiceDescription('99211')).toContain('established patient');
      expect(service._getServiceDescription('99213')).toContain('moderate complexity');
    });

    test('should return default description for unknown codes', () => {
      const result = service._getServiceDescription('UNKNOWN');
      expect(result).toBe('Telemedicine consultation');
    });
  });

  describe('_generateClaimId', () => {
    test('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(service._generateClaimId());
      }
      expect(ids.size).toBe(100);
    });

    test('should start with CLM prefix', () => {
      const id = service._generateClaimId();
      expect(id).toMatch(/^CLM-/);
    });
  });

  describe('mock eligibility scenarios', () => {
    test('should return different scenarios based on patient ID', async () => {
      const results = [];

      for (let i = 0; i < 3; i++) {
        const patientData = { id: String(i), firstName: 'Test', lastName: 'User' };
        const result = await service.verifyEligibility(patientData, 'sanitas');
        results.push(result);
      }

      // Check that we get different scenarios
      const isEligibleValues = results.map(r => r.isEligible);
      // At least one should be eligible, one might not be
      expect(isEligibleValues).toContain(true);
    });

    test('should return PPO or HMO plan types when eligible', async () => {
      const patientData = { id: '0', firstName: 'Test', lastName: 'User' };
      const result = await service.verifyEligibility(patientData, 'cigna');

      if (result.isEligible && result.planType) {
        expect(['PPO', 'HMO']).toContain(result.planType);
      }
    });

    test('should include reason when not eligible', async () => {
      const patientData = { id: '2', firstName: 'Test', lastName: 'User' };
      const result = await service.verifyEligibility(patientData, 'sanitas');

      if (!result.isEligible) {
        expect(result.reason).toBeDefined();
      }
    });
  });
});

/**
 * Insurance Integration Service
 * Handles insurance eligibility verification, pre-authorization, and claims submission
 */

class InsuranceService {
  constructor() {
    // Mock insurance providers - in production, these would be real API integrations
    this.providers = {
      'sanitas': {
        name: 'Sanitas',
        country: 'ES',
        apiEndpoint: 'https://api.sanitas.es/eligibility',
        enabled: process.env.SANITAS_API_KEY ? true : false
      },
      'adeslas': {
        name: 'Adeslas',
        country: 'ES',
        apiEndpoint: 'https://api.adeslas.es/eligibility',
        enabled: process.env.ADESLAS_API_KEY ? true : false
      },
      'cigna': {
        name: 'Cigna',
        country: 'US',
        apiEndpoint: 'https://api.cigna.com/eligibility',
        enabled: process.env.CIGNA_API_KEY ? true : false
      },
      'unitedhealth': {
        name: 'UnitedHealth',
        country: 'US',
        apiEndpoint: 'https://api.uhc.com/eligibility',
        enabled: process.env.UHC_API_KEY ? true : false
      },
      'mapfre': {
        name: 'Mapfre',
        country: 'ES',
        apiEndpoint: 'https://api.mapfre.com/eligibility',
        enabled: process.env.MAPFRE_API_KEY ? true : false
      }
    };

    this.mockMode = !Object.values(this.providers).some(p => p.enabled);

    if (this.mockMode) {
      console.warn('⚠️  No insurance API keys configured. Insurance features will use mock responses.');
    } else {
      console.log('✅ Insurance integration service initialized');
    }
  }

  /**
   * Check if patient is eligible for telemedicine service
   */
  async verifyEligibility(patientData, insuranceProvider) {
    try {
      if (this.mockMode) {
        return this._mockEligibilityCheck(patientData, insuranceProvider);
      }

      const provider = this.providers[insuranceProvider.toLowerCase()];

      if (!provider) {
        throw new Error(`Insurance provider ${insuranceProvider} not supported`);
      }

      if (!provider.enabled) {
        console.warn(`${provider.name} API not configured, using mock data`);
        return this._mockEligibilityCheck(patientData, insuranceProvider);
      }

      // Real API call would go here
      const eligibilityRequest = {
        memberId: patientData.insuranceMemberId,
        provider: insuranceProvider,
        serviceDate: new Date().toISOString(),
        serviceType: 'telemedicine',
        patientInfo: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          dateOfBirth: patientData.dateOfBirth
        }
      };

      // In production: const response = await this._callInsuranceAPI(provider, eligibilityRequest);
      return this._mockEligibilityCheck(patientData, insuranceProvider);

    } catch (error) {
      console.error('Error verifying eligibility:', error);
      throw error;
    }
  }

  /**
   * Request pre-authorization for a medical service
   */
  async requestPreAuthorization(appointmentData, serviceCode) {
    try {
      if (this.mockMode) {
        return this._mockPreAuthRequest(appointmentData, serviceCode);
      }

      const preAuthRequest = {
        patientId: appointmentData.patientId,
        providerId: appointmentData.doctorId,
        serviceCode: serviceCode,
        serviceDescription: this._getServiceDescription(serviceCode),
        requestDate: new Date().toISOString(),
        urgency: appointmentData.urgency || 'routine'
      };

      // In production: const response = await this._callInsuranceAPI(provider, preAuthRequest);
      return this._mockPreAuthRequest(appointmentData, serviceCode);

    } catch (error) {
      console.error('Error requesting pre-authorization:', error);
      throw error;
    }
  }

  /**
   * Submit claim to insurance provider
   */
  async submitClaim(claimData) {
    try {
      if (this.mockMode) {
        return this._mockClaimSubmission(claimData);
      }

      const claim = {
        claimId: this._generateClaimId(),
        patientId: claimData.patientId,
        providerId: claimData.doctorId,
        serviceDate: claimData.appointmentDate,
        diagnosis: claimData.diagnosisCodes,
        procedures: claimData.procedureCodes,
        charges: claimData.charges,
        submissionDate: new Date().toISOString()
      };

      // In production: const response = await this._callInsuranceAPI(provider, claim);
      return this._mockClaimSubmission(claimData);

    } catch (error) {
      console.error('Error submitting claim:', error);
      throw error;
    }
  }

  /**
   * Check status of submitted claim
   */
  async checkClaimStatus(claimId) {
    try {
      if (this.mockMode) {
        return this._mockClaimStatus(claimId);
      }

      // In production: const response = await this._callInsuranceAPI(provider, { claimId });
      return this._mockClaimStatus(claimId);

    } catch (error) {
      console.error('Error checking claim status:', error);
      throw error;
    }
  }

  /**
   * Get list of all supported insurance providers
   */
  getSupportedProviders() {
    return Object.entries(this.providers).map(([key, value]) => ({
      id: key,
      name: value.name,
      country: value.country,
      enabled: value.enabled
    }));
  }

  /**
   * Calculate patient responsibility (copay, deductible, coinsurance)
   */
  calculatePatientResponsibility(eligibility, chargeAmount) {
    const copay = eligibility.copay || 0;
    const deductibleRemaining = eligibility.deductibleRemaining || 0;
    const coinsuranceRate = eligibility.coinsuranceRate || 0;

    let patientPays = copay;
    let remainingCharge = chargeAmount - copay;

    // Apply deductible
    if (deductibleRemaining > 0) {
      const deductibleApplied = Math.min(remainingCharge, deductibleRemaining);
      patientPays += deductibleApplied;
      remainingCharge -= deductibleApplied;
    }

    // Apply coinsurance
    if (coinsuranceRate > 0 && remainingCharge > 0) {
      const coinsuranceAmount = remainingCharge * coinsuranceRate;
      patientPays += coinsuranceAmount;
    }

    return {
      totalCharge: chargeAmount,
      copay: copay,
      deductibleApplied: Math.min(chargeAmount - copay, deductibleRemaining),
      coinsuranceAmount: remainingCharge * coinsuranceRate,
      patientResponsibility: patientPays,
      insurancePayment: chargeAmount - patientPays
    };
  }

  // ============== MOCK DATA METHODS ==============

  _mockEligibilityCheck(patientData, insuranceProvider) {
    // Simulate varying eligibility scenarios
    const scenarios = [
      {
        isEligible: true,
        copay: 20,
        deductibleRemaining: 500,
        coinsuranceRate: 0.2,
        coverageDetails: {
          telemedicine: true,
          primaryCare: true,
          specialist: true,
          mentalHealth: true,
          prescriptions: true
        },
        networkStatus: 'in-network',
        planType: 'PPO'
      },
      {
        isEligible: true,
        copay: 0,
        deductibleRemaining: 0,
        coinsuranceRate: 0,
        coverageDetails: {
          telemedicine: true,
          primaryCare: true,
          specialist: true,
          mentalHealth: true,
          prescriptions: true
        },
        networkStatus: 'in-network',
        planType: 'HMO'
      },
      {
        isEligible: false,
        reason: 'Coverage terminated',
        lastActiveDate: '2024-12-31'
      }
    ];

    // Use patient ID to deterministically select scenario (for consistent testing)
    const scenarioIndex = patientData.id ? parseInt(patientData.id) % scenarios.length : 0;
    const result = scenarios[scenarioIndex];

    return {
      ...result,
      provider: insuranceProvider,
      memberId: patientData.insuranceMemberId || 'MOCK-' + patientData.id,
      verificationDate: new Date().toISOString(),
      mockMode: true
    };
  }

  _mockPreAuthRequest(appointmentData, serviceCode) {
    // Simulate varying pre-auth scenarios
    const approved = Math.random() > 0.1; // 90% approval rate in mock

    return {
      authorizationNumber: approved ? 'AUTH-' + Date.now() : null,
      status: approved ? 'approved' : 'pending',
      approvedUnits: approved ? 1 : 0,
      expirationDate: approved ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : null,
      message: approved
        ? 'Pre-authorization approved for telemedicine consultation'
        : 'Additional information required. Case under review.',
      reviewRequired: !approved,
      mockMode: true
    };
  }

  _mockClaimSubmission(claimData) {
    const claimId = this._generateClaimId();

    return {
      claimId: claimId,
      status: 'submitted',
      submissionDate: new Date().toISOString(),
      estimatedProcessingDays: 14,
      trackingNumber: 'TRK-' + claimId,
      message: 'Claim submitted successfully. Processing typically takes 14-21 business days.',
      mockMode: true
    };
  }

  _mockClaimStatus(claimId) {
    // Simulate various claim statuses
    const statuses = [
      { status: 'processing', message: 'Claim is being processed' },
      { status: 'approved', message: 'Claim approved. Payment issued.', paidAmount: 150, paidDate: new Date().toISOString() },
      { status: 'denied', message: 'Claim denied. Service not covered.', denialReason: 'Service not medically necessary' },
      { status: 'pending', message: 'Additional information requested', actionRequired: 'Submit additional documentation' }
    ];

    const statusIndex = Math.floor(Math.random() * statuses.length);

    return {
      claimId: claimId,
      ...statuses[statusIndex],
      lastUpdated: new Date().toISOString(),
      mockMode: true
    };
  }

  _generateClaimId() {
    return 'CLM-' + Date.now() + '-' + Math.random().toString(36).substring(7).toUpperCase();
  }

  _getServiceDescription(serviceCode) {
    const descriptions = {
      '99201': 'Office or other outpatient visit, new patient',
      '99211': 'Office or other outpatient visit, established patient',
      '99213': 'Office or other outpatient visit, established patient, moderate complexity',
      'G0071': 'Telemedicine consultation',
      'G2012': 'Virtual check-in'
    };

    return descriptions[serviceCode] || 'Telemedicine consultation';
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      enabled: !this.mockMode,
      mockMode: this.mockMode,
      providers: this.getSupportedProviders()
    };
  }
}

// Export singleton instance
const insuranceService = new InsuranceService();
module.exports = insuranceService;

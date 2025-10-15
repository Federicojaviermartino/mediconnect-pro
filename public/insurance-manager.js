/**
 * Insurance Management UI
 * Handles insurance eligibility verification, claims, and cost calculations
 */

// Global state
let insuranceProviders = [];
let currentUser = null;

// Initialize insurance manager
async function initInsuranceManager() {
  try {
    // Get current user
    const userResponse = await fetch('/api/auth/me', { credentials: 'include' });
    currentUser = await userResponse.json();

    // Load insurance providers
    await loadInsuranceProviders();

    // Load insurance status
    await loadInsuranceStatus();

    console.log('✅ Insurance Manager initialized');
  } catch (error) {
    console.error('Error initializing insurance manager:', error);
  }
}

// Load available insurance providers
async function loadInsuranceProviders() {
  try {
    const response = await fetch('/api/insurance/providers', { credentials: 'include' });
    const data = await response.json();

    insuranceProviders = data.providers;
    renderInsuranceProviders();
  } catch (error) {
    console.error('Error loading insurance providers:', error);
  }
}

// Render insurance providers list
function renderInsuranceProviders() {
  const container = document.getElementById('insurance-providers-list');
  if (!container) return;

  if (insuranceProviders.length === 0) {
    container.innerHTML = '<p class="text-muted">No insurance providers configured</p>';
    return;
  }

  container.innerHTML = insuranceProviders.map(provider => `
    <div class="insurance-provider-card ${provider.enabled ? 'enabled' : 'disabled'}">
      <div class="provider-info">
        <h4>${provider.name}</h4>
        <span class="country-badge">${provider.country}</span>
      </div>
      <div class="provider-status">
        ${provider.enabled
          ? '<span class="status-badge status-success">Enabled</span>'
          : '<span class="status-badge status-warning">Demo Mode</span>'}
      </div>
    </div>
  `).join('');
}

// Show insurance verification modal
function showInsuranceVerification(patientId) {
  const modal = document.getElementById('insurance-verification-modal');
  if (!modal) {
    console.error('Insurance verification modal not found');
    return;
  }

  // Populate providers dropdown
  const providerSelect = document.getElementById('insurance-provider-select');
  if (providerSelect) {
    providerSelect.innerHTML = insuranceProviders.map(provider => `
      <option value="${provider.id}">${provider.name} (${provider.country})</option>
    `).join('');
  }

  // Set patient ID
  document.getElementById('insurance-patient-id').value = patientId;

  // Show modal
  modal.style.display = 'block';
}

// Verify insurance eligibility
async function verifyInsuranceEligibility() {
  const patientId = document.getElementById('insurance-patient-id').value;
  const provider = document.getElementById('insurance-provider-select').value;
  const memberId = document.getElementById('insurance-member-id').value;

  if (!patientId || !provider || !memberId) {
    showNotification('Please fill in all fields', 'error');
    return;
  }

  try {
    showLoader('Verifying insurance eligibility...');

    const response = await fetch('/api/insurance/verify-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patientId: parseInt(patientId),
        insuranceProvider: provider,
        insuranceMemberId: memberId
      })
    });

    const data = await response.json();
    hideLoader();

    if (response.ok && data.success) {
      displayEligibilityResults(data.eligibility);
    } else {
      showNotification(data.error || 'Failed to verify eligibility', 'error');
    }
  } catch (error) {
    hideLoader();
    console.error('Error verifying eligibility:', error);
    showNotification('Error verifying insurance eligibility', 'error');
  }
}

// Display eligibility verification results
function displayEligibilityResults(eligibility) {
  const resultsContainer = document.getElementById('eligibility-results');
  if (!resultsContainer) return;

  const isEligible = eligibility.isEligible;

  resultsContainer.innerHTML = `
    <div class="eligibility-result ${isEligible ? 'eligible' : 'not-eligible'}">
      <h3>${isEligible ? '✅ Patient is Eligible' : '❌ Patient is Not Eligible'}</h3>

      ${isEligible ? `
        <div class="coverage-details">
          <h4>Coverage Details:</h4>
          <ul>
            <li><strong>Plan Type:</strong> ${eligibility.planType || 'N/A'}</li>
            <li><strong>Network Status:</strong> ${eligibility.networkStatus || 'N/A'}</li>
            <li><strong>Copay:</strong> $${eligibility.copay || 0}</li>
            <li><strong>Deductible Remaining:</strong> $${eligibility.deductibleRemaining || 0}</li>
            <li><strong>Coinsurance Rate:</strong> ${(eligibility.coinsuranceRate * 100) || 0}%</li>
          </ul>

          <h4>Covered Services:</h4>
          <ul>
            ${eligibility.coverageDetails.telemedicine ? '<li>✅ Telemedicine</li>' : '<li>❌ Telemedicine</li>'}
            ${eligibility.coverageDetails.primaryCare ? '<li>✅ Primary Care</li>' : '<li>❌ Primary Care</li>'}
            ${eligibility.coverageDetails.specialist ? '<li>✅ Specialist</li>' : '<li>❌ Specialist</li>'}
            ${eligibility.coverageDetails.mentalHealth ? '<li>✅ Mental Health</li>' : '<li>❌ Mental Health</li>'}
            ${eligibility.coverageDetails.prescriptions ? '<li>✅ Prescriptions</li>' : '<li>❌ Prescriptions</li>'}
          </ul>

          ${eligibility.mockMode ? '<p class="mock-mode-notice">⚠️ Demo Mode: Using simulated data</p>' : ''}
        </div>
      ` : `
        <div class="not-eligible-details">
          <p><strong>Reason:</strong> ${eligibility.reason || 'Unknown'}</p>
          ${eligibility.lastActiveDate ? `<p><strong>Last Active:</strong> ${eligibility.lastActiveDate}</p>` : ''}
        </div>
      `}

      <button class="btn-primary" onclick="closeInsuranceModal()">Close</button>
    </div>
  `;

  resultsContainer.style.display = 'block';
}

// Calculate patient cost
async function calculatePatientCost(patientId, serviceCharge) {
  try {
    const response = await fetch('/api/insurance/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        patientId: parseInt(patientId),
        serviceCharge: parseFloat(serviceCharge)
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return data.costBreakdown;
    } else {
      throw new Error(data.error || 'Failed to calculate cost');
    }
  } catch (error) {
    console.error('Error calculating patient cost:', error);
    throw error;
  }
}

// Display cost breakdown
function displayCostBreakdown(costBreakdown) {
  const container = document.getElementById('cost-breakdown-container');
  if (!container) return;

  container.innerHTML = `
    <div class="cost-breakdown">
      <h4>Cost Breakdown:</h4>
      <table class="cost-table">
        <tr>
          <td>Total Charge:</td>
          <td><strong>$${costBreakdown.totalCharge.toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td>Copay:</td>
          <td>-$${costBreakdown.copay.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Deductible Applied:</td>
          <td>-$${costBreakdown.deductibleApplied.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Coinsurance:</td>
          <td>-$${costBreakdown.coinsuranceAmount.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td><strong>Patient Pays:</strong></td>
          <td><strong class="patient-cost">$${costBreakdown.patientResponsibility.toFixed(2)}</strong></td>
        </tr>
        <tr>
          <td>Insurance Pays:</td>
          <td>$${costBreakdown.insurancePayment.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;
}

// Submit insurance claim
async function submitInsuranceClaim(appointmentId) {
  try {
    showLoader('Submitting insurance claim...');

    const response = await fetch('/api/insurance/submit-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        appointmentId: parseInt(appointmentId),
        diagnosisCodes: ['Z00.00'], // Default wellness exam code
        procedureCodes: ['G0071'], // Telemedicine code
        charges: { consultation: 150 }
      })
    });

    const data = await response.json();
    hideLoader();

    if (response.ok && data.success) {
      showNotification(`Claim submitted successfully! Claim ID: ${data.claim.claimId}`, 'success');
      return data.claim;
    } else {
      showNotification(data.error || 'Failed to submit claim', 'error');
      return null;
    }
  } catch (error) {
    hideLoader();
    console.error('Error submitting claim:', error);
    showNotification('Error submitting insurance claim', 'error');
    return null;
  }
}

// Check claim status
async function checkClaimStatus(claimId) {
  try {
    const response = await fetch(`/api/insurance/claim-status/${claimId}`, {
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && data.success) {
      displayClaimStatus(data.claimStatus);
    } else {
      showNotification(data.error || 'Failed to check claim status', 'error');
    }
  } catch (error) {
    console.error('Error checking claim status:', error);
    showNotification('Error checking claim status', 'error');
  }
}

// Display claim status
function displayClaimStatus(claimStatus) {
  const container = document.getElementById('claim-status-container');
  if (!container) return;

  const statusClass = {
    'approved': 'status-success',
    'denied': 'status-error',
    'processing': 'status-warning',
    'pending': 'status-info'
  }[claimStatus.status] || 'status-info';

  container.innerHTML = `
    <div class="claim-status-card">
      <h4>Claim Status</h4>
      <div class="status-info">
        <span class="status-badge ${statusClass}">${claimStatus.status.toUpperCase()}</span>
        <p><strong>Claim ID:</strong> ${claimStatus.claimId}</p>
        <p><strong>Message:</strong> ${claimStatus.message}</p>
        ${claimStatus.paidAmount ? `<p><strong>Paid Amount:</strong> $${claimStatus.paidAmount}</p>` : ''}
        ${claimStatus.paidDate ? `<p><strong>Paid Date:</strong> ${new Date(claimStatus.paidDate).toLocaleDateString()}</p>` : ''}
        ${claimStatus.denialReason ? `<p><strong>Denial Reason:</strong> ${claimStatus.denialReason}</p>` : ''}
        ${claimStatus.actionRequired ? `<p><strong>Action Required:</strong> ${claimStatus.actionRequired}</p>` : ''}
        <p class="last-updated">Last Updated: ${new Date(claimStatus.lastUpdated).toLocaleString()}</p>
        ${claimStatus.mockMode ? '<p class="mock-mode-notice">⚠️ Demo Mode: Using simulated data</p>' : ''}
      </div>
    </div>
  `;
}

// Load insurance service status
async function loadInsuranceStatus() {
  try {
    const response = await fetch('/api/insurance/status', { credentials: 'include' });
    const status = await response.json();

    const statusContainer = document.getElementById('insurance-service-status');
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="service-status">
          <span class="status-badge ${status.enabled ? 'status-success' : 'status-warning'}">
            ${status.enabled ? 'Connected' : 'Demo Mode'}
          </span>
          <p>${status.mockMode ? 'Using simulated insurance data' : 'Connected to insurance providers'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading insurance status:', error);
  }
}

// Close insurance modal
function closeInsuranceModal() {
  const modal = document.getElementById('insurance-verification-modal');
  if (modal) {
    modal.style.display = 'none';
  }

  const resultsContainer = document.getElementById('eligibility-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }
}

// Utility functions
function showLoader(message = 'Loading...') {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.textContent = message;
    loader.style.display = 'block';
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.style.display = 'none';
  }
}

function showNotification(message, type = 'info') {
  // Check if notification function exists from dashboard-interactive.js
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }

  // Fallback notification
  alert(message);
}

// Export functions to global scope
window.initInsuranceManager = initInsuranceManager;
window.showInsuranceVerification = showInsuranceVerification;
window.verifyInsuranceEligibility = verifyInsuranceEligibility;
window.calculatePatientCost = calculatePatientCost;
window.submitInsuranceClaim = submitInsuranceClaim;
window.checkClaimStatus = checkClaimStatus;
window.closeInsuranceModal = closeInsuranceModal;

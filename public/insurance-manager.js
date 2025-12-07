/**
 * Insurance Management UI
 * Handles insurance eligibility verification, claims, and cost calculations
 */

// XSS Protection: HTML escape function
function escapeHtmlIns(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

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

  // XSS-safe: Escape provider name and country
  container.innerHTML = insuranceProviders.map(provider => `
    <div class="insurance-provider-card ${provider.enabled ? 'enabled' : 'disabled'}">
      <div class="provider-info">
        <h4>${escapeHtmlIns(provider.name)}</h4>
        <span class="country-badge">${escapeHtmlIns(provider.country)}</span>
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

  // Populate providers dropdown (XSS-safe: escape all values)
  const providerSelect = document.getElementById('insurance-provider-select');
  if (providerSelect) {
    providerSelect.innerHTML = insuranceProviders.map(provider => `
      <option value="${escapeHtmlIns(provider.id)}">${escapeHtmlIns(provider.name)} (${escapeHtmlIns(provider.country)})</option>
    `).join('');
  }

  // Set patient ID (ensure it's a number)
  const patientIdInput = document.getElementById('insurance-patient-id');
  if (patientIdInput) {
    patientIdInput.value = parseInt(patientId) || 0;
  }

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

    // Use csrfFetch for CSRF-protected POST request
    const response = await csrfFetch('/api/insurance/verify-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // XSS-safe: Ensure numeric values and escape text content
  const safeCopay = parseFloat(eligibility.copay) || 0;
  const safeDeductible = parseFloat(eligibility.deductibleRemaining) || 0;
  const safeCoinsurance = (parseFloat(eligibility.coinsuranceRate) * 100) || 0;
  const coverageDetails = eligibility.coverageDetails || {};

  resultsContainer.innerHTML = `
    <div class="eligibility-result ${isEligible ? 'eligible' : 'not-eligible'}">
      <h3>${isEligible ? '✅ Patient is Eligible' : '❌ Patient is Not Eligible'}</h3>

      ${isEligible ? `
        <div class="coverage-details">
          <h4>Coverage Details:</h4>
          <ul>
            <li><strong>Plan Type:</strong> ${escapeHtmlIns(eligibility.planType || 'N/A')}</li>
            <li><strong>Network Status:</strong> ${escapeHtmlIns(eligibility.networkStatus || 'N/A')}</li>
            <li><strong>Copay:</strong> $${safeCopay}</li>
            <li><strong>Deductible Remaining:</strong> $${safeDeductible}</li>
            <li><strong>Coinsurance Rate:</strong> ${safeCoinsurance}%</li>
          </ul>

          <h4>Covered Services:</h4>
          <ul>
            ${coverageDetails.telemedicine ? '<li>✅ Telemedicine</li>' : '<li>❌ Telemedicine</li>'}
            ${coverageDetails.primaryCare ? '<li>✅ Primary Care</li>' : '<li>❌ Primary Care</li>'}
            ${coverageDetails.specialist ? '<li>✅ Specialist</li>' : '<li>❌ Specialist</li>'}
            ${coverageDetails.mentalHealth ? '<li>✅ Mental Health</li>' : '<li>❌ Mental Health</li>'}
            ${coverageDetails.prescriptions ? '<li>✅ Prescriptions</li>' : '<li>❌ Prescriptions</li>'}
          </ul>

          ${eligibility.mockMode ? '<p class="mock-mode-notice">⚠️ Demo Mode: Using simulated data</p>' : ''}
        </div>
      ` : `
        <div class="not-eligible-details">
          <p><strong>Reason:</strong> ${escapeHtmlIns(eligibility.reason || 'Unknown')}</p>
          ${eligibility.lastActiveDate ? `<p><strong>Last Active:</strong> ${escapeHtmlIns(eligibility.lastActiveDate)}</p>` : ''}
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
    // Use csrfFetch for CSRF-protected POST request
    const response = await csrfFetch('/api/insurance/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    // Use csrfFetch for CSRF-protected POST request
    const response = await csrfFetch('/api/insurance/submit-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // XSS-safe: Validate status against known values
  const validStatuses = ['approved', 'denied', 'processing', 'pending'];
  const safeStatus = validStatuses.includes(claimStatus.status) ? claimStatus.status : 'pending';

  const statusClass = {
    'approved': 'status-success',
    'denied': 'status-error',
    'processing': 'status-warning',
    'pending': 'status-info'
  }[safeStatus];

  // XSS-safe: Parse numeric values and escape text content
  const safePaidAmount = parseFloat(claimStatus.paidAmount) || 0;

  container.innerHTML = `
    <div class="claim-status-card">
      <h4>Claim Status</h4>
      <div class="status-info">
        <span class="status-badge ${statusClass}">${safeStatus.toUpperCase()}</span>
        <p><strong>Claim ID:</strong> ${escapeHtmlIns(claimStatus.claimId)}</p>
        <p><strong>Message:</strong> ${escapeHtmlIns(claimStatus.message)}</p>
        ${claimStatus.paidAmount ? `<p><strong>Paid Amount:</strong> $${safePaidAmount}</p>` : ''}
        ${claimStatus.paidDate ? `<p><strong>Paid Date:</strong> ${new Date(claimStatus.paidDate).toLocaleDateString()}</p>` : ''}
        ${claimStatus.denialReason ? `<p><strong>Denial Reason:</strong> ${escapeHtmlIns(claimStatus.denialReason)}</p>` : ''}
        ${claimStatus.actionRequired ? `<p><strong>Action Required:</strong> ${escapeHtmlIns(claimStatus.actionRequired)}</p>` : ''}
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

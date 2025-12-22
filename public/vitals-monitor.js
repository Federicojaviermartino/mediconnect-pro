// Vitals Monitor JavaScript

// XSS Protection: HTML escape function
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let currentUser = null;
let currentPatient = null;
let vitalsChart = null;
let allVitals = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadData();
    setupEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const data = await response.json();
        currentUser = data.user;

        // Get patient info using patient-specific endpoint
        if (currentUser.role === 'patient') {
            try {
                const patientResponse = await fetch('/api/me/patient', { credentials: 'include' });
                if (patientResponse.ok) {
                    const patientData = await patientResponse.json();
                    currentPatient = patientData.patient;
                } else {
                    console.warn('Could not load patient profile');
                }
            } catch (e) {
                console.warn('Error loading patient profile:', e);
            }
        }
        updateHeader();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

function updateHeader() {
    // Update userName element (in sidebar header)
    const userNameEl = document.getElementById('userName');
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name;
    }
}

function setupEventListeners() {
    const form = document.getElementById('vitalsForm');
    if (form) form.addEventListener('submit', handleVitalsSubmit);
}

async function loadData() {
    await Promise.all([loadVitals(), loadAlerts(), loadQuickStats()]);
}

async function loadVitals() {
    try {
        if (!currentPatient) return;
        const response = await fetch(`/api/vitals/patient/${currentPatient.id}?days=30`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load vitals');
        const data = await response.json();
        allVitals = data.vitals || [];
        displayRecentReadings(allVitals.slice(0, 10));
        initializeChart();
        showChart('heartRate');
    } catch (error) {
        console.error('Error loading vitals:', error);
        showError('Failed to load vital signs history');
    }
}

async function loadAlerts() {
    try {
        if (!currentPatient) return;
        const response = await fetch(`/api/vitals/alerts/${currentPatient.id}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load alerts');
        const data = await response.json();
        displayAlerts(data.alerts || []);
        const criticalCount = data.summary?.critical || 0;
        if (criticalCount > 0) {
            showAlertBanner(`⚠️ You have ${criticalCount} critical alert(s) requiring attention!`, 'critical');
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

async function loadQuickStats() {
    try {
        if (!currentPatient) return;
        const response = await fetch(`/api/vitals/patient/${currentPatient.id}?days=7`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to load stats');
        const data = await response.json();
        displayQuickStats(data.stats || {});
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function displayRecentReadings(vitals) {
    const container = document.getElementById('recentReadings');
    if (!container) return;
    if (vitals.length === 0) {
        container.innerHTML = '<p class="empty-state">No vital signs recorded yet</p>';
        return;
    }
    // XSS-safe: Numeric values are safe, but notes need escaping
    const html = vitals.map(v => `
        <div class="reading-card">
            <div class="reading-header">
                <span class="reading-date">${new Date(v.timestamp).toLocaleString()}</span>
            </div>
            <div class="reading-values">
                ${v.heartRate ? `<div class="value-item">❤️ ${parseFloat(v.heartRate) || 0} bpm</div>` : ''}
                ${v.systolicBP && v.diastolicBP ? `<div class="value-item">🩸 ${parseFloat(v.systolicBP) || 0}/${parseFloat(v.diastolicBP) || 0} mmHg</div>` : ''}
                ${v.temperature ? `<div class="value-item">🌡️ ${parseFloat(v.temperature) || 0}°C</div>` : ''}
                ${v.oxygenSaturation ? `<div class="value-item">💨 ${parseFloat(v.oxygenSaturation) || 0}%</div>` : ''}
                ${v.respiratoryRate ? `<div class="value-item">🫁 ${parseFloat(v.respiratoryRate) || 0} br/min</div>` : ''}
                ${v.bloodGlucose ? `<div class="value-item">🍬 ${parseFloat(v.bloodGlucose) || 0} mg/dL</div>` : ''}
            </div>
            ${v.notes ? `<div class="reading-notes">📋 ${escapeHtml(v.notes)}</div>` : ''}
        </div>
    `).join('');
    container.innerHTML = html;
}

function displayAlerts(alerts) {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    if (alerts.length === 0) {
        container.innerHTML = '<p class="empty-state">✅ No active alerts - all vitals are normal</p>';
        return;
    }
    // XSS-safe: Validate severity and escape message/id
    const validSeverities = ['critical', 'warning', 'info'];
    const html = alerts.map(alert => {
        const safeSeverity = validSeverities.includes(alert.severity) ? alert.severity : 'info';
        const safeId = escapeHtml(String(alert.id)).replace(/'/g, "\\'");
        return `
            <div class="alert-card alert-${safeSeverity}">
                <div class="alert-header">
                    <span class="alert-severity">${getSeverityIcon(safeSeverity)} ${safeSeverity.toUpperCase()}</span>
                    <span class="alert-time">${getTimeAgo(alert.timestamp)}</span>
                </div>
                <div class="alert-message">${escapeHtml(alert.message)}</div>
                <button onclick="acknowledgeAlert('${safeId}')" class="btn-sm btn-secondary">Acknowledge</button>
            </div>
        `;
    }).join('');
    container.innerHTML = html;
}

function displayQuickStats(stats) {
    const container = document.getElementById('quickStats');
    if (!container) return;
    const statItems = [];
    if (stats.heartRate) statItems.push(createStatItem('❤️ Heart Rate', stats.heartRate));
    if (stats.systolicBP) statItems.push(createStatItem('🩸 Blood Pressure', {
        ...stats.systolicBP,
        display: `${Math.round(stats.systolicBP.current)}/${Math.round(stats.diastolicBP?.current || 80)}`
    }));
    if (stats.temperature) statItems.push(createStatItem('🌡️ Temperature', stats.temperature));
    if (stats.oxygenSaturation) statItems.push(createStatItem('💨 Oxygen Sat', stats.oxygenSaturation));

    if (statItems.length === 0) {
        container.innerHTML = '<p class="empty-state">No data available</p>';
        return;
    }
    container.innerHTML = statItems.join('');
}

function createStatItem(label, stat) {
    if (!stat) return '';
    const value = stat.display || Math.round(stat.current * 10) / 10;
    const avg = Math.round(stat.average * 10) / 10;
    const trend = stat.trend || 0;
    const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
    const trendClass = trend > 0 ? 'trend-up' : trend < 0 ? 'trend-down' : 'trend-stable';
    return `
        <div class="stat-item">
            <div class="stat-label">${label}</div>
            <div class="stat-value">${value}</div>
            <div class="stat-details">
                <span>Avg: ${avg}</span>
                <span class="stat-trend ${trendClass}">${trendIcon}</span>
            </div>
        </div>
    `;
}

function initializeChart() {
    const ctx = document.getElementById('vitalsChart');
    if (!ctx) return;
    vitalsChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { beginAtZero: false, title: { display: true, text: 'Value' } }
            }
        }
    });
}

function showChart(type) {
    if (!vitalsChart || allVitals.length === 0) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    let datasets = [];
    const sortedVitals = [...allVitals].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    switch(type) {
        case 'heartRate':
            datasets = [{
                label: 'Heart Rate (bpm)',
                data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.heartRate })).filter(d => d.y !== null),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)'
            }];
            break;
        case 'bloodPressure':
            datasets = [
                {
                    label: 'Systolic BP',
                    data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.systolicBP })).filter(d => d.y !== null),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)'
                },
                {
                    label: 'Diastolic BP',
                    data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.diastolicBP })).filter(d => d.y !== null),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)'
                }
            ];
            break;
        case 'temperature':
            datasets = [{
                label: 'Temperature (°C)',
                data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.temperature })).filter(d => d.y !== null),
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.1)'
            }];
            break;
        case 'oxygenSaturation':
            datasets = [{
                label: 'Oxygen Saturation (%)',
                data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.oxygenSaturation })).filter(d => d.y !== null),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)'
            }];
            break;
        case 'bloodGlucose':
            datasets = [{
                label: 'Blood Glucose (mg/dL)',
                data: sortedVitals.map(v => ({ x: new Date(v.timestamp), y: v.bloodGlucose })).filter(d => d.y !== null),
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.1)'
            }];
            break;
    }

    vitalsChart.data.datasets = datasets;
    vitalsChart.update();
}

async function handleVitalsSubmit(e) {
    e.preventDefault();
    if (!currentPatient) {
        showError('Patient information not found');
        return;
    }

    const formData = new FormData(e.target);
    const vitalsData = {
        patientId: currentPatient.id,
        heartRate: formData.get('heartRate') || null,
        systolicBP: formData.get('systolicBP') || null,
        diastolicBP: formData.get('diastolicBP') || null,
        temperature: formData.get('temperature') || null,
        oxygenSaturation: formData.get('oxygenSaturation') || null,
        respiratoryRate: formData.get('respiratoryRate') || null,
        bloodGlucose: formData.get('bloodGlucose') || null,
        weight: formData.get('weight') || null,
        notes: formData.get('notes') || null
    };

    const hasData = Object.entries(vitalsData)
        .filter(([key]) => key !== 'patientId' && key !== 'notes')
        .some(([, value]) => value !== null && value !== '');

    if (!hasData) {
        showError('Please enter at least one vital sign measurement');
        return;
    }

    try {
        // Use csrfFetch for CSRF-protected POST request
        const response = await csrfFetch('/api/vitals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vitalsData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to record vitals');
        }

        const data = await response.json();
        showSuccess(data.message || 'Vitals recorded successfully');
        e.target.reset();
        await loadData();

        if (data.alerts && data.alerts.length > 0) {
            const criticalAlerts = data.alerts.filter(a => a.severity === 'critical');
            if (criticalAlerts.length > 0) {
                showAlertBanner(`⚠️ ${criticalAlerts.length} critical alert(s) detected! Please review.`, 'critical');
            }
        }
    } catch (error) {
        console.error('Error recording vitals:', error);
        showError(error.message);
    }
}

async function analyzeVitals() {
    if (!currentPatient || allVitals.length === 0) {
        showError('No vitals data available for analysis');
        return;
    }

    const btn = document.getElementById('analyzeBtn');
    const resultDiv = document.getElementById('analysisResult');

    btn.disabled = true;
    btn.textContent = 'Analyzing...';
    resultDiv.innerHTML = '<div class="loading">AI is analyzing your vitals...</div>';
    resultDiv.style.display = 'block';

    try {
        // Use csrfFetch for CSRF-protected POST request
        const response = await csrfFetch('/api/ai/analyze-vitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: currentPatient.id,
                vitals: allVitals.slice(0, 20),
                timeframe: '30 days'
            })
        });

        if (!response.ok) throw new Error('Failed to analyze vitals');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'AI analysis unavailable');

        displayAIAnalysis(data.analysis);
    } catch (error) {
        console.error('Error analyzing vitals:', error);
        // XSS-safe: Escape error message
        resultDiv.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyze My Vitals';
    }
}

function displayAIAnalysis(analysis) {
    const resultDiv = document.getElementById('analysisResult');

    // XSS-safe: Validate riskLevel against known values
    const validRiskLevels = ['high', 'medium', 'low'];
    const safeRiskLevel = validRiskLevels.includes(analysis.riskLevel) ? analysis.riskLevel : 'low';
    const riskClass = safeRiskLevel === 'high' ? 'risk-high' :
                     safeRiskLevel === 'medium' ? 'risk-medium' : 'risk-low';

    // XSS-safe: Ensure riskScore is a number
    const safeRiskScore = parseInt(analysis.riskScore) || 0;

    const html = `
        <div class="ai-analysis">
            <div class="risk-assessment ${riskClass}">
                <h3>Risk Level: ${safeRiskLevel.toUpperCase()}</h3>
                <div class="risk-score">Risk Score: ${safeRiskScore}/100</div>
            </div>
            ${analysis.seekImmediateCare ? `
                <div class="alert-card alert-critical">
                    <strong>⚠️ SEEK IMMEDIATE MEDICAL ATTENTION</strong>
                    <p>${escapeHtml(analysis.seekImmediateCareReason)}</p>
                </div>
            ` : ''}
            <div class="analysis-section">
                <h4>📊 Summary</h4>
                <p>${escapeHtml(analysis.summary)}</p>
            </div>
            ${analysis.concerningTrends && analysis.concerningTrends.length > 0 ? `
                <div class="analysis-section">
                    <h4>⚠️ Concerning Trends</h4>
                    <ul>${(analysis.concerningTrends || []).map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${analysis.positiveObservations && analysis.positiveObservations.length > 0 ? `
                <div class="analysis-section">
                    <h4>✅ Positive Observations</h4>
                    <ul>${(analysis.positiveObservations || []).map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${analysis.recommendedActions && analysis.recommendedActions.length > 0 ? `
                <div class="analysis-section">
                    <h4>💡 Recommended Actions</h4>
                    <ul>${(analysis.recommendedActions || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
                </div>
            ` : ''}
            <div class="analysis-footer">
                <small>⚠️ This AI analysis is for informational purposes only and should not replace professional medical advice.</small>
            </div>
        </div>
    `;
    resultDiv.innerHTML = html;
}

async function acknowledgeAlert(alertId) {
    try {
        // Use csrfFetch for CSRF-protected POST request
        const response = await csrfFetch(`/api/vitals/alerts/${alertId}/acknowledge`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to acknowledge alert');
        showSuccess('Alert acknowledged');
        await loadAlerts();
    } catch (error) {
        console.error('Error acknowledging alert:', error);
        showError(error.message);
    }
}

function getSeverityIcon(severity) {
    switch(severity) {
        case 'critical': return '🚨';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return '📌';
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function showAlertBanner(message, type = 'info') {
    const banner = document.getElementById('alertBanner');
    if (!banner) return;
    // XSS-safe: Validate type against known values
    const safeType = ['info', 'critical', 'warning', 'success'].includes(type) ? type : 'info';
    banner.className = `alert-banner alert-${safeType}`;
    banner.textContent = message; // Safe: textContent escapes HTML
    banner.style.display = 'block';
    setTimeout(() => { banner.style.display = 'none'; }, 10000);
}

function showSuccess(message) {
    showAlertBanner(`✅ ${message}`, 'info');
}

function showError(message) {
    showAlertBanner(`❌ ${message}`, 'critical');
}

function logout() {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .then(() => { window.location.href = '/login.html'; });
}

// Vitals Monitor JavaScript
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

        // Get patient info
        if (currentUser.role === 'patient') {
            const patientsResponse = await fetch('/api/patients', { credentials: 'include' });
            const patientsData = await patientsResponse.json();
            currentPatient = patientsData.patients.find(p => p.userId === currentUser.id);
        }
        updateHeader();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

function updateHeader() {
    const welcomeEl = document.getElementById('userWelcome');
    if (welcomeEl && currentUser) {
        welcomeEl.textContent = `Welcome, ${currentUser.name}`;
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
    const html = vitals.map(v => `
        <div class="reading-card">
            <div class="reading-header">
                <span class="reading-date">${new Date(v.timestamp).toLocaleString()}</span>
            </div>
            <div class="reading-values">
                ${v.heartRate ? `<div class="value-item">❤️ ${v.heartRate} bpm</div>` : ''}
                ${v.systolicBP && v.diastolicBP ? `<div class="value-item">🩸 ${v.systolicBP}/${v.diastolicBP} mmHg</div>` : ''}
                ${v.temperature ? `<div class="value-item">🌡️ ${v.temperature}°C</div>` : ''}
                ${v.oxygenSaturation ? `<div class="value-item">💨 ${v.oxygenSaturation}%</div>` : ''}
                ${v.respiratoryRate ? `<div class="value-item">🫁 ${v.respiratoryRate} br/min</div>` : ''}
                ${v.bloodGlucose ? `<div class="value-item">🍬 ${v.bloodGlucose} mg/dL</div>` : ''}
            </div>
            ${v.notes ? `<div class="reading-notes">📋 ${v.notes}</div>` : ''}
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
    const html = alerts.map(alert => `
        <div class="alert-card alert-${alert.severity}">
            <div class="alert-header">
                <span class="alert-severity">${getSeverityIcon(alert.severity)} ${alert.severity.toUpperCase()}</span>
                <span class="alert-time">${getTimeAgo(alert.timestamp)}</span>
            </div>
            <div class="alert-message">${alert.message}</div>
            <button onclick="acknowledgeAlert('${alert.id}')" class="btn-sm btn-secondary">Acknowledge</button>
        </div>
    `).join('');
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
        const response = await fetch('/api/vitals/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
        const response = await fetch('/api/ai/analyze-vitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
        resultDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = 'Analyze My Vitals';
    }
}

function displayAIAnalysis(analysis) {
    const resultDiv = document.getElementById('analysisResult');
    const riskClass = analysis.riskLevel === 'high' ? 'risk-high' :
                     analysis.riskLevel === 'medium' ? 'risk-medium' : 'risk-low';

    const html = `
        <div class="ai-analysis">
            <div class="risk-assessment ${riskClass}">
                <h3>Risk Level: ${analysis.riskLevel.toUpperCase()}</h3>
                <div class="risk-score">Risk Score: ${analysis.riskScore}/100</div>
            </div>
            ${analysis.seekImmediateCare ? `
                <div class="alert-card alert-critical">
                    <strong>⚠️ SEEK IMMEDIATE MEDICAL ATTENTION</strong>
                    <p>${analysis.seekImmediateCareReason}</p>
                </div>
            ` : ''}
            <div class="analysis-section">
                <h4>📊 Summary</h4>
                <p>${analysis.summary}</p>
            </div>
            ${analysis.concerningTrends && analysis.concerningTrends.length > 0 ? `
                <div class="analysis-section">
                    <h4>⚠️ Concerning Trends</h4>
                    <ul>${analysis.concerningTrends.map(t => `<li>${t}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${analysis.positiveObservations && analysis.positiveObservations.length > 0 ? `
                <div class="analysis-section">
                    <h4>✅ Positive Observations</h4>
                    <ul>${analysis.positiveObservations.map(o => `<li>${o}</li>`).join('')}</ul>
                </div>
            ` : ''}
            ${analysis.recommendedActions && analysis.recommendedActions.length > 0 ? `
                <div class="analysis-section">
                    <h4>💡 Recommended Actions</h4>
                    <ul>${analysis.recommendedActions.map(a => `<li>${a}</li>`).join('')}</ul>
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
        const response = await fetch(`/api/vitals/alerts/${alertId}/acknowledge`, {
            method: 'POST',
            credentials: 'include'
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
    banner.className = `alert-banner alert-${type}`;
    banner.textContent = message;
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

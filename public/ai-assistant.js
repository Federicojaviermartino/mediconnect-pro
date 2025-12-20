// AI Assistant functionality for MediConnect Pro

// XSS Protection: HTML escape function
function escapeHtmlAI(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Check AI Service Status
async function checkAIStatus() {
    try {
        const response = await fetch('/api/ai/status');
        const data = await response.json();

        if (data.success) {

            return data;
        }
    } catch (error) {
        console.error('Failed to check AI status:', error);
    }
    return null;
}

// Symptom Triage
async function triageSymptoms(symptoms) {
    try {
        // Use csrfFetch for CSRF-protected POST request
        const response = await csrfFetch('/api/ai/triage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symptoms })
        });

        const data = await response.json();

        if (data.success) {
            displayTriageResults(data.triage);
            return data.triage;
        } else {
            showNotification('Error performing triage: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Triage error:', error);
        showNotification('Error connecting to triage service', 'error');
    }
    return null;
}

// Display Triage Results
function displayTriageResults(triage) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Cannot display triage results: main-content element not found');
        showNotification('Unable to display results. Please refresh the page.', 'error');
        return;
    }

    const urgencyColors = {
        low: '#4CAF50',
        medium: '#FF9800',
        high: '#FF5722',
        emergency: '#F44336'
    };

    const urgencyLabels = {
        low: 'Low Urgency',
        medium: 'Medium Urgency',
        high: 'High Urgency',
        emergency: 'EMERGENCY'
    };

    const urgencyIcons = {
        low: '✅',
        medium: '⚠️',
        high: '🔴',
        emergency: '🚨'
    };

    // XSS-safe: Validate urgencyLevel against known values
    const safeUrgencyLevel = ['low', 'medium', 'high', 'emergency'].includes(triage.urgencyLevel)
        ? triage.urgencyLevel
        : 'medium';

    mainContent.innerHTML = `
        <div class="ai-triage-results">
            <div class="triage-header" style="background: ${urgencyColors[safeUrgencyLevel]};">
                <h2>${urgencyIcons[safeUrgencyLevel]} ${urgencyLabels[safeUrgencyLevel]}</h2>
                <p>${escapeHtmlAI(triage.urgencyReason)}</p>
            </div>

            ${triage.immediateAction ? `
                <div class="emergency-alert">
                    <h3>🚨 IMMEDIATE ACTION REQUIRED</h3>
                    <p>Please seek emergency medical attention immediately or call 911.</p>
                </div>
            ` : ''}

            <div class="triage-section">
                <h3>Possible Conditions</h3>
                <ul class="conditions-list">
                    ${(triage.possibleConditions || []).map(condition => `<li>${escapeHtmlAI(condition)}</li>`).join('')}
                </ul>
            </div>

            <div class="triage-section">
                <h3>Recommended Specialty</h3>
                <p class="specialty-badge">${escapeHtmlAI(triage.recommendedSpecialty)}</p>
            </div>

            ${triage.redFlags && triage.redFlags.length > 0 ? `
                <div class="triage-section red-flags">
                    <h3>⚠️ Warning Signs</h3>
                    <ul>
                        ${triage.redFlags.map(flag => `<li>${escapeHtmlAI(flag)}</li>`).join('')}
                    </ul>
                    <p><strong>If you experience any of these signs, seek immediate medical attention.</strong></p>
                </div>
            ` : ''}

            <div class="triage-section">
                <h3>Recommendations</h3>
                <ul class="recommendations-list">
                    ${(triage.recommendations || []).map(rec => `<li>${escapeHtmlAI(rec)}</li>`).join('')}
                </ul>
            </div>

            ${triage.questions && triage.questions.length > 0 ? `
                <div class="triage-section">
                    <h3>Questions for Your Doctor</h3>
                    <ul class="questions-list">
                        ${triage.questions.map(q => `<li>${escapeHtmlAI(q)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="triage-actions">
                <button onclick="scheduleAppointment('${escapeHtmlAI(triage.recommendedSpecialty).replace(/'/g, "\\'")}')" class="btn-primary">
                    Schedule Appointment with ${escapeHtmlAI(triage.recommendedSpecialty)}
                </button>
                <button onclick="showTriageForm()" class="btn-secondary">
                    New Analysis
                </button>
            </div>
        </div>
    `;

    // Add CSS for triage results
    if (!document.getElementById('triage-styles')) {
        const style = document.createElement('style');
        style.id = 'triage-styles';
        style.innerHTML = `
            .ai-triage-results {
                max-width: 800px;
                margin: 20px auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .triage-header {
                color: white;
                padding: 30px;
                text-align: center;
            }

            .triage-header h2 {
                margin: 0 0 10px 0;
                font-size: 28px;
            }

            .triage-header p {
                margin: 0;
                font-size: 16px;
                opacity: 0.95;
            }

            .emergency-alert {
                background: #FFEBEE;
                border: 3px solid #F44336;
                padding: 20px;
                margin: 20px;
                border-radius: 8px;
                text-align: center;
            }

            .emergency-alert h3 {
                color: #F44336;
                margin-top: 0;
            }

            .triage-section {
                padding: 20px 30px;
                border-bottom: 1px solid #eee;
            }

            .triage-section:last-of-type {
                border-bottom: none;
            }

            .triage-section h3 {
                color: #333;
                margin-top: 0;
                margin-bottom: 15px;
            }

            .conditions-list, .recommendations-list, .questions-list {
                list-style: none;
                padding: 0;
            }

            .conditions-list li, .recommendations-list li, .questions-list li {
                padding: 10px 15px;
                margin: 5px 0;
                background: #f5f5f5;
                border-radius: 6px;
                border-left: 4px solid #4A90E2;
            }

            .specialty-badge {
                display: inline-block;
                background: #4A90E2;
                color: white;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: bold;
            }

            .red-flags {
                background: #FFF3E0;
            }

            .red-flags ul li {
                border-left-color: #FF5722;
                background: white;
            }

            .triage-actions {
                padding: 30px;
                text-align: center;
                background: #fafafa;
            }

            .triage-actions button {
                margin: 10px;
                padding: 12px 30px;
                font-size: 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s;
            }

            .btn-primary {
                background: #4A90E2;
                color: white;
            }

            .btn-primary:hover {
                background: #357ABD;
            }

            .btn-secondary {
                background: white;
                color: #4A90E2;
                border: 2px solid #4A90E2;
            }

            .btn-secondary:hover {
                background: #4A90E2;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}

// Show Triage Form
window.showTriageForm = function showTriageForm() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('Cannot show triage form: main-content element not found');
        showNotification('Unable to load AI Assistant. Please refresh the page.', 'error');
        return;
    }

    // Store dashboard content and set active menu
    if (typeof storeDashboardContent === 'function') {
        storeDashboardContent();
    }
    if (typeof setActiveMenuItem === 'function') {
        setActiveMenuItem('AI Triage');
    }

    mainContent.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">🤖 AI Triage Assistant</h2>
            <button onclick="returnToDashboard()" class="btn-secondary">← Back to Dashboard</button>
        </div>
        <div class="ai-triage-form">
            <div class="form-header">
                <p>Describe your symptoms and we'll help determine the urgency level</p>
            </div>

            <div class="medical-disclaimer-banner">
                <div class="disclaimer-icon">⚠️</div>
                <div class="disclaimer-content">
                    <h3>IMPORTANT MEDICAL NOTICE</h3>
                    <p><strong>This AI assistant is for informational and educational purposes only.</strong></p>
                    <ul>
                        <li>Does NOT constitute medical advice, diagnosis, or treatment</li>
                        <li>Does NOT replace evaluation by a certified medical professional</li>
                        <li>May produce incomplete or inaccurate information</li>
                        <li>Should NOT be used for medical emergency situations</li>
                    </ul>
                    <p class="emergency-notice">
                        <strong>🚨 For medical emergencies, call 911 immediately.</strong>
                    </p>
                    <p class="consent-text">
                        By using this tool, you acknowledge these limitations and agree to consult
                        with qualified medical professionals for all medical decisions.
                    </p>
                </div>
            </div>

            <div class="form-content">
                <div class="form-group">
                    <label for="symptoms">Describe your symptoms:</label>
                    <textarea
                        id="symptoms"
                        rows="8"
                        placeholder="Example: I have had a headache for 3 days, with nausea in the morning and sensitivity to light..."
                        class="form-textarea"
                    ></textarea>
                    <small>Be as detailed as possible: when it started, intensity, associated symptoms, etc.</small>
                </div>

                <div class="form-actions">
                    <button onclick="submitTriageForm()" class="btn-primary">
                        Analyze Symptoms
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add CSS for triage form
    if (!document.getElementById('triage-form-styles')) {
        const style = document.createElement('style');
        style.id = 'triage-form-styles';
        style.innerHTML = `
            .ai-triage-form {
                max-width: 700px;
                margin: 40px auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            .form-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }

            .form-header h2 {
                margin: 0 0 10px 0;
            }

            .form-header p {
                margin: 0;
                opacity: 0.9;
            }

            .medical-disclaimer-banner {
                background: #fff3cd;
                border: 3px solid #ffc107;
                border-left: 8px solid #ff9800;
                margin: 20px;
                padding: 20px;
                border-radius: 8px;
                display: flex;
                gap: 15px;
                align-items: flex-start;
            }

            .disclaimer-icon {
                font-size: 32px;
                flex-shrink: 0;
            }

            .disclaimer-content h3 {
                color: #856404;
                margin: 0 0 10px 0;
                font-size: 18px;
            }

            .disclaimer-content p {
                color: #856404;
                margin: 10px 0;
                font-size: 14px;
                line-height: 1.5;
            }

            .disclaimer-content ul {
                color: #856404;
                margin: 10px 0;
                padding-left: 20px;
                font-size: 14px;
            }

            .disclaimer-content ul li {
                margin: 5px 0;
            }

            .emergency-notice {
                background: #fff;
                padding: 10px;
                border-radius: 4px;
                border-left: 4px solid #dc3545;
                margin: 15px 0 !important;
            }

            .consent-text {
                font-size: 13px !important;
                font-style: italic;
                opacity: 0.9;
            }

            .form-content {
                padding: 30px;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 10px;
                font-weight: bold;
                color: #333;
            }

            .form-textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-family: inherit;
                font-size: 14px;
                resize: vertical;
                transition: border-color 0.3s;
            }

            .form-textarea:focus {
                outline: none;
                border-color: #667eea;
            }

            .form-group small {
                display: block;
                margin-top: 5px;
                color: #666;
                font-size: 13px;
            }

            .form-actions {
                text-align: center;
                margin: 30px 0;
            }

            .disclaimer {
                background: #FFF3CD;
                border: 1px solid #FFE69C;
                border-radius: 6px;
                padding: 15px;
                margin-top: 20px;
            }

            .disclaimer p {
                margin: 0;
                color: #856404;
                font-size: 13px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Submit Triage Form
async function submitTriageForm() {
    const symptomsInput = document.getElementById('symptoms');
    if (!symptomsInput) {
        console.error('Symptoms input not found');
        showNotification('Form error. Please refresh the page.', 'error');
        return;
    }

    const symptoms = symptomsInput.value.trim();

    if (!symptoms) {
        showNotification('Please describe your symptoms', 'warning');
        return;
    }

    if (symptoms.length < 20) {
        showNotification('Please provide a more detailed description of your symptoms', 'warning');
        return;
    }

    // Show loading state
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loader"></div>
            <h3>Analyzing symptoms...</h3>
            <p>Our AI assistant is evaluating your information</p>
        </div>
    `;

    // Add loader CSS if not exists
    if (!document.getElementById('loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.innerHTML = `
            .loader {
                border: 5px solid #f3f3f3;
                border-top: 5px solid #4A90E2;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Perform triage
    await triageSymptoms(symptoms);
}

// Schedule Appointment
function scheduleAppointment(specialty) {
    showNotification(`Redirecting to schedule appointment for ${specialty}...`, 'info');

    // Navigate to appointments
    setTimeout(() => {
        navigateTo('Appointments');
    }, 1500);
}

// Show notification function (if not already defined)
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    // XSS-safe: Validate type against known values
    const safeType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';

    // Create notification using DOM APIs (XSS-safe)
    const notification = document.createElement('div');
    notification.className = `notification notification-${safeType}`;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message; // Safe: textContent escapes HTML

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.onclick = function() { this.parentElement.remove(); };

    notification.appendChild(messageSpan);
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// ============================================
// AUDIO TRANSCRIPTION & DIAGNOSIS (Doctor Feature)
// ============================================

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;

// Show Audio Diagnosis Form (Doctor only)
window.showAudioDiagnosisForm = function showAudioDiagnosisForm() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        showNotification('Unable to load AI Diagnosis. Please refresh the page.', 'error');
        return;
    }

    // Store dashboard content and set active menu
    if (typeof storeDashboardContent === 'function') {
        storeDashboardContent();
    }
    if (typeof setActiveMenuItem === 'function') {
        setActiveMenuItem('AI Diagnosis');
    }

    mainContent.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">🧠 AI Diagnosis Assistant</h2>
            <button onclick="returnToDashboard()" class="btn-secondary">← Back to Dashboard</button>
        </div>
        <div class="ai-audio-diagnosis-form">
            <div class="form-header">
                <p>Describe patient symptoms and get AI-powered diagnosis suggestions</p>
                <div class="ai-models-badge">
                    <span>Mode: <strong>Demo (Free)</strong> - Simulated AI responses</span>
                </div>
            </div>

            <div class="medical-disclaimer-banner">
                <div class="disclaimer-icon">⚕️</div>
                <div class="disclaimer-content">
                    <h3>CLINICAL SUPPORT TOOL</h3>
                    <p><strong>This AI provides diagnosis suggestions as a clinical support tool.</strong></p>
                    <ul>
                        <li>Suggestions are for reference only - NOT final diagnoses</li>
                        <li>Always verify with your clinical judgment and examination</li>
                        <li>Review differential diagnoses carefully</li>
                        <li>Consider patient history and context not captured</li>
                    </ul>
                    <p class="consent-text">
                        AI-generated suggestions should be validated by the treating physician.
                    </p>
                </div>
            </div>

            <div class="form-content">
                <div class="form-group">
                    <label for="patient-select">Select Patient (Optional):</label>
                    <select id="patient-select" class="form-select">
                        <option value="">-- Anonymous Patient --</option>
                    </select>
                    <small>Selecting a patient provides better context for diagnosis</small>
                </div>

                <!-- Input Mode Tabs -->
                <div class="input-mode-tabs">
                    <button id="tab-text" class="tab-btn active" onclick="switchInputMode('text')">
                        📝 Text Input (Free)
                    </button>
                    <button id="tab-audio" class="tab-btn" onclick="switchInputMode('audio')">
                        🎤 Audio Recording (Requires API)
                    </button>
                </div>

                <!-- Text Input Section -->
                <div id="text-input-section" class="text-input-section">
                    <h3>Describe Patient Symptoms</h3>
                    <p>Enter the patient's symptoms, duration, and relevant details</p>

                    <div class="form-group">
                        <label for="symptoms-text">Symptom Description:</label>
                        <textarea
                            id="symptoms-text"
                            class="symptoms-textarea"
                            placeholder="Example: Patient reports persistent headache for 3 days, located in the frontal region, intensity 7/10. Associated with nausea in the morning and sensitivity to light. No fever. The pain worsens with physical activity..."
                            rows="6"
                            oninput="updateDiagnoseButton()"
                        ></textarea>
                        <small>Minimum 20 characters. Be as detailed as possible.</small>
                    </div>

                    <div class="symptom-templates">
                        <p><strong>Quick templates:</strong></p>
                        <button class="template-btn" onclick="insertTemplate('headache')">Headache</button>
                        <button class="template-btn" onclick="insertTemplate('respiratory')">Respiratory</button>
                        <button class="template-btn" onclick="insertTemplate('digestive')">Digestive</button>
                        <button class="template-btn" onclick="insertTemplate('pain')">General Pain</button>
                    </div>
                </div>

                <!-- Audio Recording Section (hidden by default) -->
                <div id="audio-recorder-section" class="audio-recorder-section hidden">
                    <h3>Record Patient Description</h3>
                    <p>Press the button and let the patient describe their symptoms</p>
                    <div class="api-warning">
                        <strong>Note:</strong> Audio transcription requires OpenAI API key ($0.006/min).
                        <br>Currently in demo mode - use Text Input for free diagnosis.
                    </div>

                    <div class="recorder-controls">
                        <button id="record-btn" onclick="toggleRecording()" class="btn-record">
                            <span id="record-icon">🎤</span>
                            <span id="record-text">Start Recording</span>
                        </button>
                        <div id="recording-indicator" class="recording-indicator hidden">
                            <div class="recording-pulse"></div>
                            <span id="recording-time">00:00</span>
                        </div>
                    </div>

                    <div id="audio-preview" class="audio-preview hidden">
                        <audio id="recorded-audio" controls></audio>
                        <button onclick="clearRecording()" class="btn-secondary btn-small">
                            Clear Recording
                        </button>
                    </div>
                </div>

                <div class="form-actions">
                    <button id="diagnose-btn" onclick="submitDiagnosis()" class="btn-primary" disabled>
                        🧠 Generate AI Diagnosis
                    </button>
                </div>
            </div>
        </div>
    `;

    // Load patients for selection
    loadPatientsForDiagnosis();

    // Add CSS for audio diagnosis form
    addAudioDiagnosisStyles();
};

// Current input mode
let currentInputMode = 'text';

// Switch between text and audio input modes
window.switchInputMode = function switchInputMode(mode) {
    currentInputMode = mode;

    const textSection = document.getElementById('text-input-section');
    const audioSection = document.getElementById('audio-recorder-section');
    const tabText = document.getElementById('tab-text');
    const tabAudio = document.getElementById('tab-audio');

    if (mode === 'text') {
        textSection.classList.remove('hidden');
        audioSection.classList.add('hidden');
        tabText.classList.add('active');
        tabAudio.classList.remove('active');
    } else {
        textSection.classList.add('hidden');
        audioSection.classList.remove('hidden');
        tabText.classList.remove('active');
        tabAudio.classList.add('active');
    }

    updateDiagnoseButton();
};

// Update diagnose button state
window.updateDiagnoseButton = function updateDiagnoseButton() {
    const diagnoseBtn = document.getElementById('diagnose-btn');
    if (!diagnoseBtn) return;

    if (currentInputMode === 'text') {
        const symptomsText = document.getElementById('symptoms-text')?.value || '';
        diagnoseBtn.disabled = symptomsText.length < 20;
    } else {
        diagnoseBtn.disabled = audioChunks.length === 0;
    }
};

// Insert symptom templates
window.insertTemplate = function insertTemplate(type) {
    const textarea = document.getElementById('symptoms-text');
    if (!textarea) return;

    const templates = {
        headache: `Patient reports headache for [duration].
Location: [frontal/temporal/occipital/diffuse]
Intensity: [1-10]/10
Character: [throbbing/pressing/sharp]
Associated symptoms: [nausea, vomiting, photophobia, phonophobia]
Aggravating factors: [physical activity, light, noise]
Relieving factors: [rest, darkness, medication]
Previous episodes: [yes/no, frequency]`,

        respiratory: `Patient presents respiratory symptoms for [duration].
Main complaint: [cough/dyspnea/chest pain/congestion]
Cough: [dry/productive, color of sputum if any]
Fever: [yes/no, max temperature]
Other symptoms: [sore throat, runny nose, fatigue]
Smoking history: [yes/no, packs/day]
Exposure: [sick contacts, travel, occupational]`,

        digestive: `Patient reports gastrointestinal symptoms for [duration].
Main complaint: [abdominal pain/nausea/vomiting/diarrhea]
Pain location: [epigastric/periumbilical/RLQ/LLQ/diffuse]
Pain character: [cramping/sharp/dull/burning]
Bowel movements: [frequency, consistency, blood/mucus]
Diet changes: [recent foods, alcohol]
Associated: [fever, weight loss, appetite changes]`,

        pain: `Patient presents with pain for [duration].
Location: [specific body part]
Intensity: [1-10]/10
Character: [sharp/dull/burning/aching/throbbing]
Radiation: [yes/no, where]
Onset: [sudden/gradual, after activity/trauma]
Aggravating factors: [movement, touch, position]
Relieving factors: [rest, ice, heat, medication]
Associated symptoms: [swelling, redness, weakness, numbness]`
    };

    textarea.value = templates[type] || '';
    updateDiagnoseButton();
    textarea.focus();
};

// Submit diagnosis (handles both text and audio)
window.submitDiagnosis = async function submitDiagnosis() {
    if (currentInputMode === 'audio') {
        return submitAudioDiagnosis();
    }

    // Text-based diagnosis
    const symptomsText = document.getElementById('symptoms-text')?.value || '';
    if (symptomsText.length < 20) {
        showNotification('Please enter at least 20 characters describing the symptoms', 'warning');
        return;
    }

    const patientId = document.getElementById('patient-select')?.value || null;

    // Show loading state
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loader"></div>
            <h3>Generating Diagnosis...</h3>
            <p>Analyzing symptoms with AI...</p>
            <small>This may take a few seconds...</small>
        </div>
    `;

    try {
        const response = await csrfFetch('/api/ai/text-diagnose', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symptoms: symptomsText,
                patientId: patientId
            })
        });

        const data = await response.json();

        if (data.success) {
            displayDiagnosisResults(data);
        } else {
            showNotification('Diagnosis failed: ' + (data.error || 'Unknown error'), 'error');
            showAudioDiagnosisForm();
        }
    } catch (error) {
        console.error('Diagnosis error:', error);
        showNotification('Error connecting to diagnosis service', 'error');
        showAudioDiagnosisForm();
    }
};

// Load patients for the select dropdown
async function loadPatientsForDiagnosis() {
    try {
        const response = await fetch('/api/patients', { credentials: 'include' });
        const data = await response.json();

        const select = document.getElementById('patient-select');
        if (select && data.patients) {
            data.patients.forEach(patient => {
                const option = document.createElement('option');
                option.value = patient.id;
                option.textContent = `${patient.name} (${patient.email || 'No email'})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load patients:', error);
    }
}

// Toggle audio recording
window.toggleRecording = async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
};

// Start audio recording
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);

            const audioElement = document.getElementById('recorded-audio');
            if (audioElement) {
                audioElement.src = audioUrl;
            }

            const audioPreview = document.getElementById('audio-preview');
            if (audioPreview) {
                audioPreview.classList.remove('hidden');
            }

            const diagnoseBtn = document.getElementById('diagnose-btn');
            if (diagnoseBtn) {
                diagnoseBtn.disabled = false;
            }

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();

        // Update UI
        const recordBtn = document.getElementById('record-btn');
        const recordIcon = document.getElementById('record-icon');
        const recordText = document.getElementById('record-text');
        const indicator = document.getElementById('recording-indicator');

        if (recordBtn) recordBtn.classList.add('recording');
        if (recordIcon) recordIcon.textContent = '⏹️';
        if (recordText) recordText.textContent = 'Stop Recording';
        if (indicator) indicator.classList.remove('hidden');

        // Start timer
        updateRecordingTime();
    } catch (error) {
        console.error('Error starting recording:', error);
        showNotification('Could not access microphone. Please check permissions.', 'error');
    }
}

// Stop audio recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;

    // Update UI
    const recordBtn = document.getElementById('record-btn');
    const recordIcon = document.getElementById('record-icon');
    const recordText = document.getElementById('record-text');
    const indicator = document.getElementById('recording-indicator');

    if (recordBtn) recordBtn.classList.remove('recording');
    if (recordIcon) recordIcon.textContent = '🎤';
    if (recordText) recordText.textContent = 'Start Recording';
    if (indicator) indicator.classList.add('hidden');
}

// Update recording time display
function updateRecordingTime() {
    if (!isRecording) return;

    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');

    const timeDisplay = document.getElementById('recording-time');
    if (timeDisplay) {
        timeDisplay.textContent = `${minutes}:${seconds}`;
    }

    requestAnimationFrame(() => setTimeout(updateRecordingTime, 100));
}

// Clear recording
window.clearRecording = function clearRecording() {
    audioChunks = [];

    const audioElement = document.getElementById('recorded-audio');
    const audioPreview = document.getElementById('audio-preview');
    const diagnoseBtn = document.getElementById('diagnose-btn');

    if (audioElement) audioElement.src = '';
    if (audioPreview) audioPreview.classList.add('hidden');
    if (diagnoseBtn) diagnoseBtn.disabled = true;
};

// Submit audio for diagnosis
window.submitAudioDiagnosis = async function submitAudioDiagnosis() {
    if (audioChunks.length === 0) {
        showNotification('Please record audio first', 'warning');
        return;
    }

    const patientId = document.getElementById('patient-select')?.value || null;
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    // Convert to base64
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);

    reader.onloadend = async function() {
        const base64Audio = reader.result;

        // Show loading state
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div class="loader"></div>
                <h3>Processing Audio...</h3>
                <p>Step 1: Transcribing audio with OpenAI Whisper</p>
                <p>Step 2: Generating diagnosis with AI</p>
                <small>This may take a few seconds...</small>
            </div>
        `;

        try {
            const response = await csrfFetch('/api/ai/transcribe-diagnose', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audioData: base64Audio,
                    patientId: patientId
                })
            });

            const data = await response.json();

            if (data.success) {
                displayDiagnosisResults(data);
            } else {
                showNotification('Diagnosis failed: ' + (data.error || 'Unknown error'), 'error');
                showAudioDiagnosisForm();
            }
        } catch (error) {
            console.error('Diagnosis error:', error);
            showNotification('Error connecting to diagnosis service', 'error');
            showAudioDiagnosisForm();
        }
    };
};

// Display diagnosis results
function displayDiagnosisResults(data) {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const diagnosis = data.diagnosis;
    const urgencyColors = {
        low: '#4CAF50',
        medium: '#FF9800',
        high: '#FF5722',
        emergency: '#F44336'
    };

    const urgencyLabels = {
        low: 'Low Urgency',
        medium: 'Medium Urgency',
        high: 'High Urgency',
        emergency: 'EMERGENCY'
    };

    const safeUrgencyLevel = ['low', 'medium', 'high', 'emergency'].includes(diagnosis.urgencyLevel)
        ? diagnosis.urgencyLevel
        : 'medium';

    mainContent.innerHTML = `
        <div class="ai-diagnosis-results">
            <div class="diagnosis-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <h2>🧠 AI Diagnosis Results</h2>
                <div class="ai-models-used">
                    <span>Transcription: OpenAI Whisper</span>
                    <span>Diagnosis: Claude Opus 4.5 / GPT-5.2</span>
                </div>
            </div>

            <div class="transcript-section">
                <h3>📝 Transcription</h3>
                <div class="transcript-box">
                    <p>${escapeHtmlAI(data.transcript)}</p>
                </div>
                <div class="transcript-meta">
                    <span>Duration: ${Math.round(data.transcriptionDuration)}s</span>
                    <span>Language: ${escapeHtmlAI(data.language)}</span>
                    <span>Confidence: ${Math.round(data.confidence * 100)}%</span>
                </div>
            </div>

            <div class="urgency-banner" style="background: ${urgencyColors[safeUrgencyLevel]};">
                <h3>${urgencyLabels[safeUrgencyLevel]}</h3>
            </div>

            <div class="diagnosis-section">
                <h3>🔍 Main Symptoms Identified</h3>
                <div class="symptoms-tags">
                    ${(diagnosis.mainSymptoms || []).map(s => `<span class="symptom-tag">${escapeHtmlAI(s)}</span>`).join('')}
                </div>
                <p><strong>Duration:</strong> ${escapeHtmlAI(diagnosis.symptomDuration)}</p>
            </div>

            <div class="diagnosis-section">
                <h3>📋 Differential Diagnosis</h3>
                <div class="differential-list">
                    ${(diagnosis.differentialDiagnosis || []).map((d, i) => `
                        <div class="differential-item ${d.probability}">
                            <div class="differential-header">
                                <span class="rank">#${i + 1}</span>
                                <span class="condition">${escapeHtmlAI(d.condition)}</span>
                                <span class="probability-badge ${d.probability}">${escapeHtmlAI(d.probability)}</span>
                            </div>
                            <p class="reasoning">${escapeHtmlAI(d.reasoning)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="diagnosis-section">
                <h3>🔬 Recommended Tests</h3>
                <ul class="tests-list">
                    ${(diagnosis.recommendedTests || []).map(t => `<li>${escapeHtmlAI(t)}</li>`).join('')}
                </ul>
            </div>

            <div class="diagnosis-section">
                <h3>💊 Suggested Treatment</h3>
                <p><strong>Immediate:</strong> ${escapeHtmlAI(diagnosis.suggestedTreatment?.immediate)}</p>

                ${diagnosis.suggestedTreatment?.medications?.length > 0 ? `
                    <h4>Medications:</h4>
                    <div class="medications-list">
                        ${diagnosis.suggestedTreatment.medications.map(m => `
                            <div class="medication-item">
                                <strong>${escapeHtmlAI(m.name)}</strong>
                                <span>${escapeHtmlAI(m.dosage)} - ${escapeHtmlAI(m.frequency)}</span>
                                <small>Duration: ${escapeHtmlAI(m.duration)}</small>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${diagnosis.suggestedTreatment?.lifestyle?.length > 0 ? `
                    <h4>Lifestyle Recommendations:</h4>
                    <ul>
                        ${diagnosis.suggestedTreatment.lifestyle.map(l => `<li>${escapeHtmlAI(l)}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>

            ${diagnosis.redFlags?.length > 0 ? `
                <div class="diagnosis-section red-flags-section">
                    <h3>⚠️ Red Flags to Watch</h3>
                    <ul class="red-flags-list">
                        ${diagnosis.redFlags.map(f => `<li>${escapeHtmlAI(f)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="diagnosis-section">
                <h3>📅 Follow-up</h3>
                <p>${escapeHtmlAI(diagnosis.followUp)}</p>
                ${diagnosis.specialistReferral ? `
                    <p><strong>Specialist Referral:</strong> ${escapeHtmlAI(diagnosis.specialistReferral)}</p>
                ` : ''}
            </div>

            <div class="diagnosis-section clinical-notes">
                <h3>📝 Clinical Notes</h3>
                <p>${escapeHtmlAI(diagnosis.clinicalNotes)}</p>
            </div>

            <div class="disclaimer-section">
                <p><strong>Disclaimer:</strong> ${escapeHtmlAI(data.disclaimer)}</p>
            </div>

            <div class="diagnosis-actions">
                <button onclick="showAudioDiagnosisForm()" class="btn-primary">
                    New Diagnosis
                </button>
                <button onclick="copyDiagnosisToClipboard()" class="btn-secondary">
                    Copy to Notes
                </button>
            </div>
        </div>
    `;

    // Store diagnosis for copying
    window.lastDiagnosis = data;

    addDiagnosisResultsStyles();
}

// Copy diagnosis to clipboard
window.copyDiagnosisToClipboard = function copyDiagnosisToClipboard() {
    if (!window.lastDiagnosis) return;

    const d = window.lastDiagnosis.diagnosis;
    const text = `
AI DIAGNOSIS REPORT
==================
Transcription: ${window.lastDiagnosis.transcript}

MAIN SYMPTOMS: ${(d.mainSymptoms || []).join(', ')}
Duration: ${d.symptomDuration}
Urgency: ${d.urgencyLevel}

DIFFERENTIAL DIAGNOSIS:
${(d.differentialDiagnosis || []).map((dx, i) => `${i+1}. ${dx.condition} (${dx.probability}) - ${dx.reasoning}`).join('\n')}

RECOMMENDED TESTS:
${(d.recommendedTests || []).map(t => `- ${t}`).join('\n')}

TREATMENT:
Immediate: ${d.suggestedTreatment?.immediate}
${(d.suggestedTreatment?.medications || []).map(m => `- ${m.name} ${m.dosage} ${m.frequency} (${m.duration})`).join('\n')}

RED FLAGS:
${(d.redFlags || []).map(f => `! ${f}`).join('\n')}

FOLLOW-UP: ${d.followUp}
${d.specialistReferral ? `Referral: ${d.specialistReferral}` : ''}

CLINICAL NOTES: ${d.clinicalNotes}

---
Generated by MediConnect Pro AI (Claude Opus 4.5 / GPT-5.2)
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
        showNotification('Diagnosis copied to clipboard', 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
};

// Add CSS for audio diagnosis form
function addAudioDiagnosisStyles() {
    if (document.getElementById('audio-diagnosis-styles')) return;

    const style = document.createElement('style');
    style.id = 'audio-diagnosis-styles';
    style.innerHTML = `
        .ai-audio-diagnosis-form {
            max-width: 800px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .ai-models-badge {
            margin-top: 15px;
            padding: 8px 16px;
            background: rgba(255,255,255,0.2);
            border-radius: 20px;
            font-size: 14px;
        }

        .audio-recorder-section {
            background: #f8f9fa;
            padding: 30px;
            margin: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .recorder-controls {
            margin: 20px 0;
        }

        .btn-record {
            background: #4A90E2;
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 18px;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }

        .btn-record:hover {
            background: #357ABD;
            transform: scale(1.05);
        }

        .btn-record.recording {
            background: #F44336;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4); }
            50% { box-shadow: 0 0 0 20px rgba(244, 67, 54, 0); }
        }

        .recording-indicator {
            margin-top: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .recording-pulse {
            width: 12px;
            height: 12px;
            background: #F44336;
            border-radius: 50%;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .hidden {
            display: none !important;
        }

        .audio-preview {
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
        }

        .audio-preview audio {
            width: 100%;
            margin-bottom: 10px;
        }

        .btn-small {
            padding: 8px 16px;
            font-size: 14px;
        }

        .form-select {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }

        /* Input Mode Tabs */
        .input-mode-tabs {
            display: flex;
            margin: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #4A90E2;
        }

        .tab-btn {
            flex: 1;
            padding: 15px 20px;
            border: none;
            background: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }

        .tab-btn:first-child {
            border-right: 1px solid #4A90E2;
        }

        .tab-btn.active {
            background: #4A90E2;
            color: white;
        }

        .tab-btn:hover:not(.active) {
            background: #f0f7ff;
        }

        /* Text Input Section */
        .text-input-section {
            padding: 30px;
            margin: 0 20px 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .text-input-section h3 {
            margin-top: 0;
            color: #333;
        }

        .symptoms-textarea {
            width: 100%;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            min-height: 150px;
            transition: border-color 0.3s;
        }

        .symptoms-textarea:focus {
            outline: none;
            border-color: #4A90E2;
        }

        .symptom-templates {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
        }

        .template-btn {
            padding: 8px 16px;
            margin: 5px;
            border: 1px solid #4A90E2;
            background: white;
            color: #4A90E2;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s;
        }

        .template-btn:hover {
            background: #4A90E2;
            color: white;
        }

        /* API Warning */
        .api-warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 13px;
        }
    `;
    document.head.appendChild(style);
}

// Add CSS for diagnosis results
function addDiagnosisResultsStyles() {
    if (document.getElementById('diagnosis-results-styles')) return;

    const style = document.createElement('style');
    style.id = 'diagnosis-results-styles';
    style.innerHTML = `
        .ai-diagnosis-results {
            max-width: 900px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .diagnosis-header {
            color: white;
            padding: 30px;
            text-align: center;
        }

        .ai-models-used {
            margin-top: 15px;
            display: flex;
            justify-content: center;
            gap: 20px;
            font-size: 13px;
            opacity: 0.9;
        }

        .transcript-section {
            padding: 20px 30px;
            background: #f8f9fa;
        }

        .transcript-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4A90E2;
            font-style: italic;
        }

        .transcript-meta {
            margin-top: 10px;
            display: flex;
            gap: 20px;
            font-size: 13px;
            color: #666;
        }

        .urgency-banner {
            color: white;
            padding: 15px;
            text-align: center;
        }

        .urgency-banner h3 {
            margin: 0;
        }

        .diagnosis-section {
            padding: 20px 30px;
            border-bottom: 1px solid #eee;
        }

        .symptoms-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 10px 0;
        }

        .symptom-tag {
            background: #e3f2fd;
            color: #1976d2;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
        }

        .differential-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .differential-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4A90E2;
        }

        .differential-item.alta {
            border-left-color: #4CAF50;
        }

        .differential-item.media {
            border-left-color: #FF9800;
        }

        .differential-item.baja {
            border-left-color: #9E9E9E;
        }

        .differential-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }

        .rank {
            background: #333;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }

        .condition {
            font-weight: bold;
            flex: 1;
        }

        .probability-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            text-transform: uppercase;
        }

        .probability-badge.alta {
            background: #e8f5e9;
            color: #2e7d32;
        }

        .probability-badge.media {
            background: #fff3e0;
            color: #ef6c00;
        }

        .probability-badge.baja {
            background: #f5f5f5;
            color: #757575;
        }

        .reasoning {
            margin: 0;
            color: #666;
            font-size: 14px;
        }

        .medications-list {
            display: grid;
            gap: 10px;
            margin-top: 10px;
        }

        .medication-item {
            background: #f0f7ff;
            padding: 12px;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .red-flags-section {
            background: #fff3e0;
        }

        .red-flags-list li {
            color: #e65100;
            margin: 8px 0;
        }

        .clinical-notes {
            background: #f5f5f5;
        }

        .disclaimer-section {
            padding: 15px 30px;
            background: #fff8e1;
            font-size: 13px;
            color: #6d4c41;
        }

        .diagnosis-actions {
            padding: 30px;
            text-align: center;
            background: #fafafa;
        }

        .diagnosis-actions button {
            margin: 10px;
        }
    `;
    document.head.appendChild(style);
}

// Initialize AI Assistant on page load
document.addEventListener('DOMContentLoaded', async () => {

    // Check AI service status
    const status = await checkAIStatus();
    if (status) {


    }
});

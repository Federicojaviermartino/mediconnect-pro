// AI Assistant functionality for MediConnect Pro

// Check AI Service Status
async function checkAIStatus() {
    try {
        const response = await fetch('/api/ai/status');
        const data = await response.json();

        if (data.success) {
            console.log('AI Services Status:', data);
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
        const response = await fetch('/api/ai/triage', {
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
            showNotification('Error al realizar el triaje: ' + (data.error || 'Error desconocido'), 'error');
        }
    } catch (error) {
        console.error('Triage error:', error);
        showNotification('Error al conectar con el servicio de triaje', 'error');
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
        low: 'Baja Urgencia',
        medium: 'Urgencia Media',
        high: 'Urgencia Alta',
        emergency: 'EMERGENCIA'
    };

    const urgencyIcons = {
        low: '✅',
        medium: '⚠️',
        high: '🔴',
        emergency: '🚨'
    };

    mainContent.innerHTML = `
        <div class="ai-triage-results">
            <div class="triage-header" style="background: ${urgencyColors[triage.urgencyLevel]};">
                <h2>${urgencyIcons[triage.urgencyLevel]} ${urgencyLabels[triage.urgencyLevel]}</h2>
                <p>${triage.urgencyReason}</p>
            </div>

            ${triage.immediateAction ? `
                <div class="emergency-alert">
                    <h3>🚨 ACCIÓN INMEDIATA REQUERIDA</h3>
                    <p>Por favor, busca atención médica de emergencia inmediatamente o llama al 911/112.</p>
                </div>
            ` : ''}

            <div class="triage-section">
                <h3>Posibles Condiciones</h3>
                <ul class="conditions-list">
                    ${triage.possibleConditions.map(condition => `<li>${condition}</li>`).join('')}
                </ul>
            </div>

            <div class="triage-section">
                <h3>Especialidad Recomendada</h3>
                <p class="specialty-badge">${triage.recommendedSpecialty}</p>
            </div>

            ${triage.redFlags && triage.redFlags.length > 0 ? `
                <div class="triage-section red-flags">
                    <h3>⚠️ Señales de Alarma</h3>
                    <ul>
                        ${triage.redFlags.map(flag => `<li>${flag}</li>`).join('')}
                    </ul>
                    <p><strong>Si experimentas alguna de estas señales, busca atención médica inmediata.</strong></p>
                </div>
            ` : ''}

            <div class="triage-section">
                <h3>Recomendaciones</h3>
                <ul class="recommendations-list">
                    ${triage.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>

            ${triage.questions && triage.questions.length > 0 ? `
                <div class="triage-section">
                    <h3>Preguntas para tu Médico</h3>
                    <ul class="questions-list">
                        ${triage.questions.map(q => `<li>${q}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <div class="triage-actions">
                <button onclick="scheduleAppointment('${triage.recommendedSpecialty}')" class="btn-primary">
                    Agendar Cita con ${triage.recommendedSpecialty}
                </button>
                <button onclick="showTriageForm()" class="btn-secondary">
                    Nuevo Análisis
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

    mainContent.innerHTML = `
        <div class="ai-triage-form">
            <div class="form-header">
                <h2>🤖 Asistente de Triaje con IA</h2>
                <p>Describe tus síntomas y te ayudaremos a determinar el nivel de urgencia</p>
            </div>

            <div class="form-content">
                <div class="form-group">
                    <label for="symptoms">Describe tus síntomas:</label>
                    <textarea
                        id="symptoms"
                        rows="8"
                        placeholder="Ejemplo: Tengo dolor de cabeza desde hace 3 días, con náuseas por la mañana y sensibilidad a la luz..."
                        class="form-textarea"
                    ></textarea>
                    <small>Sé lo más detallado posible: cuándo comenzó, intensidad, síntomas asociados, etc.</small>
                </div>

                <div class="form-actions">
                    <button onclick="submitTriageForm()" class="btn-primary">
                        Analizar Síntomas
                    </button>
                </div>

                <div class="disclaimer">
                    <p><strong>Aviso Importante:</strong> Esta herramienta es solo informativa y no reemplaza una consulta médica profesional. En caso de emergencia, llama al 911/112.</p>
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
        showNotification('Por favor describe tus síntomas', 'warning');
        return;
    }

    if (symptoms.length < 20) {
        showNotification('Por favor proporciona una descripción más detallada de tus síntomas', 'warning');
        return;
    }

    // Show loading state
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loader"></div>
            <h3>Analizando síntomas...</h3>
            <p>Nuestro asistente de IA está evaluando tu información</p>
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
    showNotification(`Redirigiendo a agendamiento para ${specialty}...`, 'info');

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

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Initialize AI Assistant on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🤖 AI Assistant module loaded');

    // Check AI service status
    const status = await checkAIStatus();
    if (status) {
        console.log('AI Services available:', status.services);
        console.log('Mode:', status.mode);
    }
});

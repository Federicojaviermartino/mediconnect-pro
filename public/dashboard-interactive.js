// Interactive dashboard functionality

// Navigation between pages
function navigateTo(page) {
    // Show notification
    showNotification(`Navigating to ${page}...`, 'info');

    // In a real app, this would navigate to the actual page
    setTimeout(() => {
        showNotification(`${page} page would load here in the full application`, 'info');
    }, 500);
}

// Show notifications
function showNotification(message, type = 'success') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// View patient details
function viewPatientDetails(patientId, patientName) {
    showNotification(`Loading details for ${patientName}...`, 'info');

    // Simulate loading patient data
    setTimeout(() => {
        const modal = createModal('Patient Details', `
            <div class="patient-detail-modal">
                <h3>${patientName}</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Patient ID:</strong> ${patientId}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> Active
                    </div>
                    <div class="detail-item">
                        <strong>Last Visit:</strong> 2 days ago
                    </div>
                    <div class="detail-item">
                        <strong>Next Appointment:</strong> Tomorrow, 10:00 AM
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="showNotification('Prescriptions feature coming soon!', 'info')" class="btn-small">View Prescriptions</button>
                    <button onclick="showNotification('Medical history feature coming soon!', 'info')" class="btn-small">Medical History</button>
                    <button onclick="showNotification('Scheduling feature coming soon!', 'info')" class="btn-small">Schedule Appointment</button>
                </div>
            </div>
        `);
        document.body.appendChild(modal);
    }, 500);
}

// Create modal
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    };

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    return modal;
}

// Schedule appointment
function scheduleAppointment() {
    const modal = createModal('Schedule Appointment', `
        <div class="appointment-form">
            <div class="form-group">
                <label>Select Date</label>
                <input type="date" id="apt-date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>Select Time</label>
                <select id="apt-time" class="form-input">
                    <option>09:00</option>
                    <option>10:00</option>
                    <option>11:00</option>
                    <option>14:00</option>
                    <option>15:00</option>
                    <option>16:00</option>
                </select>
            </div>
            <div class="form-group">
                <label>Reason for Visit</label>
                <textarea id="apt-reason" class="form-input" rows="3" placeholder="Brief description..."></textarea>
            </div>
            <button onclick="confirmAppointment()" class="btn-primary-modal">Confirm Appointment</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function confirmAppointment() {
    const date = document.getElementById('apt-date').value;
    const time = document.getElementById('apt-time').value;
    const reason = document.getElementById('apt-reason').value;

    if (!date || !time || !reason) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time, reason })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Appointment scheduled successfully!', 'success');
            document.querySelector('.modal-overlay').remove();
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification(data.error || 'Failed to schedule appointment', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Request prescription
function requestPrescription() {
    const modal = createModal('Request Prescription Refill', `
        <div class="prescription-form">
            <div class="form-group">
                <label>Medication Name</label>
                <input type="text" id="presc-medication" class="form-input" placeholder="Enter medication name">
            </div>
            <div class="form-group">
                <label>Dosage (optional)</label>
                <input type="text" id="presc-dosage" class="form-input" placeholder="e.g., 10mg">
            </div>
            <div class="form-group">
                <label>Pharmacy</label>
                <select id="presc-pharmacy" class="form-input">
                    <option>Main Street Pharmacy</option>
                    <option>HealthPlus Pharmacy</option>
                    <option>MediCare Pharmacy</option>
                </select>
            </div>
            <div class="form-group">
                <label>Additional Notes</label>
                <textarea id="presc-notes" class="form-input" rows="2" placeholder="Any special instructions..."></textarea>
            </div>
            <button onclick="confirmPrescription()" class="btn-primary-modal">Submit Request</button>
        </div>
    `);
    document.body.appendChild(modal);
}

async function confirmPrescription() {
    const medication = document.getElementById('presc-medication').value;
    const dosage = document.getElementById('presc-dosage').value;
    const pharmacy = document.getElementById('presc-pharmacy').value;
    const notes = document.getElementById('presc-notes').value;

    if (!medication || !pharmacy) {
        showNotification('Please fill required fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/prescriptions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ medication, dosage, pharmacy, notes })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showNotification('Prescription request submitted!', 'success');
            document.querySelector('.modal-overlay').remove();
            setTimeout(() => location.reload(), 1500);
        } else {
            showNotification(data.error || 'Failed to submit prescription', 'error');
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
    }
}

// Manage users (admin)
function manageUsers() {
    const modal = createModal('User Management', `
        <div class="user-management">
            <div class="user-list">
                <div class="user-item">
                    <span>👨‍⚕️ Dr. Sarah Smith</span>
                    <span class="badge-success">Active</span>
                </div>
                <div class="user-item">
                    <span>🧑‍💼 John Doe</span>
                    <span class="badge-success">Active</span>
                </div>
                <div class="user-item">
                    <span>👑 Admin User</span>
                    <span class="badge-success">Active</span>
                </div>
            </div>
            <button onclick="showNotification('Add user feature coming soon!', 'info')" class="btn-primary-modal">Add New User</button>
        </div>
    `);
    document.body.appendChild(modal);
}

// System settings (admin)
function systemSettings() {
    const modal = createModal('System Settings', `
        <div class="settings-panel">
            <div class="setting-item">
                <label class="setting-label">
                    <input type="checkbox" checked> Email Notifications
                </label>
            </div>
            <div class="setting-item">
                <label class="setting-label">
                    <input type="checkbox" checked> SMS Alerts
                </label>
            </div>
            <div class="setting-item">
                <label class="setting-label">
                    <input type="checkbox"> Two-Factor Authentication
                </label>
            </div>
            <div class="setting-item">
                <label class="setting-label">
                    <input type="checkbox" checked> Automatic Backups
                </label>
            </div>
            <button onclick="saveSettings()" class="btn-primary-modal">Save Settings</button>
        </div>
    `);
    document.body.appendChild(modal);
}

function saveSettings() {
    showNotification('Settings saved successfully!', 'success');
    document.querySelector('.modal-overlay').remove();
}

// Generate report (admin)
function generateReport() {
    showNotification('Generating report...', 'info');
    setTimeout(() => {
        showNotification('Report generated! Download started.', 'success');
    }, 2000);
}

// View audit logs (admin)
function viewAuditLogs() {
    const modal = createModal('Audit Logs', `
        <div class="audit-logs">
            <div class="log-item">
                <span class="log-time">2025-10-14 10:31:21</span>
                <span class="log-action">Admin logged in</span>
                <span class="log-user">admin@mediconnect.demo</span>
            </div>
            <div class="log-item">
                <span class="log-time">2025-10-14 09:15:43</span>
                <span class="log-action">Patient record updated</span>
                <span class="log-user">dr.smith@mediconnect.demo</span>
            </div>
            <div class="log-item">
                <span class="log-time">2025-10-14 08:22:11</span>
                <span class="log-action">User logged in</span>
                <span class="log-user">john.doe@mediconnect.demo</span>
            </div>
        </div>
    `);
    document.body.appendChild(modal);
}

// Contact doctor (patient)
function contactDoctor() {
    const modal = createModal('Contact Doctor', `
        <div class="contact-form">
            <div class="form-group">
                <label>Select Doctor</label>
                <select class="form-input">
                    <option>Dr. Sarah Smith - General Practitioner</option>
                    <option>Dr. Michael Johnson - Cardiologist</option>
                </select>
            </div>
            <div class="form-group">
                <label>Subject</label>
                <input type="text" class="form-input" placeholder="Brief subject">
            </div>
            <div class="form-group">
                <label>Message</label>
                <textarea class="form-input" rows="4" placeholder="Your message..."></textarea>
            </div>
            <button onclick="sendMessage()" class="btn-primary-modal">Send Message</button>
        </div>
    `);
    document.body.appendChild(modal);
}

function sendMessage() {
    showNotification('Message sent to doctor!', 'success');
    document.querySelector('.modal-overlay').remove();
}

// Export vitals data
function exportVitals() {
    showNotification('Exporting vital signs data...', 'info');
    setTimeout(() => {
        showNotification('Data exported successfully! Download started.', 'success');
    }, 1500);
}

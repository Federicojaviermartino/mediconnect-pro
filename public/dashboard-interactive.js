// Interactive dashboard functionality

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.mobile-overlay');

    sidebar.classList.toggle('mobile-active');
    overlay.classList.toggle('active');
}

// Close mobile menu when clicking nav items
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                toggleMobileMenu();
            }
        });
    });
});

// Navigation between pages
function navigateTo(page) {
    // Close mobile menu if open
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        if (sidebar.classList.contains('mobile-active')) {
            sidebar.classList.remove('mobile-active');
            overlay.classList.remove('active');
        }
    }

    // Route to specific functions based on page
    switch(page) {
        case 'Patients':
            viewAllPatients();
            break;
        case 'My Vitals':
            viewMyVitals();
            break;
        case 'Appointments':
            viewAppointments();
            break;
        case 'Medications':
            viewMedications();
            break;
        case 'Medical Records':
            viewMedicalRecords();
            break;
        case 'Prescriptions':
            viewPrescriptions();
            break;
        case 'Analytics':
            viewAnalytics();
            break;
        case 'Users':
            manageUsers();
            break;
        case 'Reports':
            viewReports();
            break;
        case 'Settings':
            systemSettings();
            break;
        default:
            showNotification(`${page} feature is being developed`, 'info');
    }
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

// View all patients (Doctor)
async function viewAllPatients() {
    try {
        const response = await fetch('/api/patients');
        const data = await response.json();

        if (response.ok && data.patients) {
            const modal = createModal('All Patients', `
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Blood Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.patients.map(patient => `
                                <tr>
                                    <td><strong>${patient.name}</strong></td>
                                    <td>${patient.email}</td>
                                    <td><span class="badge">${patient.blood_type || 'N/A'}</span></td>
                                    <td>
                                        <button class="btn-small" onclick="viewPatientDetails(${patient.id}, '${patient.name}')">View</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `);
            document.body.appendChild(modal);
        } else {
            throw new Error('Failed to load patients');
        }
    } catch (error) {
        showNotification('Error loading patients', 'error');
    }
}

// View appointments
async function viewAppointments() {
    try {
        const response = await fetch('/api/appointments');
        const data = await response.json();

        if (response.ok && data.appointments) {
            const modal = createModal('My Appointments', `
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Reason</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.appointments.length > 0 ? data.appointments.map(apt => `
                                <tr>
                                    <td>${apt.date}</td>
                                    <td>${apt.time}</td>
                                    <td>${apt.reason}</td>
                                    <td><span class="badge">${apt.status}</span></td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 40px;">No appointments found</td></tr>'}
                        </tbody>
                    </table>
                    <div style="margin-top: 20px;">
                        <button onclick="this.closest('.modal-overlay').remove(); scheduleAppointment();" class="btn-primary-modal">Schedule New Appointment</button>
                    </div>
                </div>
            `);
            document.body.appendChild(modal);
        }
    } catch (error) {
        showNotification('Error loading appointments', 'error');
    }
}

// View prescriptions
async function viewPrescriptions() {
    try {
        const response = await fetch('/api/prescriptions');
        const data = await response.json();

        if (response.ok && data.prescriptions) {
            const modal = createModal('My Prescriptions', `
                <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Medication</th>
                                <th>Dosage</th>
                                <th>Frequency</th>
                                <th>Pharmacy</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.prescriptions.length > 0 ? data.prescriptions.map(presc => `
                                <tr>
                                    <td><strong>${presc.medication}</strong></td>
                                    <td>${presc.dosage}</td>
                                    <td>${presc.frequency}</td>
                                    <td>${presc.pharmacy}</td>
                                    <td><span class="badge">${presc.status}</span></td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="text-align: center; padding: 40px;">No prescriptions found</td></tr>'}
                        </tbody>
                    </table>
                    <div style="margin-top: 20px;">
                        <button onclick="this.closest('.modal-overlay').remove(); requestPrescription();" class="btn-primary-modal">Request Prescription</button>
                    </div>
                </div>
            `);
            document.body.appendChild(modal);
        }
    } catch (error) {
        showNotification('Error loading prescriptions', 'error');
    }
}

// View my vitals (Patient)
function viewMyVitals() {
    const modal = createModal('My Vital Signs', `
        <div style="max-height: 500px; overflow-y: auto;">
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-icon">❤️</div>
                    <div class="stat-info">
                        <div class="stat-label">Heart Rate</div>
                        <div class="stat-value">72 <span class="stat-unit">bpm</span></div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🩺</div>
                    <div class="stat-info">
                        <div class="stat-label">Blood Pressure</div>
                        <div class="stat-value">120/80</div>
                    </div>
                </div>
            </div>
            <div class="table-container">
                <h3 style="margin-bottom: 12px;">Recent Readings</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Heart Rate</th>
                            <th>BP</th>
                            <th>Temp</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Today</td>
                            <td>72 bpm</td>
                            <td>120/80</td>
                            <td>36.6°C</td>
                        </tr>
                        <tr>
                            <td>Yesterday</td>
                            <td>75 bpm</td>
                            <td>125/82</td>
                            <td>36.7°C</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 20px;">
                <button onclick="exportVitals()" class="btn-primary-modal">Export Data</button>
            </div>
        </div>
    `);
    document.body.appendChild(modal);
}

// View medications (Patient)
function viewMedications() {
    viewPrescriptions(); // Reuse prescriptions view
}

// View medical records (Patient)
function viewMedicalRecords() {
    const modal = createModal('Medical Records', `
        <div style="max-height: 500px; overflow-y: auto;">
            <div class="detail-grid" style="margin-bottom: 20px;">
                <div class="detail-item">
                    <strong>Blood Type:</strong> A+
                </div>
                <div class="detail-item">
                    <strong>Allergies:</strong> Penicillin
                </div>
                <div class="detail-item">
                    <strong>Conditions:</strong> Hypertension
                </div>
                <div class="detail-item">
                    <strong>Last Checkup:</strong> 2 weeks ago
                </div>
            </div>
            <h3 style="margin: 20px 0 12px;">Recent Visits</h3>
            <div class="activity-list">
                <div class="activity-item">
                    <span class="activity-icon">🏥</span>
                    <div class="activity-content">
                        <div class="activity-title">General Checkup</div>
                        <div class="activity-time">2 weeks ago</div>
                    </div>
                </div>
                <div class="activity-item">
                    <span class="activity-icon">💉</span>
                    <div class="activity-content">
                        <div class="activity-title">Blood Test</div>
                        <div class="activity-time">1 month ago</div>
                    </div>
                </div>
            </div>
        </div>
    `);
    document.body.appendChild(modal);
}

// View analytics
function viewAnalytics() {
    const modal = createModal('Analytics Dashboard', `
        <div style="max-height: 500px; overflow-y: auto;">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-info">
                        <div class="stat-label">Total Users</div>
                        <div class="stat-value">3</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-info">
                        <div class="stat-label">Active Sessions</div>
                        <div class="stat-value">1</div>
                    </div>
                </div>
            </div>
            <div style="margin-top: 20px; padding: 40px; background: #f8fafc; border-radius: 8px; text-align: center;">
                <p style="color: #64748b; margin-bottom: 16px;">📊 Advanced analytics charts and visualizations coming soon!</p>
                <button onclick="generateReport()" class="btn-primary-modal">Generate Report</button>
            </div>
        </div>
    `);
    document.body.appendChild(modal);
}

// View reports (Admin)
function viewReports() {
    const modal = createModal('System Reports', `
        <div style="max-height: 500px; overflow-y: auto;">
            <div class="overview-card" style="margin-bottom: 16px;">
                <h3>Available Reports</h3>
                <div class="activity-list">
                    <div class="activity-item" style="cursor: pointer;" onclick="generateReport()">
                        <span class="activity-icon">📄</span>
                        <div class="activity-content">
                            <div class="activity-title">User Activity Report</div>
                            <div class="activity-time">Generate comprehensive user activity</div>
                        </div>
                    </div>
                    <div class="activity-item" style="cursor: pointer;" onclick="generateReport()">
                        <span class="activity-icon">💊</span>
                        <div class="activity-content">
                            <div class="activity-title">Prescription Report</div>
                            <div class="activity-time">View all prescriptions data</div>
                        </div>
                    </div>
                    <div class="activity-item" style="cursor: pointer;" onclick="generateReport()">
                        <span class="activity-icon">📅</span>
                        <div class="activity-content">
                            <div class="activity-title">Appointments Report</div>
                            <div class="activity-time">Analyze appointment trends</div>
                        </div>
                    </div>
                </div>
            </div>
            <button onclick="viewAuditLogs()" class="btn-primary-modal">View Audit Logs</button>
        </div>
    `);
    document.body.appendChild(modal);
}

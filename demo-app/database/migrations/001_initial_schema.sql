-- MediConnect Pro - PostgreSQL Database Schema
-- Migration 001: Initial Schema
-- Created: 2025-10-16
-- Description: Creates all core tables for the telemedicine platform

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- Stores authentication and basic user information
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hashed
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Index for faster email lookups (login)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================================================
-- PATIENTS TABLE
-- Extended medical information for patient users
-- ============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_type VARCHAR(5),
    allergies TEXT,
    conditions TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    insurance_provider VARCHAR(255),
    insurance_member_id VARCHAR(100),
    last_eligibility_check TIMESTAMP WITH TIME ZONE,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster patient lookups
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_insurance ON patients(insurance_provider);

-- ============================================================================
-- VITAL_SIGNS TABLE
-- Patient vital signs recorded over time
-- ============================================================================
CREATE TABLE IF NOT EXISTS vital_signs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    heart_rate INTEGER,
    blood_pressure VARCHAR(20), -- Format: "120/80"
    temperature DECIMAL(4, 2), -- In Celsius
    oxygen_saturation INTEGER, -- Percentage (0-100)
    weight DECIMAL(5, 2), -- In kg
    height DECIMAL(5, 2), -- In cm
    glucose_level INTEGER, -- mg/dL
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER REFERENCES users(id),
    device_source VARCHAR(100), -- e.g., "Apple Health", "Manual Entry"
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for time-series queries
CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_recorded_at ON vital_signs(recorded_at DESC);
CREATE INDEX idx_vital_signs_patient_time ON vital_signs(patient_id, recorded_at DESC);

-- ============================================================================
-- APPOINTMENTS TABLE
-- Scheduled consultations between doctors and patients
-- ============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    type VARCHAR(100) DEFAULT 'Consultation',
    reason TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (
        status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')
    ),
    notes TEXT,
    pre_authorization JSONB, -- Insurance pre-auth data
    pre_auth_date TIMESTAMP WITH TIME ZONE,
    claim JSONB, -- Insurance claim data
    claim_submitted_date TIMESTAMP WITH TIME ZONE,
    video_room_id VARCHAR(255),
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT future_appointment CHECK (appointment_date >= CURRENT_DATE)
);

-- Indexes for appointment queries
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date DESC);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, appointment_date DESC);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date DESC);

-- ============================================================================
-- PRESCRIPTIONS TABLE
-- Medication prescriptions issued by doctors
-- ============================================================================
CREATE TABLE IF NOT EXISTS prescriptions (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    medication VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(255) NOT NULL,
    duration VARCHAR(100),
    quantity INTEGER,
    refills INTEGER DEFAULT 0,
    pharmacy VARCHAR(255),
    pharmacy_id VARCHAR(100),
    order_id VARCHAR(100),
    order_status VARCHAR(50),
    sent_to_pharmacy_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'active', 'filled', 'dispensed', 'completed', 'cancelled')
    ),
    instructions TEXT,
    notes TEXT,
    prescribed_date DATE DEFAULT CURRENT_DATE,
    expiration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for prescription queries
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_pharmacy_order ON prescriptions(order_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescribed_date DESC);

-- ============================================================================
-- MESSAGES TABLE
-- Patient-doctor messaging system
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for message queries
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- MEDICAL_RECORDS TABLE
-- Consultation notes and medical history
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    record_type VARCHAR(50) DEFAULT 'consultation' CHECK (
        record_type IN ('consultation', 'lab_result', 'imaging', 'procedure', 'diagnosis', 'note')
    ),
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    notes TEXT,
    ai_generated BOOLEAN DEFAULT false,
    attachments JSONB, -- File references
    record_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for medical records
CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor ON medical_records(doctor_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_date ON medical_records(record_date DESC);
CREATE INDEX idx_medical_records_type ON medical_records(record_type);

-- ============================================================================
-- SESSIONS TABLE
-- Store user sessions (alternative to Redis/in-memory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR(255) PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for session expiration cleanup
CREATE INDEX idx_sessions_expire ON sessions(expire);

-- ============================================================================
-- AUDIT_LOG TABLE
-- Track important system events for compliance and security
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit queries
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- System notifications for users (email, SMS, push)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('email', 'sms', 'push', 'in_app')
    ),
    title VARCHAR(255),
    message TEXT NOT NULL,
    data JSONB, -- Additional notification data
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'delivered', 'failed', 'read')
    ),
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- TRIGGERS
-- Automatically update updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS
-- Convenient views for common queries
-- ============================================================================

-- Patient summary view with user information
CREATE OR REPLACE VIEW patient_summary AS
SELECT
    p.id,
    p.user_id,
    u.name,
    u.email,
    u.phone,
    p.blood_type,
    p.allergies,
    p.conditions,
    p.insurance_provider,
    p.insurance_member_id,
    p.last_eligibility_check,
    p.date_of_birth,
    p.gender,
    u.created_at
FROM patients p
JOIN users u ON p.user_id = u.id
WHERE u.is_active = true;

-- Upcoming appointments view
CREATE OR REPLACE VIEW upcoming_appointments AS
SELECT
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.type,
    a.status,
    p_user.name AS patient_name,
    p_user.email AS patient_email,
    d_user.name AS doctor_name,
    d_user.specialization AS doctor_specialization,
    a.created_at
FROM appointments a
JOIN users p_user ON a.patient_id = p_user.id
JOIN users d_user ON a.doctor_id = d_user.id
WHERE a.appointment_date >= CURRENT_DATE
  AND a.status NOT IN ('cancelled', 'completed')
ORDER BY a.appointment_date, a.appointment_time;

-- Active prescriptions view
CREATE OR REPLACE VIEW active_prescriptions AS
SELECT
    pr.id,
    pr.medication,
    pr.dosage,
    pr.frequency,
    pr.status,
    p_user.name AS patient_name,
    d_user.name AS doctor_name,
    pr.prescribed_date,
    pr.expiration_date,
    pr.pharmacy
FROM prescriptions pr
JOIN users p_user ON pr.patient_id = p_user.id
JOIN users d_user ON pr.doctor_id = d_user.id
WHERE pr.status IN ('active', 'filled')
ORDER BY pr.prescribed_date DESC;

-- ============================================================================
-- COMMENTS
-- Document table purposes
-- ============================================================================
COMMENT ON TABLE users IS 'Core user authentication and profile information';
COMMENT ON TABLE patients IS 'Extended medical information for patient users';
COMMENT ON TABLE vital_signs IS 'Time-series vital sign measurements';
COMMENT ON TABLE appointments IS 'Scheduled consultations between doctors and patients';
COMMENT ON TABLE prescriptions IS 'Medication prescriptions issued by doctors';
COMMENT ON TABLE messages IS 'Patient-doctor secure messaging';
COMMENT ON TABLE medical_records IS 'Clinical notes and medical history';
COMMENT ON TABLE sessions IS 'User session storage for authentication';
COMMENT ON TABLE audit_log IS 'Security and compliance audit trail';
COMMENT ON TABLE notifications IS 'System notifications (email, SMS, push, in-app)';

-- Migration complete
COMMENT ON EXTENSION "uuid-ossp" IS 'MediConnect Pro PostgreSQL Schema - Migration 001 - Initial Schema';

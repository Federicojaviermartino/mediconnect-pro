-- MediConnect Pro - Demo Data Seeding
-- Migration 002: Seed Demo Data
-- Created: 2025-10-16
-- Description: Populates database with demo users, patients, and sample data

-- Note: Passwords are bcrypt hashed with 10 rounds
-- Admin password: Demo2024!Admin
-- Doctor password: Demo2024!Doctor
-- Patient password: Demo2024!Patient

-- ============================================================================
-- INSERT DEMO USERS
-- ============================================================================
INSERT INTO users (id, email, password, role, name, specialization, phone, created_at) VALUES
(1, 'admin@mediconnect.demo', '$2a$10$jCnLCuM7.TugbRWTtL9B6OpjdfJ.xirasOKXpWT4eMtc60oAT0HO6', 'admin', 'Admin User', NULL, '+1-555-0100', '2025-10-15T08:46:54.487Z'),
(2, 'dr.smith@mediconnect.demo', '$2a$10$6tgAYUEI3M.cYi63XSUjI..ANjPAm6p16JUTNNTvSq5fg6MdoJCe2', 'doctor', 'Dr. Sarah Smith', 'General Practitioner', '+1-555-0200', '2025-10-15T08:46:54.489Z'),
(3, 'john.doe@mediconnect.demo', '$2a$10$Ej8u6fV9xyH8HwIh2X9J.OvNQcarvQ3.5ex9hiWR9RriU.59W9zD6', 'patient', 'John Doe', NULL, '+1-555-0300', '2025-10-15T08:46:54.489Z')
ON CONFLICT (email) DO NOTHING;

-- Reset sequence to continue from 4
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ============================================================================
-- INSERT DEMO PATIENTS
-- ============================================================================
INSERT INTO patients (
    user_id,
    blood_type,
    allergies,
    conditions,
    insurance_provider,
    insurance_member_id,
    last_eligibility_check,
    date_of_birth,
    gender,
    address,
    city,
    state,
    zip_code,
    country
) VALUES
(
    3,
    'A+',
    'Penicillin',
    'Hypertension',
    'Blue Cross Blue Shield',
    'BCBS-123456789',
    '2025-10-15T16:09:34.895Z',
    '1985-03-15',
    'Male',
    '123 Main Street',
    'Springfield',
    'Illinois',
    '62701',
    'USA'
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- INSERT DEMO VITAL SIGNS
-- ============================================================================
INSERT INTO vital_signs (
    patient_id,
    heart_rate,
    blood_pressure,
    temperature,
    oxygen_saturation,
    weight,
    height,
    recorded_at,
    device_source
) VALUES
-- Recent vitals
(1, 72, '120/80', 36.6, 98, 75.5, 175.0, CURRENT_TIMESTAMP - INTERVAL '2 hours', 'Manual Entry'),
(1, 75, '125/82', 36.7, 97, 75.3, 175.0, CURRENT_TIMESTAMP - INTERVAL '1 day', 'Apple Health'),
(1, 68, '118/78', 36.5, 99, 75.8, 175.0, CURRENT_TIMESTAMP - INTERVAL '2 days', 'Manual Entry'),
-- Older vitals for trend analysis
(1, 70, '122/79', 36.6, 98, 76.0, 175.0, CURRENT_TIMESTAMP - INTERVAL '1 week', 'Manual Entry'),
(1, 73, '121/80', 36.7, 97, 75.5, 175.0, CURRENT_TIMESTAMP - INTERVAL '2 weeks', 'Apple Health')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT DEMO APPOINTMENTS
-- ============================================================================
INSERT INTO appointments (
    patient_id,
    doctor_id,
    appointment_date,
    appointment_time,
    type,
    reason,
    status,
    notes
) VALUES
-- Upcoming appointment
(
    3,
    2,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00:00',
    'Initial Consultation',
    'Regular checkup and blood pressure monitoring',
    'scheduled',
    'Patient requested morning slot'
),
-- Future appointment
(
    3,
    2,
    CURRENT_DATE + INTERVAL '1 week',
    '14:00:00',
    'Follow-up',
    'Blood pressure follow-up',
    'scheduled',
    NULL
),
-- Past completed appointment
(
    3,
    2,
    CURRENT_DATE - INTERVAL '1 week',
    '10:00:00',
    'Consultation',
    'Initial assessment',
    'completed',
    'Patient presented with elevated blood pressure. Prescribed Lisinopril.'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT DEMO PRESCRIPTIONS
-- ============================================================================
INSERT INTO prescriptions (
    patient_id,
    doctor_id,
    medication,
    dosage,
    frequency,
    duration,
    quantity,
    refills,
    pharmacy,
    status,
    instructions,
    prescribed_date,
    expiration_date
) VALUES
(
    3,
    2,
    'Lisinopril',
    '10mg',
    'Once daily',
    '90 days',
    90,
    3,
    'CVS Pharmacy - Main Street',
    'active',
    'Take in the morning with water. Monitor blood pressure daily.',
    CURRENT_DATE - INTERVAL '1 week',
    CURRENT_DATE + INTERVAL '11 months'
),
(
    3,
    2,
    'Aspirin',
    '81mg',
    'Once daily',
    '90 days',
    90,
    3,
    'CVS Pharmacy - Main Street',
    'active',
    'Take with food to reduce stomach irritation.',
    CURRENT_DATE - INTERVAL '1 week',
    CURRENT_DATE + INTERVAL '11 months'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT DEMO MEDICAL RECORDS
-- ============================================================================
INSERT INTO medical_records (
    patient_id,
    doctor_id,
    record_type,
    chief_complaint,
    diagnosis,
    treatment_plan,
    notes,
    ai_generated,
    record_date
) VALUES
(
    3,
    2,
    'consultation',
    'Patient reports elevated blood pressure readings at home (140/90)',
    'Essential Hypertension (ICD-10: I10)',
    'Prescribe Lisinopril 10mg once daily. Patient advised to monitor BP daily and maintain log. Schedule follow-up in 2 weeks.',
    'Patient is a 40-year-old male presenting with elevated blood pressure. No prior history of hypertension. Family history positive for cardiovascular disease. Non-smoker, moderate alcohol use. BMI 26.5. Physical exam unremarkable except for BP 142/88.',
    false,
    CURRENT_DATE - INTERVAL '1 week'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT DEMO MESSAGES
-- ============================================================================
INSERT INTO messages (
    sender_id,
    recipient_id,
    subject,
    message,
    is_read,
    priority,
    created_at
) VALUES
(
    3,
    2,
    'Blood Pressure Question',
    'Dr. Smith, I''ve been taking my blood pressure medication for 5 days now. This morning my reading was 128/82. Is this normal? Should I continue with the same dosage?',
    false,
    'normal',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
),
(
    2,
    3,
    'RE: Blood Pressure Question',
    'Hello John, that''s great progress! 128/82 is a much better reading. Continue with your current dosage and keep monitoring daily. We''ll review your log at your follow-up appointment next week.',
    false,
    'normal',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- INSERT DEMO NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    status,
    created_at
) VALUES
(
    3,
    'in_app',
    'Appointment Reminder',
    'You have an appointment with Dr. Sarah Smith tomorrow at 10:00 AM',
    '{"appointment_id": 1, "appointment_date": "' || (CURRENT_DATE + INTERVAL '1 day')::text || '", "appointment_time": "10:00"}',
    'pending',
    CURRENT_TIMESTAMP
),
(
    3,
    'email',
    'Prescription Ready',
    'Your prescription for Lisinopril is ready for pickup at CVS Pharmacy - Main Street',
    '{"prescription_id": 1, "pharmacy": "CVS Pharmacy - Main Street"}',
    'sent',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================
DO $$
DECLARE
    user_count INTEGER;
    patient_count INTEGER;
    vital_count INTEGER;
    appointment_count INTEGER;
    prescription_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO patient_count FROM patients;
    SELECT COUNT(*) INTO vital_count FROM vital_signs;
    SELECT COUNT(*) INTO appointment_count FROM appointments;
    SELECT COUNT(*) INTO prescription_count FROM prescriptions;

    RAISE NOTICE 'Seed data verification:';
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Patients: %', patient_count;
    RAISE NOTICE '  Vital Signs: %', vital_count;
    RAISE NOTICE '  Appointments: %', appointment_count;
    RAISE NOTICE '  Prescriptions: %', prescription_count;

    IF user_count >= 3 AND patient_count >= 1 THEN
        RAISE NOTICE 'Demo data seeded successfully!';
    ELSE
        RAISE WARNING 'Demo data seeding may be incomplete!';
    END IF;
END $$;

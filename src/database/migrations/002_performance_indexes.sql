-- MediConnect Pro - Performance Indexes Migration
-- Migration: 002_performance_indexes.sql
-- Created: 2025-12-10
-- Purpose: Add performance indexes for 1,000-5,000+ concurrent users

-- ============================================================================
-- INDEXES FOR PAGINATION AND SORTING
-- ============================================================================

-- Appointments: Sort by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_appointments_created_at
  ON appointments(created_at DESC);

-- Prescriptions: Sort by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at
  ON prescriptions(created_at DESC);

-- Vital Signs: Sort by recording time (newest first)
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at
  ON vital_signs(recorded_at DESC);

-- Messages: Sort by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages(created_at DESC);

-- Medical Records: Sort by creation date (newest first)
CREATE INDEX IF NOT EXISTS idx_medical_records_created_at
  ON medical_records(created_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Appointments by patient and date (for patient dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date
  ON appointments(patient_id, date DESC);

-- Appointments by doctor and date (for doctor dashboard)
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
  ON appointments(doctor_id, date DESC);

-- Prescriptions by patient and status (for active medications view)
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_status
  ON prescriptions(patient_id, status);

-- Prescriptions by doctor (for doctor's prescriptions list)
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_created
  ON prescriptions(doctor_id, created_at DESC);

-- Vital signs by patient and recording time (for patient vitals history)
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_recorded
  ON vital_signs(patient_id, recorded_at DESC);

-- Messages by recipient (for inbox queries)
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created
  ON messages(recipient_id, created_at DESC);

-- Medical records by patient (for patient records view)
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_type
  ON medical_records(patient_id, type);

-- ============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================================================

-- Active appointments only (scheduled or confirmed)
CREATE INDEX IF NOT EXISTS idx_appointments_active
  ON appointments(patient_id, date)
  WHERE status IN ('scheduled', 'confirmed');

-- Active appointments by doctor
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_active
  ON appointments(doctor_id, date)
  WHERE status IN ('scheduled', 'confirmed');

-- Active prescriptions only
CREATE INDEX IF NOT EXISTS idx_prescriptions_active
  ON prescriptions(patient_id, created_at DESC)
  WHERE status = 'active';

-- Unread messages only
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(recipient_id, created_at DESC)
  WHERE read = FALSE;

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Medical records: Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_medical_records_title_gin
  ON medical_records USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_medical_records_description_gin
  ON medical_records USING gin(to_tsvector('english', COALESCE(description, '')));

-- Prescriptions: Search by medication name
CREATE INDEX IF NOT EXISTS idx_prescriptions_medication_gin
  ON prescriptions USING gin(to_tsvector('english', medication));

-- Appointments: Search by reason
CREATE INDEX IF NOT EXISTS idx_appointments_reason_gin
  ON appointments USING gin(to_tsvector('english', COALESCE(reason, '')));

-- ============================================================================
-- INDEXES FOR FOREIGN KEY CONSTRAINTS (if not already created)
-- ============================================================================

-- These might already exist from 001_initial_schema.sql, but we add them again
-- with IF NOT EXISTS to ensure they're present

-- Password reset tokens by user
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
  ON password_reset_tokens(user_id);

-- Password reset tokens by token (for lookups)
-- Already created in 001_initial_schema.sql but ensuring it exists
CREATE INDEX IF NOT EXISTS idx_password_reset_token
  ON password_reset_tokens(token);

-- Audit log by user (for user activity history)
CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON audit_log(user_id, created_at DESC);

-- Audit log by resource (for tracking changes to specific resources)
CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log(resource_type, resource_id, created_at DESC);

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
ANALYZE users;
ANALYZE patients;
ANALYZE appointments;
ANALYZE prescriptions;
ANALYZE vital_signs;
ANALYZE medical_records;
ANALYZE messages;
ANALYZE password_reset_tokens;
ANALYZE audit_log;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- These indexes significantly improve query performance for:
-- 1. Dashboard views (patient, doctor, admin)
-- 2. List views with sorting and pagination
-- 3. Filtered queries (active appointments, unread messages)
-- 4. Full-text search functionality
-- 5. Foreign key lookups and joins

-- Expected performance improvements:
-- - Dashboard queries: 10-50x faster
-- - Paginated lists: 5-20x faster
-- - Search queries: 20-100x faster
-- - Foreign key joins: 2-10x faster

-- Index maintenance:
-- - Indexes are updated automatically on INSERT/UPDATE/DELETE
-- - ANALYZE should be run periodically (weekly) for optimal query planning
-- - Monitor index usage with:
--   SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';

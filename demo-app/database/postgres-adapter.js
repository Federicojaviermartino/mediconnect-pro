/**
 * PostgreSQL Database Adapter
 * Implements the same interface as init.js but uses PostgreSQL
 */

const pg = require('./postgres');
const bcrypt = require('bcryptjs');

/**
 * Initialize PostgreSQL database adapter
 * @returns {Object} Database operations object
 */
async function initPostgresDatabase() {
  // Test connection
  const isConnected = await pg.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to PostgreSQL database');
  }

  console.log('✅ PostgreSQL database connected');

  return {
    // ============================================================================
    // USER OPERATIONS
    // ============================================================================

    getUserByEmail: async (email) => {
      return await pg.queryOne('SELECT * FROM users WHERE email = $1', [email]);
    },

    getUserById: async (userId) => {
      return await pg.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
    },

    getAllUsers: async () => {
      return await pg.queryAll('SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC');
    },

    createUser: async (userData) => {
      const { email, password, role, name, specialization, phone } = userData;
      const hashedPassword = await bcrypt.hash(password, 10);

      return await pg.insert(`
        INSERT INTO users (email, password, role, name, specialization, phone)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [email, hashedPassword, role, name, specialization, phone]);
    },

    updateUser: async (userId, updates) => {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      values.push(userId);
      const result = await pg.update(`
        UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount}
      `, values);

      return result[0];
    },

    // ============================================================================
    // PATIENT OPERATIONS
    // ============================================================================

    getPatientById: async (patientId) => {
      return await pg.queryOne('SELECT * FROM patients WHERE id = $1', [patientId]);
    },

    getPatientByUserId: async (userId) => {
      return await pg.queryOne('SELECT * FROM patients WHERE user_id = $1', [userId]);
    },

    getAllPatients: async () => {
      return await pg.queryAll(`
        SELECT u.*, p.blood_type, p.allergies, p.conditions
        FROM users u
        LEFT JOIN patients p ON u.id = p.user_id
        WHERE u.role = 'patient' AND u.is_active = true
        ORDER BY u.created_at DESC
      `);
    },

    createPatient: async (patientData) => {
      return await pg.insert(`
        INSERT INTO patients (
          user_id, blood_type, allergies, conditions,
          insurance_provider, insurance_member_id,
          date_of_birth, gender, address, city, state, zip_code, country
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        patientData.user_id,
        patientData.blood_type,
        patientData.allergies,
        patientData.conditions,
        patientData.insurance_provider,
        patientData.insurance_member_id,
        patientData.date_of_birth,
        patientData.gender,
        patientData.address,
        patientData.city,
        patientData.state,
        patientData.zip_code,
        patientData.country
      ]);
    },

    // ============================================================================
    // VITAL SIGNS OPERATIONS
    // ============================================================================

    getVitalsByPatientId: async (patientId) => {
      return await pg.queryAll(`
        SELECT * FROM vital_signs
        WHERE patient_id = $1
        ORDER BY recorded_at DESC
        LIMIT 100
      `, [patientId]);
    },

    createVitalSigns: async (vitalsData) => {
      return await pg.insert(`
        INSERT INTO vital_signs (
          patient_id, heart_rate, blood_pressure, temperature,
          oxygen_saturation, weight, recorded_at, device_source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        vitalsData.patient_id,
        vitalsData.heart_rate,
        vitalsData.blood_pressure,
        vitalsData.temperature,
        vitalsData.oxygen_saturation,
        vitalsData.weight,
        vitalsData.recorded_at || new Date(),
        vitalsData.device_source || 'Manual Entry'
      ]);
    },

    // ============================================================================
    // APPOINTMENT OPERATIONS
    // ============================================================================

    getAppointments: async (userId, role) => {
      let query;
      if (role === 'patient') {
        query = `
          SELECT a.*, u.name as doctor_name
          FROM appointments a
          JOIN users u ON a.doctor_id = u.id
          WHERE a.patient_id = $1
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;
      } else if (role === 'doctor') {
        query = `
          SELECT a.*, u.name as patient_name
          FROM appointments a
          JOIN users u ON a.patient_id = u.id
          WHERE a.doctor_id = $1
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;
      } else { // admin
        query = `
          SELECT a.*,
            p.name as patient_name,
            d.name as doctor_name
          FROM appointments a
          JOIN users p ON a.patient_id = p.id
          JOIN users d ON a.doctor_id = d.id
          ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;
        return await pg.queryAll(query);
      }

      return await pg.queryAll(query, [userId]);
    },

    createAppointment: async (appointmentData) => {
      return await pg.insert(`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, appointment_time,
          type, reason, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        appointmentData.patient_id,
        appointmentData.doctor_id,
        appointmentData.date,
        appointmentData.time,
        appointmentData.type || 'Consultation',
        appointmentData.reason,
        appointmentData.status || 'scheduled'
      ]);
    },

    updateAppointment: async (appointmentId, updates) => {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      values.push(appointmentId);
      const result = await pg.update(`
        UPDATE appointments SET ${fields.join(', ')} WHERE id = $${paramCount}
      `, values);

      return result[0];
    },

    // ============================================================================
    // PRESCRIPTION OPERATIONS
    // ============================================================================

    getPrescriptions: async (userId, role) => {
      let query;
      if (role === 'patient') {
        query = `
          SELECT pr.*, u.name as doctor_name
          FROM prescriptions pr
          JOIN users u ON pr.doctor_id = u.id
          WHERE pr.patient_id = $1
          ORDER BY pr.prescribed_date DESC
        `;
      } else if (role === 'doctor') {
        query = `
          SELECT pr.*, u.name as patient_name
          FROM prescriptions pr
          JOIN users u ON pr.patient_id = u.id
          WHERE pr.doctor_id = $1
          ORDER BY pr.prescribed_date DESC
        `;
      } else { // admin
        query = `
          SELECT pr.*,
            p.name as patient_name,
            d.name as doctor_name
          FROM prescriptions pr
          JOIN users p ON pr.patient_id = p.id
          JOIN users d ON pr.doctor_id = d.id
          ORDER BY pr.prescribed_date DESC
        `;
        return await pg.queryAll(query);
      }

      return await pg.queryAll(query, [userId]);
    },

    getPrescriptionById: async (prescriptionId) => {
      return await pg.queryOne(`
        SELECT * FROM prescriptions WHERE id = $1
      `, [prescriptionId]);
    },

    createPrescription: async (prescriptionData) => {
      return await pg.insert(`
        INSERT INTO prescriptions (
          patient_id, doctor_id, medication, dosage, frequency,
          pharmacy, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        prescriptionData.patient_id,
        prescriptionData.doctor_id,
        prescriptionData.medication,
        prescriptionData.dosage,
        prescriptionData.frequency,
        prescriptionData.pharmacy,
        prescriptionData.notes,
        prescriptionData.status || 'pending'
      ]);
    },

    updatePrescription: async (prescriptionId, updates) => {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      values.push(prescriptionId);
      const result = await pg.update(`
        UPDATE prescriptions SET ${fields.join(', ')} WHERE id = $${paramCount}
      `, values);

      return result[0];
    },

    // ============================================================================
    // MESSAGE OPERATIONS
    // ============================================================================

    getMessages: async (userId) => {
      return await pg.queryAll(`
        SELECT * FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
        ORDER BY created_at DESC
      `, [userId]);
    },

    createMessage: async (messageData) => {
      return await pg.insert(`
        INSERT INTO messages (sender_id, recipient_id, subject, message, priority)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        messageData.from_user_id,
        messageData.to_user_id,
        messageData.subject,
        messageData.message,
        messageData.priority || 'normal'
      ]);
    },

    // ============================================================================
    // AUDIT LOG OPERATIONS (for HIPAA compliance)
    // ============================================================================

    logAudit: async (auditData) => {
      return await pg.insert(`
        INSERT INTO audit_log (
          user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        auditData.user_id,
        auditData.action,
        auditData.entity_type,
        auditData.entity_id,
        JSON.stringify(auditData.old_values || {}),
        JSON.stringify(auditData.new_values || {}),
        auditData.ip_address,
        auditData.user_agent
      ]);
    },

    getAuditLogs: async (filters = {}) => {
      let query = 'SELECT * FROM audit_log WHERE 1=1';
      const params = [];
      let paramCount = 1;

      if (filters.user_id) {
        query += ` AND user_id = $${paramCount}`;
        params.push(filters.user_id);
        paramCount++;
      }

      if (filters.action) {
        query += ` AND action = $${paramCount}`;
        params.push(filters.action);
        paramCount++;
      }

      if (filters.entity_type) {
        query += ` AND entity_type = $${paramCount}`;
        params.push(filters.entity_type);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC LIMIT 1000';

      return await pg.queryAll(query, params);
    },

    // ============================================================================
    // TRANSACTION SUPPORT
    // ============================================================================

    transaction: pg.transaction,

    // ============================================================================
    // HEALTH CHECK
    // ============================================================================

    healthCheck: async () => {
      const isHealthy = await pg.testConnection();
      const stats = pg.getPoolStats();

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        database: 'postgresql',
        pool: stats
      };
    },

    // ============================================================================
    // CONNECTION MANAGEMENT
    // ============================================================================

    close: async () => {
      await pg.close();
    }
  };
}

module.exports = { initPostgresDatabase };

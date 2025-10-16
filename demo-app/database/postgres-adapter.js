/**
 * PostgreSQL Database Adapter
 * Implements the same interface as the JSON database for seamless switching
 */

const db = require('./postgres');

/**
 * Initialize PostgreSQL database adapter
 * @returns {Object} Database operations object
 */
function initPostgresDatabase() {
  return {
    // ========================================================================
    // USER OPERATIONS
    // ========================================================================

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object|null>}
     */
    getUserByEmail: async (email) => {
      return await db.queryOne(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
    },

    /**
     * Get user by ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>}
     */
    getUserById: async (userId) => {
      return await db.queryOne(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [parseInt(userId)]
      );
    },

    /**
     * Get all users
     * @returns {Promise<Array>}
     */
    getAllUsers: async () => {
      return await db.queryAll(
        'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC'
      );
    },

    // ========================================================================
    // PATIENT OPERATIONS
    // ========================================================================

    /**
     * Get patient by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>}
     */
    getPatientByUserId: async (userId) => {
      return await db.queryOne(
        'SELECT * FROM patients WHERE user_id = $1',
        [parseInt(userId)]
      );
    },

    /**
     * Get all patients with user information
     * @returns {Promise<Array>}
     */
    getAllPatients: async () => {
      return await db.queryAll(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.created_at,
          p.blood_type,
          p.allergies,
          p.conditions,
          p.insurance_provider,
          p.insurance_member_id
        FROM users u
        LEFT JOIN patients p ON p.user_id = u.id
        WHERE u.role = 'patient' AND u.is_active = true
        ORDER BY u.created_at DESC
      `);
    },

    /**
     * Get patient by ID with full details
     * @param {number} patientId - Patient user ID
     * @returns {Promise<Object|null>}
     */
    getPatientById: async (patientId) => {
      return await db.queryOne(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          u.created_at,
          p.id as patient_id,
          p.blood_type,
          p.allergies,
          p.conditions,
          p.insurance_provider as "insuranceProvider",
          p.insurance_member_id as "insuranceMemberId",
          p.last_eligibility_check as "lastEligibilityCheck",
          p.date_of_birth,
          p.gender,
          p.address,
          p.city,
          p.state,
          p.zip_code,
          p.country
        FROM users u
        LEFT JOIN patients p ON p.user_id = u.id
        WHERE u.id = $1 AND u.role = 'patient' AND u.is_active = true
      `, [parseInt(patientId)]);
    },

    /**
     * Update patient information
     * @param {number} patientId - Patient user ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>}
     */
    updatePatient: async (patientId, updateData) => {
      // First check if user exists and is a patient
      const user = await db.queryOne(
        'SELECT id FROM users WHERE id = $1 AND role = $'patient' AND is_active = true',
        [parseInt(patientId)]
      );

      if (!user) return null;

      // Check if patient record exists
      const existingPatient = await db.queryOne(
        'SELECT id FROM patients WHERE user_id = $1',
        [parseInt(patientId)]
      );

      // Convert camelCase to snake_case for database
      const dbUpdateData = {};
      const fieldMap = {
        insuranceProvider: 'insurance_provider',
        insuranceMemberId: 'insurance_member_id',
        lastEligibilityCheck: 'last_eligibility_check',
        dateOfBirth: 'date_of_birth',
        zipCode: 'zip_code'
      };

      for (const [key, value] of Object.entries(updateData)) {
        const dbKey = fieldMap[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbUpdateData[dbKey] = value;
      }

      if (existingPatient) {
        // Update existing patient
        const updateFields = Object.keys(dbUpdateData)
          .map((key, index) => `${key} = $${index + 2}`)
          .join(', ');

        const values = [parseInt(patientId), ...Object.values(dbUpdateData)];

        return await db.queryOne(
          `UPDATE patients SET ${updateFields}, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 RETURNING *`,
          values
        );
      } else {
        // Insert new patient record
        const fields = ['user_id', ...Object.keys(dbUpdateData)];
        const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
        const values = [parseInt(patientId), ...Object.values(dbUpdateData)];

        return await db.queryOne(
          `INSERT INTO patients (${fields.join(', ')})
           VALUES (${placeholders}) RETURNING *`,
          values
        );
      }
    },

    // ========================================================================
    // VITAL SIGNS OPERATIONS
    // ========================================================================

    /**
     * Get vital signs for a patient
     * @param {number} patientId - Patient ID (from patients table)
     * @returns {Promise<Array>}
     */
    getVitalsByPatientId: async (patientId) => {
      return await db.queryAll(`
        SELECT * FROM vital_signs
        WHERE patient_id = $1
        ORDER BY recorded_at DESC
        LIMIT 10
      `, [parseInt(patientId)]);
    },

    // ========================================================================
    // STATISTICS
    // ========================================================================

    /**
     * Get database statistics
     * @returns {Promise<Object>}
     */
    getStats: async () => {
      const stats = await db.queryOne(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE is_active = true) as "totalUsers",
          (SELECT COUNT(*) FROM users WHERE role = 'patient' AND is_active = true) as "totalPatients",
          (SELECT COUNT(*) FROM users WHERE role = 'doctor' AND is_active = true) as "totalDoctors",
          (SELECT COUNT(*) FROM vital_signs) as "totalVitals",
          (SELECT COUNT(*) FROM appointments) as "totalAppointments",
          (SELECT COUNT(*) FROM prescriptions) as "totalPrescriptions"
      `);
      return stats;
    },

    // ========================================================================
    // APPOINTMENT OPERATIONS
    // ========================================================================

    /**
     * Get appointments for a user
     * @param {number} userId - User ID
     * @param {string} role - User role (patient/doctor/admin)
     * @returns {Promise<Array>}
     */
    getAppointments: async (userId, role) => {
      let query = `
        SELECT
          a.*,
          p_user.name as patient_name,
          d_user.name as doctor_name
        FROM appointments a
        JOIN users p_user ON a.patient_id = p_user.id
        JOIN users d_user ON a.doctor_id = d_user.id
      `;

      let params = [];

      if (role === 'patient') {
        query += ' WHERE a.patient_id = $1';
        params = [parseInt(userId)];
      } else if (role === 'doctor') {
        query += ' WHERE a.doctor_id = $1';
        params = [parseInt(userId)];
      }

      query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

      return await db.queryAll(query, params);
    },

    /**
     * Get appointment by ID
     * @param {number} appointmentId - Appointment ID
     * @returns {Promise<Object|null>}
     */
    getAppointmentById: async (appointmentId) => {
      return await db.queryOne(
        'SELECT * FROM appointments WHERE id = $1',
        [parseInt(appointmentId)]
      );
    },

    /**
     * Create a new appointment
     * @param {Object} appointmentData - Appointment data
     * @returns {Promise<Object>}
     */
    createAppointment: async (appointmentData) => {
      const { patient_id, doctor_id, date, time, reason, type } = appointmentData;

      return await db.insert(`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, appointment_time,
          reason, type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
      `, [
        parseInt(patient_id),
        parseInt(doctor_id),
        date,
        time,
        reason || null,
        type || 'Consultation'
      ]);
    },

    /**
     * Update appointment
     * @param {number} appointmentId - Appointment ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>}
     */
    updateAppointment: async (appointmentId, updateData) => {
      // Convert camelCase to snake_case
      const dbUpdateData = {};
      const fieldMap = {
        preAuthorization: 'pre_authorization',
        preAuthDate: 'pre_auth_date',
        claimSubmittedDate: 'claim_submitted_date'
      };

      for (const [key, value] of Object.entries(updateData)) {
        const dbKey = fieldMap[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbUpdateData[dbKey] = value;
      }

      const updateFields = Object.keys(dbUpdateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const values = [parseInt(appointmentId), ...Object.values(dbUpdateData)];

      const result = await db.update(
        `UPDATE appointments SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        values
      );

      return result[0] || null;
    },

    // ========================================================================
    // PRESCRIPTION OPERATIONS
    // ========================================================================

    /**
     * Get prescriptions for a user
     * @param {number} userId - User ID
     * @param {string} role - User role (patient/doctor/admin)
     * @returns {Promise<Array>}
     */
    getPrescriptions: async (userId, role) => {
      let query = `
        SELECT
          pr.*,
          p_user.name as patient_name,
          d_user.name as doctor_name
        FROM prescriptions pr
        JOIN users p_user ON pr.patient_id = p_user.id
        JOIN users d_user ON pr.doctor_id = d_user.id
      `;

      let params = [];

      if (role === 'patient') {
        query += ' WHERE pr.patient_id = $1';
        params = [parseInt(userId)];
      } else if (role === 'doctor') {
        query += ' WHERE pr.doctor_id = $1';
        params = [parseInt(userId)];
      }

      query += ' ORDER BY pr.prescribed_date DESC, pr.created_at DESC';

      return await db.queryAll(query, params);
    },

    /**
     * Get prescription by ID
     * @param {number} prescriptionId - Prescription ID
     * @returns {Promise<Object|null>}
     */
    getPrescriptionById: async (prescriptionId) => {
      return await db.queryOne(
        'SELECT * FROM prescriptions WHERE id = $1',
        [parseInt(prescriptionId)]
      );
    },

    /**
     * Create a new prescription
     * @param {Object} prescriptionData - Prescription data
     * @returns {Promise<Object>}
     */
    createPrescription: async (prescriptionData) => {
      const {
        patient_id,
        doctor_id,
        medication,
        dosage,
        frequency,
        duration,
        pharmacy,
        notes
      } = prescriptionData;

      return await db.insert(`
        INSERT INTO prescriptions (
          patient_id, doctor_id, medication, dosage, frequency,
          duration, pharmacy, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      `, [
        parseInt(patient_id),
        parseInt(doctor_id),
        medication,
        dosage || 'As prescribed',
        frequency || 'As directed',
        duration || null,
        pharmacy || null,
        notes || null
      ]);
    },

    /**
     * Update prescription
     * @param {number} prescriptionId - Prescription ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object|null>}
     */
    updatePrescription: async (prescriptionId, updateData) => {
      // Convert camelCase to snake_case
      const dbUpdateData = {};
      const fieldMap = {
        pharmacyId: 'pharmacy_id',
        orderId: 'order_id',
        orderStatus: 'order_status',
        sentToPharmacyAt: 'sent_to_pharmacy_at'
      };

      for (const [key, value] of Object.entries(updateData)) {
        const dbKey = fieldMap[key] || key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        dbUpdateData[dbKey] = value;
      }

      const updateFields = Object.keys(dbUpdateData)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      const values = [parseInt(prescriptionId), ...Object.values(dbUpdateData)];

      const result = await db.update(
        `UPDATE prescriptions SET ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        values
      );

      return result[0] || null;
    },

    // ========================================================================
    // MESSAGE OPERATIONS
    // ========================================================================

    /**
     * Get messages for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>}
     */
    getMessages: async (userId) => {
      return await db.queryAll(`
        SELECT * FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
        ORDER BY created_at DESC
      `, [parseInt(userId)]);
    },

    /**
     * Create a new message
     * @param {Object} messageData - Message data
     * @returns {Promise<Object>}
     */
    createMessage: async (messageData) => {
      const { from_user_id, to_user_id, subject, message } = messageData;

      return await db.insert(`
        INSERT INTO messages (sender_id, recipient_id, subject, message)
        VALUES ($1, $2, $3, $4)
      `, [
        parseInt(from_user_id),
        parseInt(to_user_id),
        subject || null,
        message
      ]);
    }
  };
}

module.exports = { initPostgresDatabase };

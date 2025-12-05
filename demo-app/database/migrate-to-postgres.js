#!/usr/bin/env node

/**
 * Migration script: JSON file database → PostgreSQL
 *
 * This script migrates all data from the JSON file storage (database.json)
 * to PostgreSQL database.
 *
 * Usage:
 *   node demo-app/database/migrate-to-postgres.js
 *
 * Prerequisites:
 *   - PostgreSQL database must be configured (DATABASE_URL or PG_* env vars)
 *   - Database schema must be created (run migrations first)
 *   - database.json file must exist
 */

const fs = require('fs');
const path = require('path');
const pg = require('./postgres');

// Path to JSON database file
const DB_FILE = path.join(__dirname, 'database.json');

/**
 * Load JSON database
 */
function loadJsonDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error(`Database file not found: ${DB_FILE}`);
  }

  const data = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(data);
}

/**
 * Migrate users table
 */
async function migrateUsers(users) {
  console.log(`\n📋 Migrating ${users.length} users...`);
  let count = 0;

  for (const user of users) {
    try {
      await pg.insert(`
        INSERT INTO users (
          id, email, password, role, name, specialization, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          password = EXCLUDED.password,
          role = EXCLUDED.role,
          name = EXCLUDED.name,
          specialization = EXCLUDED.specialization
      `, [
        user.id,
        user.email,
        user.password, // Already hashed in JSON
        user.role,
        user.name,
        user.specialization,
        user.created_at || new Date().toISOString()
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${users.length} users`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate user ${user.email}:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Users migration complete: ${count}/${users.length}`);
}

/**
 * Migrate patients table
 */
async function migratePatients(patients) {
  console.log(`\n📋 Migrating ${patients.length} patients...`);
  let count = 0;

  for (const patient of patients) {
    try {
      await pg.insert(`
        INSERT INTO patients (
          id, user_id, blood_type, allergies, conditions,
          insurance_provider, insurance_member_id, last_eligibility_check
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          blood_type = EXCLUDED.blood_type,
          allergies = EXCLUDED.allergies,
          conditions = EXCLUDED.conditions,
          insurance_provider = EXCLUDED.insurance_provider,
          insurance_member_id = EXCLUDED.insurance_member_id,
          last_eligibility_check = EXCLUDED.last_eligibility_check
      `, [
        patient.id,
        patient.user_id,
        patient.blood_type,
        patient.allergies,
        patient.conditions,
        patient.insuranceProvider || null,
        patient.insuranceMemberId || null,
        patient.lastEligibilityCheck || null
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${patients.length} patients`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate patient ${patient.id}:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Patients migration complete: ${count}/${patients.length}`);
}

/**
 * Migrate vital signs table
 */
async function migrateVitalSigns(vitalSigns) {
  console.log(`\n📋 Migrating ${vitalSigns.length} vital signs...`);
  let count = 0;

  for (const vital of vitalSigns) {
    try {
      // Parse blood pressure if in "120/80" format
      let systolic = null;
      let diastolic = null;
      if (vital.blood_pressure && typeof vital.blood_pressure === 'string') {
        const [sys, dia] = vital.blood_pressure.split('/').map(v => parseInt(v));
        systolic = sys;
        diastolic = dia;
      }

      await pg.insert(`
        INSERT INTO vital_signs (
          patient_id, heart_rate, blood_pressure_systolic, blood_pressure_diastolic,
          temperature, oxygen_saturation, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        vital.patient_id,
        vital.heart_rate,
        systolic,
        diastolic,
        vital.temperature,
        vital.oxygen_saturation,
        vital.recorded_at || new Date().toISOString()
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${vitalSigns.length} vital signs`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate vital sign:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Vital signs migration complete: ${count}/${vitalSigns.length}`);
}

/**
 * Migrate appointments table
 */
async function migrateAppointments(appointments) {
  console.log(`\n📋 Migrating ${appointments.length} appointments...`);
  let count = 0;

  for (const appt of appointments) {
    try {
      // Combine date and time into a timestamp
      const appointmentDateTime = appt.date && appt.time
        ? `${appt.date}T${appt.time}:00`
        : new Date().toISOString();

      await pg.insert(`
        INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, appointment_time,
          type, reason, status, created_at
        ) VALUES ($1, $2, $3::date, $4::time, $5, $6, $7, $8)
      `, [
        appt.patient_id,
        appt.doctor_id,
        appt.date,
        appt.time,
        appt.type || 'consultation',
        appt.reason,
        appt.status || 'scheduled',
        appt.created_at || new Date().toISOString()
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${appointments.length} appointments`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate appointment:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Appointments migration complete: ${count}/${appointments.length}`);
}

/**
 * Migrate prescriptions table
 */
async function migratePrescriptions(prescriptions) {
  console.log(`\n📋 Migrating ${prescriptions.length} prescriptions...`);
  let count = 0;

  for (const rx of prescriptions) {
    try {
      await pg.insert(`
        INSERT INTO prescriptions (
          patient_id, doctor_id, medication, dosage, frequency,
          start_date, end_date, instructions, pharmacy_name,
          pharmacy_address, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        rx.patient_id,
        rx.doctor_id,
        rx.medication,
        rx.dosage,
        rx.frequency,
        rx.start_date || new Date().toISOString(),
        rx.end_date || null,
        rx.instructions || null,
        rx.pharmacy || null,
        rx.pharmacy_address || null,
        rx.status || 'active',
        rx.created_at || new Date().toISOString()
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${prescriptions.length} prescriptions`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate prescription:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Prescriptions migration complete: ${count}/${prescriptions.length}`);
}

/**
 * Migrate messages table
 */
async function migrateMessages(messages) {
  console.log(`\n📋 Migrating ${messages.length} messages...`);
  let count = 0;

  for (const msg of messages) {
    try {
      await pg.insert(`
        INSERT INTO messages (
          from_user_id, to_user_id, subject, content,
          is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        msg.from_user_id,
        msg.to_user_id,
        msg.subject || 'No Subject',
        msg.content,
        msg.is_read || false,
        msg.created_at || new Date().toISOString()
      ]);
      count++;
      process.stdout.write(`\r  ✓ Migrated ${count}/${messages.length} messages`);
    } catch (error) {
      console.error(`\n  ✗ Failed to migrate message:`, error.message);
    }
  }
  console.log(''); // New line after progress
  console.log(`✅ Messages migration complete: ${count}/${messages.length}`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting migration from JSON to PostgreSQL...\n');

  try {
    // Test PostgreSQL connection
    console.log('🔍 Testing PostgreSQL connection...');
    const isConnected = await pg.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to PostgreSQL. Check your DATABASE_URL or PG_* environment variables.');
    }
    console.log('✅ PostgreSQL connection successful\n');

    // Load JSON database
    console.log('📂 Loading JSON database...');
    const db = loadJsonDatabase();
    console.log(`✅ JSON database loaded:
  - Users: ${db.users?.length || 0}
  - Patients: ${db.patients?.length || 0}
  - Vital Signs: ${db.vitalSigns?.length || 0}
  - Appointments: ${db.appointments?.length || 0}
  - Prescriptions: ${db.prescriptions?.length || 0}
  - Messages: ${db.messages?.length || 0}
`);

    // Run migrations in order (due to foreign key constraints)
    await migrateUsers(db.users || []);
    await migratePatients(db.patients || []);
    await migrateVitalSigns(db.vitalSigns || []);
    await migrateAppointments(db.appointments || []);
    await migratePrescriptions(db.prescriptions || []);
    await migrateMessages(db.messages || []);

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Set USE_POSTGRES=true in your environment');
    console.log('   2. Restart the server');
    console.log('   3. Verify all data is accessible\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close PostgreSQL connection
    await pg.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };

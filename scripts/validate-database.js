/**
 * MediConnect Pro - Database Validation Script
 *
 * Validates database structure, data integrity, and relationships
 *
 * Usage:
 *   node scripts/validate-database.js [database-path]
 *
 * Examples:
 *   node scripts/validate-database.js
 *   node scripts/validate-database.js demo-app/database/database.json
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = process.argv[2] || path.join(__dirname, '..', 'demo-app', 'database', 'database.json');

// Validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: []
};

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Logging helpers
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, message = '') {
  let symbol, color;

  switch (status) {
    case 'pass':
      symbol = '✓';
      color = 'green';
      results.passed++;
      break;
    case 'fail':
      symbol = '✗';
      color = 'red';
      results.failed++;
      results.issues.push({ type: 'error', test: name, message });
      break;
    case 'warn':
      symbol = '⚠';
      color = 'yellow';
      results.warnings++;
      results.issues.push({ type: 'warning', test: name, message });
      break;
  }

  log(`  ${symbol} ${name}`, color);

  if (message) {
    log(`    ${message}`, color);
  }
}

// Validation functions
function validateDatabaseExists() {
  log('\n=== Database File Validation ===', 'cyan');

  if (fs.existsSync(DB_PATH)) {
    logTest('Database file exists', 'pass');
    return true;
  } else {
    logTest('Database file exists', 'fail', `File not found at ${DB_PATH}`);
    return false;
  }
}

function loadDatabase() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    logTest('Database file is valid JSON', 'pass');
    return db;
  } catch (error) {
    logTest('Database file parsing', 'fail', `Error: ${error.message}`);
    return null;
  }
}

function validateDatabaseStructure(db) {
  log('\n=== Database Structure Validation ===', 'cyan');

  const requiredCollections = ['users', 'patients', 'vitalSigns', 'appointments', 'prescriptions', 'messages'];

  for (const collection of requiredCollections) {
    if (db.hasOwnProperty(collection)) {
      if (Array.isArray(db[collection])) {
        logTest(`Collection "${collection}" exists and is an array`, 'pass');
      } else {
        logTest(`Collection "${collection}" type`, 'fail', 'Must be an array');
      }
    } else {
      logTest(`Collection "${collection}" exists`, 'fail', 'Required collection missing');
    }
  }

  // Check for unexpected collections
  const knownCollections = [...requiredCollections, 'vitalAlerts'];
  const extraCollections = Object.keys(db).filter(k => !knownCollections.includes(k));

  if (extraCollections.length > 0) {
    logTest('No unexpected collections', 'warn', `Found: ${extraCollections.join(', ')}`);
  } else {
    logTest('No unexpected collections', 'pass');
  }
}

function validateUsers(db) {
  log('\n=== Users Collection Validation ===', 'cyan');

  if (!db.users || !Array.isArray(db.users)) {
    logTest('Users collection', 'fail', 'Collection not available');
    return;
  }

  const users = db.users;

  if (users.length === 0) {
    logTest('Users exist', 'warn', 'No users found in database');
    return;
  }

  logTest('Users exist', 'pass', `Found ${users.length} users`);

  // Validate required fields
  const requiredFields = ['id', 'email', 'password', 'role', 'name'];
  let usersValid = true;

  users.forEach((user, index) => {
    for (const field of requiredFields) {
      if (!user.hasOwnProperty(field)) {
        logTest(`User ${index + 1} has required fields`, 'fail', `Missing field: ${field}`);
        usersValid = false;
      }
    }

    // Check password is hashed (bcrypt starts with $2a$ or $2b$)
    if (user.password && !user.password.startsWith('$2')) {
      logTest(`User "${user.email}" password hashing`, 'fail', 'Password does not appear to be hashed');
      usersValid = false;
    }

    // Check valid role
    const validRoles = ['admin', 'doctor', 'patient'];
    if (user.role && !validRoles.includes(user.role)) {
      logTest(`User "${user.email}" role`, 'fail', `Invalid role: ${user.role}`);
      usersValid = false;
    }

    // Check email format
    if (user.email && !user.email.includes('@')) {
      logTest(`User "${user.email}" email format`, 'warn', 'Email format appears invalid');
    }
  });

  if (usersValid) {
    logTest('All users have required fields', 'pass');
  }

  // Check for duplicate IDs
  const ids = users.map(u => u.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    logTest('User IDs are unique', 'fail', `Duplicate IDs: ${duplicateIds.join(', ')}`);
  } else {
    logTest('User IDs are unique', 'pass');
  }

  // Check for duplicate emails
  const emails = users.map(u => u.email);
  const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
  if (duplicateEmails.length > 0) {
    logTest('User emails are unique', 'fail', `Duplicate emails: ${duplicateEmails.join(', ')}`);
  } else {
    logTest('User emails are unique', 'pass');
  }

  // Check role distribution
  const roleCount = {
    admin: users.filter(u => u.role === 'admin').length,
    doctor: users.filter(u => u.role === 'doctor').length,
    patient: users.filter(u => u.role === 'patient').length
  };

  logTest('Role distribution', 'pass', `Admin: ${roleCount.admin}, Doctor: ${roleCount.doctor}, Patient: ${roleCount.patient}`);

  if (roleCount.admin === 0) {
    logTest('Admin user exists', 'warn', 'No admin users found');
  }
}

function validatePatients(db) {
  log('\n=== Patients Collection Validation ===', 'cyan');

  if (!db.patients || !Array.isArray(db.patients)) {
    logTest('Patients collection', 'fail', 'Collection not available');
    return;
  }

  const patients = db.patients;

  logTest('Patients collection exists', 'pass', `Found ${patients.length} patient records`);

  if (patients.length === 0) {
    logTest('Patient records', 'warn', 'No patient records found');
    return;
  }

  // Validate required fields
  const requiredFields = ['id', 'user_id'];
  let patientsValid = true;

  patients.forEach((patient, index) => {
    for (const field of requiredFields) {
      if (!patient.hasOwnProperty(field)) {
        logTest(`Patient ${index + 1} required fields`, 'fail', `Missing field: ${field}`);
        patientsValid = false;
      }
    }

    // Check user_id references valid user
    if (patient.user_id && db.users) {
      const userExists = db.users.find(u => u.id === patient.user_id);
      if (!userExists) {
        logTest(`Patient ${index + 1} user reference`, 'fail', `user_id ${patient.user_id} does not exist`);
        patientsValid = false;
      } else if (userExists.role !== 'patient') {
        logTest(`Patient ${index + 1} user role`, 'fail', `Referenced user is not a patient (role: ${userExists.role})`);
        patientsValid = false;
      }
    }
  });

  if (patientsValid) {
    logTest('All patients have valid references', 'pass');
  }

  // Check for orphaned patient records (user_id doesn't exist)
  const orphanedPatients = patients.filter(p => {
    return !db.users.find(u => u.id === p.user_id);
  });

  if (orphanedPatients.length > 0) {
    logTest('No orphaned patient records', 'fail', `Found ${orphanedPatients.length} orphaned records`);
  } else {
    logTest('No orphaned patient records', 'pass');
  }
}

function validateVitalSigns(db) {
  log('\n=== Vital Signs Collection Validation ===', 'cyan');

  if (!db.vitalSigns || !Array.isArray(db.vitalSigns)) {
    logTest('Vital signs collection', 'fail', 'Collection not available');
    return;
  }

  const vitals = db.vitalSigns;

  logTest('Vital signs collection exists', 'pass', `Found ${vitals.length} vital sign records`);

  if (vitals.length === 0) {
    logTest('Vital sign records', 'warn', 'No vital sign records found');
    return;
  }

  // Validate required fields
  const requiredFields = ['id', 'patient_id', 'recorded_at'];
  let vitalsValid = true;

  vitals.forEach((vital, index) => {
    for (const field of requiredFields) {
      if (!vital.hasOwnProperty(field)) {
        logTest(`Vital sign ${index + 1} required fields`, 'fail', `Missing field: ${field}`);
        vitalsValid = false;
      }
    }

    // Validate patient_id reference
    if (vital.patient_id && db.patients) {
      const patientExists = db.patients.find(p => p.id === vital.patient_id);
      if (!patientExists) {
        logTest(`Vital sign ${index + 1} patient reference`, 'fail', `patient_id ${vital.patient_id} does not exist`);
        vitalsValid = false;
      }
    }

    // Validate vital ranges (if present)
    if (vital.heart_rate && (vital.heart_rate < 30 || vital.heart_rate > 200)) {
      logTest(`Vital sign ${index + 1} heart rate`, 'warn', `Unusual value: ${vital.heart_rate} bpm`);
    }

    if (vital.temperature && (vital.temperature < 30 || vital.temperature > 45)) {
      logTest(`Vital sign ${index + 1} temperature`, 'warn', `Unusual value: ${vital.temperature}°C`);
    }

    if (vital.oxygen_saturation && (vital.oxygen_saturation < 50 || vital.oxygen_saturation > 100)) {
      logTest(`Vital sign ${index + 1} oxygen saturation`, 'warn', `Unusual value: ${vital.oxygen_saturation}%`);
    }
  });

  if (vitalsValid) {
    logTest('All vital signs have valid references', 'pass');
  }
}

function validateAppointments(db) {
  log('\n=== Appointments Collection Validation ===', 'cyan');

  if (!db.appointments || !Array.isArray(db.appointments)) {
    logTest('Appointments collection', 'fail', 'Collection not available');
    return;
  }

  const appointments = db.appointments;

  logTest('Appointments collection exists', 'pass', `Found ${appointments.length} appointments`);

  if (appointments.length === 0) {
    logTest('Appointment records', 'warn', 'No appointments found');
    return;
  }

  // Validate required fields
  const requiredFields = ['id', 'patient_id', 'doctor_id', 'date', 'time', 'status'];
  let appointmentsValid = true;

  appointments.forEach((appointment, index) => {
    for (const field of requiredFields) {
      if (!appointment.hasOwnProperty(field)) {
        logTest(`Appointment ${index + 1} required fields`, 'fail', `Missing field: ${field}`);
        appointmentsValid = false;
      }
    }

    // Validate patient reference
    if (appointment.patient_id && db.users) {
      const patientExists = db.users.find(u => u.id === appointment.patient_id && u.role === 'patient');
      if (!patientExists) {
        logTest(`Appointment ${index + 1} patient reference`, 'fail', `patient_id ${appointment.patient_id} invalid`);
        appointmentsValid = false;
      }
    }

    // Validate doctor reference
    if (appointment.doctor_id && db.users) {
      const doctorExists = db.users.find(u => u.id === appointment.doctor_id && u.role === 'doctor');
      if (!doctorExists) {
        logTest(`Appointment ${index + 1} doctor reference`, 'fail', `doctor_id ${appointment.doctor_id} invalid`);
        appointmentsValid = false;
      }
    }

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled'];
    if (appointment.status && !validStatuses.includes(appointment.status)) {
      logTest(`Appointment ${index + 1} status`, 'warn', `Unusual status: ${appointment.status}`);
    }

    // Validate date format
    if (appointment.date && !/^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) {
      logTest(`Appointment ${index + 1} date format`, 'warn', `Date format should be YYYY-MM-DD: ${appointment.date}`);
    }
  });

  if (appointmentsValid) {
    logTest('All appointments have valid references', 'pass');
  }
}

function validatePrescriptions(db) {
  log('\n=== Prescriptions Collection Validation ===', 'cyan');

  if (!db.prescriptions || !Array.isArray(db.prescriptions)) {
    logTest('Prescriptions collection', 'fail', 'Collection not available');
    return;
  }

  const prescriptions = db.prescriptions;

  logTest('Prescriptions collection exists', 'pass', `Found ${prescriptions.length} prescriptions`);

  if (prescriptions.length === 0) {
    logTest('Prescription records', 'warn', 'No prescriptions found');
    return;
  }

  // Validate required fields
  const requiredFields = ['id', 'patient_id', 'doctor_id', 'medication', 'dosage', 'frequency'];
  let prescriptionsValid = true;

  prescriptions.forEach((prescription, index) => {
    for (const field of requiredFields) {
      if (!prescription.hasOwnProperty(field)) {
        logTest(`Prescription ${index + 1} required fields`, 'fail', `Missing field: ${field}`);
        prescriptionsValid = false;
      }
    }

    // Validate patient reference
    if (prescription.patient_id && db.users) {
      const patientExists = db.users.find(u => u.id === prescription.patient_id && u.role === 'patient');
      if (!patientExists) {
        logTest(`Prescription ${index + 1} patient reference`, 'fail', `patient_id ${prescription.patient_id} invalid`);
        prescriptionsValid = false;
      }
    }

    // Validate doctor reference
    if (prescription.doctor_id && db.users) {
      const doctorExists = db.users.find(u => u.id === prescription.doctor_id && u.role === 'doctor');
      if (!doctorExists) {
        logTest(`Prescription ${index + 1} doctor reference`, 'fail', `doctor_id ${prescription.doctor_id} invalid`);
        prescriptionsValid = false;
      }
    }

    // Validate status
    const validStatuses = ['pending', 'active', 'completed', 'cancelled'];
    if (prescription.status && !validStatuses.includes(prescription.status)) {
      logTest(`Prescription ${index + 1} status`, 'warn', `Unusual status: ${prescription.status}`);
    }
  });

  if (prescriptionsValid) {
    logTest('All prescriptions have valid references', 'pass');
  }
}

function validateDataIntegrity(db) {
  log('\n=== Data Integrity Validation ===', 'cyan');

  // Check for cross-collection integrity

  // Every patient should have a user
  if (db.patients && db.users) {
    const patientsWithoutUsers = db.patients.filter(p => {
      return !db.users.find(u => u.id === p.user_id);
    });

    if (patientsWithoutUsers.length === 0) {
      logTest('All patients have corresponding users', 'pass');
    } else {
      logTest('Patient-user integrity', 'fail', `${patientsWithoutUsers.length} patients without users`);
    }
  }

  // All patient-role users should have patient records
  if (db.users && db.patients) {
    const patientUsers = db.users.filter(u => u.role === 'patient');
    const usersWithoutPatientRecords = patientUsers.filter(u => {
      return !db.patients.find(p => p.user_id === u.id);
    });

    if (usersWithoutPatientRecords.length === 0) {
      logTest('All patient users have patient records', 'pass');
    } else {
      logTest('User-patient integrity', 'warn', `${usersWithoutPatientRecords.length} patient users without records`);
    }
  }

  // Check appointment/prescription references are valid
  if (db.appointments && db.users) {
    const invalidAppointments = db.appointments.filter(a => {
      const patientExists = db.users.find(u => u.id === a.patient_id);
      const doctorExists = db.users.find(u => u.id === a.doctor_id);
      return !patientExists || !doctorExists;
    });

    if (invalidAppointments.length === 0) {
      logTest('All appointment references valid', 'pass');
    } else {
      logTest('Appointment reference integrity', 'fail', `${invalidAppointments.length} appointments with invalid references`);
    }
  }

  if (db.prescriptions && db.users) {
    const invalidPrescriptions = db.prescriptions.filter(p => {
      const patientExists = db.users.find(u => u.id === p.patient_id);
      const doctorExists = db.users.find(u => u.id === p.doctor_id);
      return !patientExists || !doctorExists;
    });

    if (invalidPrescriptions.length === 0) {
      logTest('All prescription references valid', 'pass');
    } else {
      logTest('Prescription reference integrity', 'fail', `${invalidPrescriptions.length} prescriptions with invalid references`);
    }
  }
}

function generateDatabaseStatistics(db) {
  log('\n=== Database Statistics ===', 'cyan');

  if (!db) {
    log('  No database loaded', 'red');
    return;
  }

  log(`  Users:           ${db.users?.length || 0}`);
  log(`  Patients:        ${db.patients?.length || 0}`);
  log(`  Vital Signs:     ${db.vitalSigns?.length || 0}`);
  log(`  Appointments:    ${db.appointments?.length || 0}`);
  log(`  Prescriptions:   ${db.prescriptions?.length || 0}`);
  log(`  Messages:        ${db.messages?.length || 0}`);

  if (db.users) {
    log(`\n  Users by Role:`);
    const roleCount = {
      admin: db.users.filter(u => u.role === 'admin').length,
      doctor: db.users.filter(u => u.role === 'doctor').length,
      patient: db.users.filter(u => u.role === 'patient').length
    };
    log(`    Admin:         ${roleCount.admin}`);
    log(`    Doctor:        ${roleCount.doctor}`);
    log(`    Patient:       ${roleCount.patient}`);
  }

  if (db.appointments) {
    const statusCount = {};
    db.appointments.forEach(a => {
      statusCount[a.status] = (statusCount[a.status] || 0) + 1;
    });
    log(`\n  Appointments by Status:`);
    Object.keys(statusCount).forEach(status => {
      log(`    ${status}: ${statusCount[status]}`);
    });
  }
}

// Main validation runner
function runValidation() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   MediConnect Pro - Database Validation                   ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nDatabase: ${DB_PATH}`, 'cyan');
  log(`Started: ${new Date().toISOString()}\n`, 'cyan');

  const startTime = Date.now();

  // Validate database file exists
  if (!validateDatabaseExists()) {
    log('\nValidation cannot continue without database file', 'red');
    process.exit(1);
  }

  // Load database
  const db = loadDatabase();
  if (!db) {
    log('\nValidation cannot continue with invalid JSON', 'red');
    process.exit(1);
  }

  // Run validations
  validateDatabaseStructure(db);
  validateUsers(db);
  validatePatients(db);
  validateVitalSigns(db);
  validateAppointments(db);
  validatePrescriptions(db);
  validateDataIntegrity(db);
  generateDatabaseStatistics(db);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   Validation Summary                                       ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTotal Checks:   ${results.passed + results.failed + results.warnings}`);
  log(`Passed:         ${results.passed}`, 'green');
  log(`Failed:         ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`Warnings:       ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'reset');
  log(`Duration:       ${duration}s`);
  log(`Completed:      ${new Date().toISOString()}\n`);

  // Overall status
  if (results.failed === 0) {
    if (results.warnings === 0) {
      log('✓ Database is VALID and HEALTHY', 'green');
    } else {
      log('⚠ Database is VALID with warnings', 'yellow');
    }
  } else {
    log('✗ Database has INTEGRITY ISSUES', 'red');
  }

  // List issues
  if (results.issues.length > 0) {
    log('\n--- Issues Found ---', 'magenta');

    const errors = results.issues.filter(i => i.type === 'error');
    const warnings = results.issues.filter(i => i.type === 'warning');

    if (errors.length > 0) {
      log('\nErrors:', 'red');
      errors.forEach(issue => {
        log(`  - ${issue.test}: ${issue.message}`, 'red');
      });
    }

    if (warnings.length > 0) {
      log('\nWarnings:', 'yellow');
      warnings.forEach(issue => {
        log(`  - ${issue.test}: ${issue.message}`, 'yellow');
      });
    }
  }

  log('\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run validation
runValidation();

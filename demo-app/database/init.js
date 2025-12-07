// Database initialization with JSON file storage or PostgreSQL
// Supports backend switching via USE_POSTGRES environment variable
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Check which database backend to use
const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;

const DB_FILE = path.join(__dirname, 'database.json');

// In-memory database structure
let db = {
  users: [],
  patients: [],
  vitalSigns: [],
  appointments: [],
  prescriptions: [],
  messages: [],
  passwordResetTokens: []
};

// Performance optimization: In-memory indexes for fast lookups
let indexes = {
  usersByEmail: new Map(),
  usersById: new Map(),
  patientsByUserId: new Map(),
  appointmentsByPatient: new Map(),
  appointmentsByDoctor: new Map(),
  prescriptionsByPatient: new Map(),
  prescriptionsByDoctor: new Map()
};

// Rebuild indexes for performance optimization
function rebuildIndexes() {
  // Clear existing indexes
  indexes.usersByEmail.clear();
  indexes.usersById.clear();
  indexes.patientsByUserId.clear();
  indexes.appointmentsByPatient.clear();
  indexes.appointmentsByDoctor.clear();
  indexes.prescriptionsByPatient.clear();
  indexes.prescriptionsByDoctor.clear();

  // Index users
  db.users.forEach(user => {
    indexes.usersByEmail.set(user.email, user);
    indexes.usersById.set(user.id, user);
  });

  // Index patients
  db.patients.forEach(patient => {
    indexes.patientsByUserId.set(patient.user_id, patient);
  });

  // Index appointments
  db.appointments.forEach(appointment => {
    if (!indexes.appointmentsByPatient.has(appointment.patient_id)) {
      indexes.appointmentsByPatient.set(appointment.patient_id, []);
    }
    indexes.appointmentsByPatient.get(appointment.patient_id).push(appointment);

    if (!indexes.appointmentsByDoctor.has(appointment.doctor_id)) {
      indexes.appointmentsByDoctor.set(appointment.doctor_id, []);
    }
    indexes.appointmentsByDoctor.get(appointment.doctor_id).push(appointment);
  });

  // Index prescriptions
  db.prescriptions.forEach(prescription => {
    if (!indexes.prescriptionsByPatient.has(prescription.patient_id)) {
      indexes.prescriptionsByPatient.set(prescription.patient_id, []);
    }
    indexes.prescriptionsByPatient.get(prescription.patient_id).push(prescription);

    if (!indexes.prescriptionsByDoctor.has(prescription.doctor_id)) {
      indexes.prescriptionsByDoctor.set(prescription.doctor_id, []);
    }
    indexes.prescriptionsByDoctor.get(prescription.doctor_id).push(prescription);
  });
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const loadedDb = JSON.parse(data);

      // Ensure all required properties exist
      db = {
        users: loadedDb.users || [],
        patients: loadedDb.patients || [],
        vitalSigns: loadedDb.vitalSigns || [],
        appointments: loadedDb.appointments || [],
        prescriptions: loadedDb.prescriptions || [],
        messages: loadedDb.messages || [],
        passwordResetTokens: loadedDb.passwordResetTokens || []
      };

      // Rebuild indexes for performance
      rebuildIndexes();

      console.log('✅ Database loaded from file');
    } else {
      console.log('📝 Creating new database');
      seedDatabase();
    }
  } catch (error) {
    console.error('Error loading database:', error);
    seedDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

function seedDatabase() {
  console.log('🌱 Seeding demo users...');

  // Hash passwords
  const adminPassword = bcrypt.hashSync('Demo2024!Admin', 10);
  const doctorPassword = bcrypt.hashSync('Demo2024!Doctor', 10);
  const patientPassword = bcrypt.hashSync('Demo2024!Patient', 10);

  // Create users
  db.users = [
    {
      id: 1,
      email: 'admin@mediconnect.demo',
      password: adminPassword,
      role: 'admin',
      name: 'Admin User',
      specialization: null,
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      email: 'dr.smith@mediconnect.demo',
      password: doctorPassword,
      role: 'doctor',
      name: 'Dr. Sarah Smith',
      specialization: 'General Practitioner',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      email: 'john.doe@mediconnect.demo',
      password: patientPassword,
      role: 'patient',
      name: 'John Doe',
      specialization: null,
      created_at: new Date().toISOString()
    }
  ];

  // Create patient records
  db.patients = [
    {
      id: 1,
      user_id: 3,
      blood_type: 'A+',
      allergies: 'Penicillin',
      conditions: 'Hypertension'
    }
  ];

  // Create vital signs
  db.vitalSigns = [
    {
      id: 1,
      patient_id: 1,
      heart_rate: 72,
      blood_pressure: '120/80',
      temperature: 36.6,
      oxygen_saturation: 98,
      recorded_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      patient_id: 1,
      heart_rate: 75,
      blood_pressure: '125/82',
      temperature: 36.7,
      oxygen_saturation: 97,
      recorded_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 3,
      patient_id: 1,
      heart_rate: 68,
      blood_pressure: '118/78',
      temperature: 36.5,
      oxygen_saturation: 99,
      recorded_at: new Date(Date.now() - 10800000).toISOString()
    }
  ];

  // Create sample appointments
  db.appointments = [
    {
      id: 1,
      patient_id: 3,
      doctor_id: 2,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '10:00',
      reason: 'Regular checkup',
      status: 'scheduled',
      created_at: new Date().toISOString()
    }
  ];

  // Create sample prescriptions
  db.prescriptions = [
    {
      id: 1,
      patient_id: 3,
      doctor_id: 2,
      medication: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      pharmacy: 'Main Street Pharmacy',
      status: 'active',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  db.messages = [];

  saveDatabase();
  rebuildIndexes(); // Rebuild indexes after seeding
  console.log('✅ Demo users seeded successfully!');
}

async function initDatabase() {
  // Use PostgreSQL if environment variable is set
  if (USE_POSTGRES) {
    console.log('🔄 Initializing PostgreSQL database...');
    try {
      const { initPostgresDatabase } = require('./postgres-adapter');
      const pgDatabase = await initPostgresDatabase();
      console.log('✅ PostgreSQL database initialized successfully');
      return pgDatabase;
    } catch (error) {
      console.error('❌ Failed to initialize PostgreSQL database:', error.message);
      console.log('⚠️  Falling back to JSON file storage...');
      // Fall through to JSON initialization
    }
  }

  // Use JSON file storage (default)
  console.log('🔄 Initializing JSON file database...');
  loadDatabase();

  return {
    // Direct access to database object for modules that need it
    database: db,

    getUserByEmail: (email) => {
      // O(1) lookup using index instead of O(n) array scan
      return indexes.usersByEmail.get(email) || null;
    },

    getUserById: (userId) => {
      // O(1) lookup using index instead of O(n) array scan
      return indexes.usersById.get(parseInt(userId)) || null;
    },

    getAllUsers: () => {
      return db.users;
    },

    getPatientByUserId: (userId) => {
      // O(1) lookup using index instead of O(n) array scan
      return indexes.patientsByUserId.get(userId) || null;
    },

    getVitalsByPatientId: (patientId) => {
      return db.vitalSigns
        .filter(v => v.patient_id === patientId)
        .sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
        .slice(0, 10);
    },

    getAllPatients: () => {
      return db.users
        .filter(u => u.role === 'patient')
        .map(user => {
          const patient = db.patients.find(p => p.user_id === user.id);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            blood_type: patient?.blood_type || null,
            allergies: patient?.allergies || null,
            conditions: patient?.conditions || null
          };
        });
    },

    getPatientById: (patientId) => {
      const user = db.users.find(u => u.id === parseInt(patientId) && u.role === 'patient');
      if (!user) return null;

      const patient = db.patients.find(p => p.user_id === user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        patient_id: patient?.id || null,
        blood_type: patient?.blood_type || null,
        allergies: patient?.allergies || null,
        conditions: patient?.conditions || null,
        insuranceProvider: patient?.insuranceProvider || null,
        insuranceMemberId: patient?.insuranceMemberId || null,
        lastEligibilityCheck: patient?.lastEligibilityCheck || null
      };
    },

    updatePatient: (patientId, updateData) => {
      const user = db.users.find(u => u.id === parseInt(patientId) && u.role === 'patient');
      if (!user) return null;

      let patient = db.patients.find(p => p.user_id === user.id);

      if (!patient) {
        // Create patient record if doesn't exist
        patient = {
          id: db.patients.length > 0 ? Math.max(...db.patients.map(p => p.id)) + 1 : 1,
          user_id: user.id
        };
        db.patients.push(patient);
      }

      // Update patient fields
      Object.assign(patient, updateData);
      saveDatabase();
      return patient;
    },

    getStats: () => {
      return {
        totalUsers: db.users.length,
        totalPatients: db.users.filter(u => u.role === 'patient').length,
        totalDoctors: db.users.filter(u => u.role === 'doctor').length,
        totalVitals: db.vitalSigns.length
      };
    },

    // Appointments
    getAppointments: (userId, role) => {
      if (!db.appointments || !Array.isArray(db.appointments)) {
        console.error('Appointments array is not initialized');
        return [];
      }
      // O(1) lookup using indexes instead of O(n) array scan
      if (role === 'patient') {
        return indexes.appointmentsByPatient.get(userId) || [];
      } else if (role === 'doctor') {
        return indexes.appointmentsByDoctor.get(userId) || [];
      }
      return db.appointments;
    },

    getAppointmentById: (appointmentId) => {
      return db.appointments.find(a => a.id === parseInt(appointmentId));
    },

    createAppointment: (appointmentData) => {
      const newId = db.appointments.length > 0 ? Math.max(...db.appointments.map(a => a.id)) + 1 : 1;
      const appointment = {
        id: newId,
        ...appointmentData,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };
      db.appointments.push(appointment);

      // Update indexes
      if (!indexes.appointmentsByPatient.has(appointment.patient_id)) {
        indexes.appointmentsByPatient.set(appointment.patient_id, []);
      }
      indexes.appointmentsByPatient.get(appointment.patient_id).push(appointment);

      if (!indexes.appointmentsByDoctor.has(appointment.doctor_id)) {
        indexes.appointmentsByDoctor.set(appointment.doctor_id, []);
      }
      indexes.appointmentsByDoctor.get(appointment.doctor_id).push(appointment);

      saveDatabase();
      return appointment;
    },

    updateAppointment: (appointmentId, updateData) => {
      const appointment = db.appointments.find(a => a.id === parseInt(appointmentId));
      if (!appointment) return null;

      Object.assign(appointment, updateData);
      saveDatabase();
      return appointment;
    },

    // Prescriptions
    getPrescriptions: (userId, role) => {
      if (!db.prescriptions || !Array.isArray(db.prescriptions)) {
        console.error('Prescriptions array is not initialized');
        return [];
      }
      // O(1) lookup using indexes instead of O(n) array scan
      if (role === 'patient') {
        return indexes.prescriptionsByPatient.get(userId) || [];
      } else if (role === 'doctor') {
        return indexes.prescriptionsByDoctor.get(userId) || [];
      }
      return db.prescriptions;
    },

    createPrescription: (prescriptionData) => {
      const newId = db.prescriptions.length > 0 ? Math.max(...db.prescriptions.map(p => p.id)) + 1 : 1;
      const prescription = {
        id: newId,
        ...prescriptionData,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      db.prescriptions.push(prescription);

      // Update indexes
      if (!indexes.prescriptionsByPatient.has(prescription.patient_id)) {
        indexes.prescriptionsByPatient.set(prescription.patient_id, []);
      }
      indexes.prescriptionsByPatient.get(prescription.patient_id).push(prescription);

      if (!indexes.prescriptionsByDoctor.has(prescription.doctor_id)) {
        indexes.prescriptionsByDoctor.set(prescription.doctor_id, []);
      }
      indexes.prescriptionsByDoctor.get(prescription.doctor_id).push(prescription);

      saveDatabase();
      return prescription;
    },

    getPrescriptionById: (prescriptionId) => {
      return db.prescriptions.find(p => p.id === parseInt(prescriptionId));
    },

    updatePrescription: (prescriptionId, updateData) => {
      const index = db.prescriptions.findIndex(p => p.id === parseInt(prescriptionId));
      if (index === -1) {
        return null;
      }
      db.prescriptions[index] = {
        ...db.prescriptions[index],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      saveDatabase();
      return db.prescriptions[index];
    },

    // Messages
    getMessages: (userId) => {
      return db.messages.filter(m => m.to_user_id === userId || m.from_user_id === userId);
    },

    getMessageById: (messageId) => {
      return db.messages.find(m => m.id === parseInt(messageId));
    },

    createMessage: (messageData) => {
      const newId = db.messages.length > 0 ? Math.max(...db.messages.map(m => m.id)) + 1 : 1;
      const message = {
        id: newId,
        ...messageData,
        created_at: new Date().toISOString()
      };
      db.messages.push(message);
      saveDatabase();
      return message;
    },

    updateMessage: (messageId, updateData) => {
      const index = db.messages.findIndex(m => m.id === parseInt(messageId));
      if (index === -1) return null;

      db.messages[index] = {
        ...db.messages[index],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      saveDatabase();
      return db.messages[index];
    },

    // User creation
    createUser: (userData) => {
      const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
      const user = {
        id: newId,
        ...userData,
        created_at: new Date().toISOString()
      };
      db.users.push(user);

      // Update indexes
      indexes.usersByEmail.set(user.email, user);
      indexes.usersById.set(user.id, user);

      saveDatabase();
      return user;
    },

    updateUser: (userId, updateData) => {
      const index = db.users.findIndex(u => u.id === parseInt(userId));
      if (index === -1) return null;

      db.users[index] = {
        ...db.users[index],
        ...updateData,
        updated_at: new Date().toISOString()
      };
      saveDatabase();
      return db.users[index];
    },

    // Password reset tokens
    createPasswordResetToken: (userId, token, expiresAt) => {
      // Remove any existing tokens for this user
      db.passwordResetTokens = db.passwordResetTokens.filter(t => t.user_id !== userId);

      const resetToken = {
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      };
      db.passwordResetTokens.push(resetToken);
      saveDatabase();
      return resetToken;
    },

    getPasswordResetToken: (token) => {
      return db.passwordResetTokens.find(t => t.token === token);
    },

    deletePasswordResetToken: (token) => {
      const index = db.passwordResetTokens.findIndex(t => t.token === token);
      if (index !== -1) {
        db.passwordResetTokens.splice(index, 1);
        saveDatabase();
        return true;
      }
      return false;
    },

    // Create patient record for new user
    createPatientRecord: (userId, patientData = {}) => {
      const newId = db.patients.length > 0 ? Math.max(...db.patients.map(p => p.id)) + 1 : 1;
      const patient = {
        id: newId,
        user_id: userId,
        ...patientData
      };
      db.patients.push(patient);

      // Update indexes
      indexes.patientsByUserId.set(userId, patient);

      saveDatabase();
      return patient;
    }
  };
}

module.exports = { initDatabase };

// Database initialization with JSON file storage
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'database.json');

// In-memory database structure
let db = {
  users: [],
  patients: [],
  vitalSigns: [],
  appointments: [],
  prescriptions: [],
  messages: []
};

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
        messages: loadedDb.messages || []
      };

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
  console.log('✅ Demo users seeded successfully!');
}

function initDatabase() {
  loadDatabase();

  return {
    getUserByEmail: (email) => {
      return db.users.find(u => u.email === email);
    },

    getUserById: (userId) => {
      return db.users.find(u => u.id === parseInt(userId));
    },

    getAllUsers: () => {
      return db.users;
    },

    getPatientByUserId: (userId) => {
      return db.patients.find(p => p.user_id === userId);
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
      if (role === 'patient') {
        return db.appointments.filter(a => a.patient_id === userId);
      } else if (role === 'doctor') {
        return db.appointments.filter(a => a.doctor_id === userId);
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
      if (role === 'patient') {
        return db.prescriptions.filter(p => p.patient_id === userId);
      } else if (role === 'doctor') {
        return db.prescriptions.filter(p => p.doctor_id === userId);
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
      saveDatabase();
      return prescription;
    },

    // Messages
    getMessages: (userId) => {
      return db.messages.filter(m => m.to_user_id === userId || m.from_user_id === userId);
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
    }
  };
}

module.exports = { initDatabase };

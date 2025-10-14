// Database initialization with JSON file storage
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'database.json');

// In-memory database structure
let db = {
  users: [],
  patients: [],
  vitalSigns: []
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
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

  saveDatabase();
  console.log('✅ Demo users seeded successfully!');
}

function initDatabase() {
  loadDatabase();

  return {
    getUserByEmail: (email) => {
      return db.users.find(u => u.email === email);
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
        conditions: patient?.conditions || null
      };
    },

    getStats: () => {
      return {
        totalUsers: db.users.length,
        totalPatients: db.users.filter(u => u.role === 'patient').length,
        totalDoctors: db.users.filter(u => u.role === 'doctor').length,
        totalVitals: db.vitalSigns.length
      };
    }
  };
}

module.exports = { initDatabase };

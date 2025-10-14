// Database initialization with SQLite
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

function initDatabase() {
  const db = new Database(path.join(__dirname, 'mediconnect.db'));

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      specialization TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      blood_type TEXT,
      allergies TEXT,
      conditions TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create vital_signs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vital_signs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      heart_rate INTEGER,
      blood_pressure TEXT,
      temperature REAL,
      oxygen_saturation INTEGER,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    )
  `);

  // Check if demo users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();

  if (userCount.count === 0) {
    console.log('Seeding demo users...');

    // Hash passwords
    const adminPassword = bcrypt.hashSync('Demo2024!Admin', 10);
    const doctorPassword = bcrypt.hashSync('Demo2024!Doctor', 10);
    const patientPassword = bcrypt.hashSync('Demo2024!Patient', 10);

    // Insert demo users
    const insertUser = db.prepare('INSERT INTO users (email, password, role, name, specialization) VALUES (?, ?, ?, ?, ?)');

    insertUser.run('admin@mediconnect.demo', adminPassword, 'admin', 'Admin User', null);
    const doctorId = insertUser.run('dr.smith@mediconnect.demo', doctorPassword, 'doctor', 'Dr. Sarah Smith', 'General Practitioner').lastInsertRowid;
    const patientId = insertUser.run('john.doe@mediconnect.demo', patientPassword, 'patient', 'John Doe', null).lastInsertRowid;

    // Insert patient data
    const insertPatient = db.prepare('INSERT INTO patients (user_id, blood_type, allergies, conditions) VALUES (?, ?, ?, ?)');
    const patientRecordId = insertPatient.run(patientId, 'A+', 'Penicillin', 'Hypertension').lastInsertRowid;

    // Insert sample vital signs
    const insertVitals = db.prepare('INSERT INTO vital_signs (patient_id, heart_rate, blood_pressure, temperature, oxygen_saturation) VALUES (?, ?, ?, ?, ?)');
    insertVitals.run(patientRecordId, 72, '120/80', 36.6, 98);
    insertVitals.run(patientRecordId, 75, '125/82', 36.7, 97);
    insertVitals.run(patientRecordId, 68, '118/78', 36.5, 99);

    console.log('Demo users seeded successfully!');
  }

  return db;
}

module.exports = { initDatabase };

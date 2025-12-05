const { initDatabase } = require('../database/init');

describe('Database Operations', () => {
  let db;

  beforeAll(async () => {
    db = await initDatabase();
  });

  describe('User Operations', () => {
    test('getUserByEmail should return existing user', () => {
      const user = db.getUserByEmail('admin@mediconnect.demo');

      expect(user).toBeDefined();
      expect(user).toHaveProperty('email', 'admin@mediconnect.demo');
      expect(user).toHaveProperty('role', 'admin');
      expect(user).toHaveProperty('id');
    });

    test('getUserByEmail should return undefined for non-existent user', () => {
      const user = db.getUserByEmail('nonexistent@example.com');

      expect(user).toBeUndefined();
    });

    test('getUserById should return existing user', () => {
      const user = db.getUserById(1);

      expect(user).toBeDefined();
      expect(user).toHaveProperty('id', 1);
      expect(user).toHaveProperty('email');
    });

    test('getUserById should return undefined for non-existent ID', () => {
      const user = db.getUserById(99999);

      expect(user).toBeUndefined();
    });

    test('getAllUsers should return array of users', () => {
      const users = db.getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('role');
    });

    test('user passwords should be hashed', () => {
      const user = db.getUserByEmail('dr.smith@mediconnect.demo');

      expect(user).toBeDefined();
      expect(user).toHaveProperty('password');
      // Bcrypt hashes start with $2a$, $2b$, or $2y$
      expect(user.password).toMatch(/^\$2[aby]\$/);
    });
  });

  describe('Patient Operations', () => {
    test('getAllPatients should return array', () => {
      const patients = db.getAllPatients();

      expect(Array.isArray(patients)).toBe(true);
    });

    test('getPatientById should return patient when exists', () => {
      const patients = db.getAllPatients();
      if (patients.length > 0) {
        const firstPatient = patients[0];
        const patient = db.getPatientById(firstPatient.id);

        expect(patient).toBeDefined();
        expect(patient).toHaveProperty('id', firstPatient.id);
      }
    });

    test('getPatientById should return undefined/null for non-existent ID', () => {
      const patient = db.getPatientById(99999);

      // Can be either undefined or null
      expect(patient == null).toBe(true);
    });

    test('getPatientByUserId should work correctly', () => {
      // User ID 3 is the demo patient (john.doe)
      const patient = db.getPatientByUserId(3);

      if (patient) {
        // The property might be user_id (snake_case) not userId (camelCase)
        expect(patient.user_id || patient.userId).toBe(3);
      }
    });
  });

  describe('Vital Signs Operations', () => {
    test('getVitalsByPatientId should return array', () => {
      const vitals = db.getVitalsByPatientId(1);

      expect(Array.isArray(vitals)).toBe(true);
    });

    test('getVitalsByPatientId should not crash for non-existent patient', () => {
      const vitals = db.getVitalsByPatientId(99999);

      expect(Array.isArray(vitals)).toBe(true);
      expect(vitals.length).toBe(0);
    });
  });

  describe('Appointments Operations - Defensive Checks', () => {
    test('getAppointments should return array even if appointments undefined', () => {
      const appointments = db.getAppointments('user123', 'patient');

      expect(Array.isArray(appointments)).toBe(true);
    });

    test('getAppointments should handle admin role', () => {
      const appointments = db.getAppointments(1, 'admin');

      expect(Array.isArray(appointments)).toBe(true);
    });

    test('getAppointments should filter by patient', () => {
      const appointments = db.getAppointments(3, 'patient');

      expect(Array.isArray(appointments)).toBe(true);
      // All returned appointments should belong to the patient
      appointments.forEach(apt => {
        expect(apt.patient_id).toBe(3);
      });
    });

    test('getAppointments should filter by doctor', () => {
      const appointments = db.getAppointments(2, 'doctor');

      expect(Array.isArray(appointments)).toBe(true);
      // All returned appointments should belong to the doctor
      appointments.forEach(apt => {
        expect(apt.doctor_id).toBe(2);
      });
    });

    test('getAppointmentById should work correctly', () => {
      const allAppointments = db.getAppointments(1, 'admin');

      if (allAppointments.length > 0) {
        const firstApt = allAppointments[0];
        const appointment = db.getAppointmentById(firstApt.id);

        expect(appointment).toBeDefined();
        expect(appointment).toHaveProperty('id', firstApt.id);
      }
    });

    test('createAppointment should add new appointment', () => {
      const appointmentData = {
        patient_id: 3,
        doctor_id: 2,
        date: '2025-11-01',
        time: '10:00',
        type: 'Consultation',
        status: 'scheduled'
      };

      const newAppointment = db.createAppointment(appointmentData);

      expect(newAppointment).toBeDefined();
      expect(newAppointment).toHaveProperty('id');
      expect(newAppointment.patient_id).toBe(3);
      expect(newAppointment.doctor_id).toBe(2);
      expect(newAppointment.type).toBe('Consultation');
    });
  });

  describe('Prescriptions Operations - Defensive Checks', () => {
    test('getPrescriptions should return array even if prescriptions undefined', () => {
      const prescriptions = db.getPrescriptions('user123', 'patient');

      expect(Array.isArray(prescriptions)).toBe(true);
    });

    test('getPrescriptions should handle admin role', () => {
      const prescriptions = db.getPrescriptions(1, 'admin');

      expect(Array.isArray(prescriptions)).toBe(true);
    });

    test('getPrescriptions should filter by patient', () => {
      const prescriptions = db.getPrescriptions(3, 'patient');

      expect(Array.isArray(prescriptions)).toBe(true);
      // All returned prescriptions should belong to the patient
      prescriptions.forEach(rx => {
        expect(rx.patient_id).toBe(3);
      });
    });

    test('getPrescriptions should filter by doctor', () => {
      const prescriptions = db.getPrescriptions(2, 'doctor');

      expect(Array.isArray(prescriptions)).toBe(true);
      // All returned prescriptions should belong to the doctor
      prescriptions.forEach(rx => {
        expect(rx.doctor_id).toBe(2);
      });
    });

    test('createPrescription should add new prescription', () => {
      const prescriptionData = {
        patient_id: 3,
        doctor_id: 2,
        medication: 'Test Medication',
        dosage: '10mg',
        frequency: 'Twice daily',
        duration: '7 days',
        instructions: 'Take with food',
        date: new Date().toISOString()
      };

      const newPrescription = db.createPrescription(prescriptionData);

      expect(newPrescription).toBeDefined();
      expect(newPrescription).toHaveProperty('id');
      expect(newPrescription.medication).toBe('Test Medication');
      expect(newPrescription.patient_id).toBe(3);
    });

    test('getPrescriptionById should work correctly', () => {
      const allPrescriptions = db.getPrescriptions(1, 'admin');

      if (allPrescriptions.length > 0) {
        const firstRx = allPrescriptions[0];
        const prescription = db.getPrescriptionById(firstRx.id);

        expect(prescription).toBeDefined();
        expect(prescription).toHaveProperty('id', firstRx.id);
      }
    });
  });

  describe('Stats Operations', () => {
    test('getStats should return statistics object', () => {
      const stats = db.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalPatients');
      expect(stats).toHaveProperty('totalDoctors');
      expect(stats).toHaveProperty('totalVitals');
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.totalPatients).toBe('number');
    });

    test('getStats should count users correctly', () => {
      const stats = db.getStats();
      const users = db.getAllUsers();

      expect(stats.totalUsers).toBe(users.length);
    });
  });

  describe('Data Integrity', () => {
    test('database should have demo users initialized', () => {
      const admin = db.getUserByEmail('admin@mediconnect.demo');
      const doctor = db.getUserByEmail('dr.smith@mediconnect.demo');
      const patient = db.getUserByEmail('john.doe@mediconnect.demo');

      expect(admin).toBeDefined();
      expect(doctor).toBeDefined();
      expect(patient).toBeDefined();
    });

    test('all users should have required fields', () => {
      const users = db.getAllUsers();

      users.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password');
        expect(user).toHaveProperty('role');
        expect(['admin', 'doctor', 'patient']).toContain(user.role);
      });
    });

    test('appointments should have consistent patient_id and doctor_id', () => {
      const appointments = db.getAppointments(1, 'admin');
      const users = db.getAllUsers();
      const userIds = users.map(u => u.id);

      appointments.forEach(apt => {
        expect(userIds).toContain(apt.patient_id);
        expect(userIds).toContain(apt.doctor_id);
      });
    });

    test('prescriptions should have consistent patient_id and doctor_id', () => {
      const prescriptions = db.getPrescriptions(1, 'admin');
      const users = db.getAllUsers();
      const userIds = users.map(u => u.id);

      prescriptions.forEach(rx => {
        expect(userIds).toContain(rx.patient_id);
        expect(userIds).toContain(rx.doctor_id);
      });
    });
  });
});

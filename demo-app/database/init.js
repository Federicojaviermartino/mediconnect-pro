// Database initialization with JSON file storage

const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'database.json');

function loadDatabase() {
    if (fs.existsSync(databasePath)) {
        const data = fs.readFileSync(databasePath);
        return JSON.parse(data);
    }
    return {};
}

function saveDatabase(database) {
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
}

function seedDatabase() {
    const initialData = {
        users: [],
        patients: [],
        appointments: [],
        prescriptions: [],
        messages: []
    };
    saveDatabase(initialData);
}

function initDatabase() {
    if (!fs.existsSync(databasePath)) {
        seedDatabase();
    }
}

function getUserByEmail(email) {
    const database = loadDatabase();
    return database.users.find(user => user.email === email);
}

function getUserById(id) {
    const database = loadDatabase();
    return database.users.find(user => user.id === id);
}

function getAllUsers() {
    const database = loadDatabase();
    return database.users;
}

function getPatientByUserId(userId) {
    const database = loadDatabase();
    return database.patients.find(patient => patient.userId === userId);
}

function getVitalsByPatientId(patientId) {
    const database = loadDatabase();
    return database.vitals.filter(vital => vital.patientId === patientId);
}

function getAllPatients() {
    const database = loadDatabase();
    return database.patients;
}

function getPatientById(id) {
    const database = loadDatabase();
    return database.patients.find(patient => patient.id === id);
}

function updatePatient(id, updatedData) {
    const database = loadDatabase();
    const patientIndex = database.patients.findIndex(patient => patient.id === id);
    if (patientIndex !== -1) {
        database.patients[patientIndex] = { ...database.patients[patientIndex], ...updatedData };
        saveDatabase(database);
    }
}

function getStats() {
    const database = loadDatabase();
    return {
        totalUsers: database.users.length,
        totalPatients: database.patients.length,
        totalAppointments: database.appointments.length,
        totalPrescriptions: database.prescriptions.length
    };
}

function getAppointments() {
    const database = loadDatabase();
    return database.appointments;
}

function getAppointmentById(id) {
    const database = loadDatabase();
    return database.appointments.find(appointment => appointment.id === id);
}

function createAppointment(appointment) {
    const database = loadDatabase();
    database.appointments.push(appointment);
    saveDatabase(database);
}

function updateAppointment(id, updatedData) {
    const database = loadDatabase();
    const appointmentIndex = database.appointments.findIndex(appointment => appointment.id === id);
    if (appointmentIndex !== -1) {
        database.appointments[appointmentIndex] = { ...database.appointments[appointmentIndex], ...updatedData };
        saveDatabase(database);
    }
}

function getPrescriptions() {
    const database = loadDatabase();
    return database.prescriptions;
}

function createPrescription(prescription) {
    const database = loadDatabase();
    database.prescriptions.push(prescription);
    saveDatabase(database);
}

function getMessages() {
    const database = loadDatabase();
    return database.messages;
}

function createMessage(message) {
    const database = loadDatabase();
    database.messages.push(message);
    saveDatabase(database);
}
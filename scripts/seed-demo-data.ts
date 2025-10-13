/**
 * Demo Data Seeding Script
 * Creates sample data for demonstration purposes
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';

interface DemoUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  phoneNumber?: string;
}

// Demo users for testing
const DEMO_USERS: DemoUser[] = [
  {
    email: 'admin@mediconnect.demo',
    password: 'Demo2024!Admin',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
    phoneNumber: '+1-555-0100',
  },
  {
    email: 'dr.smith@mediconnect.demo',
    password: 'Demo2024!Doctor',
    firstName: 'Dr. Sarah',
    lastName: 'Smith',
    role: 'DOCTOR',
    phoneNumber: '+1-555-0101',
  },
  {
    email: 'dr.johnson@mediconnect.demo',
    password: 'Demo2024!Doctor',
    firstName: 'Dr. Michael',
    lastName: 'Johnson',
    role: 'DOCTOR',
    phoneNumber: '+1-555-0102',
  },
  {
    email: 'john.doe@mediconnect.demo',
    password: 'Demo2024!Patient',
    firstName: 'John',
    lastName: 'Doe',
    role: 'PATIENT',
    phoneNumber: '+1-555-0201',
  },
  {
    email: 'jane.wilson@mediconnect.demo',
    password: 'Demo2024!Patient',
    firstName: 'Jane',
    lastName: 'Wilson',
    role: 'PATIENT',
    phoneNumber: '+1-555-0202',
  },
  {
    email: 'robert.brown@mediconnect.demo',
    password: 'Demo2024!Patient',
    firstName: 'Robert',
    lastName: 'Brown',
    role: 'PATIENT',
    phoneNumber: '+1-555-0203',
  },
];

async function createDemoUsers() {
  console.log('🌱 Starting demo data seeding...\n');

  const createdUsers: any[] = [];

  for (const user of DEMO_USERS) {
    try {
      console.log(`Creating user: ${user.email} (${user.role})...`);

      const response = await axios.post(`${API_URL}/api/auth/register`, {
        ...user,
        confirmPassword: user.password,
        acceptedTerms: true,
        dateOfBirth: '1990-01-01',
        gender: 'OTHER',
      });

      createdUsers.push({
        email: user.email,
        role: user.role,
        token: response.data.accessToken,
        userId: response.data.user.id,
      });

      console.log(`✅ Created: ${user.email}`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`⚠️  User already exists: ${user.email}`);
      } else {
        console.error(`❌ Error creating ${user.email}:`, error.message);
      }
    }
  }

  return createdUsers;
}

async function createDemoPatients(doctorToken: string, patientTokens: string[]) {
  console.log('\n📋 Creating demo patient records...\n');

  const patientData = [
    {
      dateOfBirth: '1985-03-15',
      bloodType: 'A+',
      allergies: ['Penicillin'],
      chronicConditions: ['Hypertension'],
      emergencyContact: {
        name: 'Mary Doe',
        relationship: 'Spouse',
        phoneNumber: '+1-555-0301',
      },
    },
    {
      dateOfBirth: '1992-07-22',
      bloodType: 'O+',
      allergies: [],
      chronicConditions: ['Type 2 Diabetes'],
      emergencyContact: {
        name: 'Tom Wilson',
        relationship: 'Spouse',
        phoneNumber: '+1-555-0302',
      },
    },
    {
      dateOfBirth: '1978-11-30',
      bloodType: 'B+',
      allergies: ['Aspirin', 'Latex'],
      chronicConditions: ['Asthma'],
      emergencyContact: {
        name: 'Lisa Brown',
        relationship: 'Wife',
        phoneNumber: '+1-555-0303',
      },
    },
  ];

  for (let i = 0; i < patientTokens.length; i++) {
    try {
      await axios.post(
        `${API_URL}/api/patients`,
        patientData[i],
        {
          headers: { Authorization: `Bearer ${patientTokens[i]}` },
        }
      );
      console.log(`✅ Created patient record ${i + 1}`);
    } catch (error: any) {
      console.error(`❌ Error creating patient record:`, error.message);
    }
  }
}

async function createDemoVitals(patientTokens: string[]) {
  console.log('\n💓 Creating demo vital signs...\n');

  const vitalsSamples = [
    {
      heartRate: 72,
      bloodPressure: { systolic: 120, diastolic: 80 },
      temperature: 36.6,
      oxygenSaturation: 98,
      respiratoryRate: 16,
    },
    {
      heartRate: 78,
      bloodPressure: { systolic: 135, diastolic: 85 },
      temperature: 36.8,
      oxygenSaturation: 97,
      respiratoryRate: 18,
    },
    {
      heartRate: 68,
      bloodPressure: { systolic: 118, diastolic: 78 },
      temperature: 36.5,
      oxygenSaturation: 99,
      respiratoryRate: 14,
    },
  ];

  for (let i = 0; i < patientTokens.length; i++) {
    try {
      await axios.post(
        `${API_URL}/api/vitals`,
        vitalsSamples[i],
        {
          headers: { Authorization: `Bearer ${patientTokens[i]}` },
        }
      );
      console.log(`✅ Created vitals for patient ${i + 1}`);
    } catch (error: any) {
      console.error(`❌ Error creating vitals:`, error.message);
    }
  }
}

async function main() {
  console.log('🏥 MediConnect Pro - Demo Data Seeder\n');
  console.log(`API URL: ${API_URL}\n`);

  try {
    // Create users
    const users = await createDemoUsers();

    if (users.length === 0) {
      console.log('\n⚠️  No users were created. They may already exist.');
      console.log('To reset, drop the database and run this script again.\n');
      return;
    }

    // Separate doctors and patients
    const doctors = users.filter(u => u.role === 'DOCTOR');
    const patients = users.filter(u => u.role === 'PATIENT');

    if (doctors.length > 0 && patients.length > 0) {
      // Create patient records
      await createDemoPatients(
        doctors[0].token,
        patients.map(p => p.token)
      );

      // Create vital signs
      await createDemoVitals(patients.map(p => p.token));
    }

    console.log('\n✅ Demo data seeding completed!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 Demo Credentials:\n');

    console.log('🔐 Admin:');
    console.log('   Email: admin@mediconnect.demo');
    console.log('   Password: Demo2024!Admin\n');

    console.log('👨‍⚕️ Doctors:');
    console.log('   Email: dr.smith@mediconnect.demo');
    console.log('   Password: Demo2024!Doctor');
    console.log('   ---');
    console.log('   Email: dr.johnson@mediconnect.demo');
    console.log('   Password: Demo2024!Doctor\n');

    console.log('👤 Patients:');
    console.log('   Email: john.doe@mediconnect.demo');
    console.log('   Password: Demo2024!Patient');
    console.log('   ---');
    console.log('   Email: jane.wilson@mediconnect.demo');
    console.log('   Password: Demo2024!Patient');
    console.log('   ---');
    console.log('   Email: robert.brown@mediconnect.demo');
    console.log('   Password: Demo2024!Patient');

    console.log('═══════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createDemoUsers, createDemoPatients, createDemoVitals };

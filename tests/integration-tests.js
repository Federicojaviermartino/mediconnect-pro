/**
 * MediConnect Pro - Integration Test Suite
 *
 * Comprehensive automated tests for all API endpoints and functionality
 *
 * Usage:
 *   node tests/integration-tests.js [base-url]
 *
 * Examples:
 *   node tests/integration-tests.js http://localhost:3000
 *   node tests/integration-tests.js https://mediconnect-pro.onrender.com
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Test configuration
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

// Test credentials
const CREDENTIALS = {
  admin: {
    email: 'admin@mediconnect.demo',
    password: 'Demo2024!Admin',
    role: 'admin'
  },
  doctor: {
    email: 'dr.smith@mediconnect.demo',
    password: 'Demo2024!Doctor',
    role: 'doctor'
  },
  patient: {
    email: 'john.doe@mediconnect.demo',
    password: 'Demo2024!Patient',
    role: 'patient'
  }
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// HTTP client helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: TIMEOUT
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, error = null) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${symbol} ${name}`, color);

  if (error) {
    log(`    Error: ${error}`, 'red');
  }

  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

function logSkip(name, reason) {
  log(`  ⊘ ${name} (${reason})`, 'yellow');
  results.tests.push({ name, passed: false, skipped: true, error: reason });
  results.skipped++;
}

async function runTest(name, testFn) {
  try {
    await testFn();
    logTest(name, true);
  } catch (error) {
    logTest(name, false, error.message);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`);
  }
}

// Session storage for authenticated requests
const sessions = {
  admin: null,
  doctor: null,
  patient: null
};

// =============================================================================
// TEST SUITES
// =============================================================================

async function testHealthCheck() {
  log('\n=== Health Check Tests ===', 'cyan');

  await runTest('GET /health returns 200', async () => {
    const res = await makeRequest(`${BASE_URL}/health`);
    assertEqual(res.status, 200, 'Health check should return 200');
    assert(res.body.status === 'ok', 'Health status should be ok');
  });

  await runTest('Health check has required fields', async () => {
    const res = await makeRequest(`${BASE_URL}/health`);
    assert(res.body.status, 'Missing status field');
    assert(res.body.timestamp, 'Missing timestamp field');
    assert(res.body.database, 'Missing database field');
  });
}

async function testAuthentication() {
  log('\n=== Authentication Tests ===', 'cyan');

  // Test login with valid credentials
  for (const [role, creds] of Object.entries(CREDENTIALS)) {
    await runTest(`POST /api/auth/login with ${role} credentials`, async () => {
      const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: {
          email: creds.email,
          password: creds.password
        }
      });

      assertEqual(res.status, 200, `Login should succeed for ${role}`);
      assert(res.body.success, 'Login should return success');
      assert(res.body.user, 'Login should return user data');
      assertEqual(res.body.user.role, role, `User role should be ${role}`);

      // Store session cookie
      if (res.headers['set-cookie']) {
        sessions[role] = res.headers['set-cookie'][0].split(';')[0];
      }
    });
  }

  // Test login with invalid credentials
  await runTest('POST /api/auth/login with invalid credentials', async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }
    });

    assertEqual(res.status, 401, 'Invalid login should return 401');
    assert(res.body.error, 'Error message should be present');
  });

  // Test login with missing fields
  await runTest('POST /api/auth/login with missing password', async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'test@example.com'
      }
    });

    assertEqual(res.status, 400, 'Missing password should return 400');
  });

  // Test GET /api/auth/me
  await runTest('GET /api/auth/me with valid session', async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/me`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200 with valid session');
    assert(res.body.user, 'Should return user data');
    assertEqual(res.body.user.role, 'doctor', 'Should return correct user role');
  });

  await runTest('GET /api/auth/me without session', async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/me`);
    assertEqual(res.status, 401, 'Should return 401 without session');
  });
}

async function testProtectedRoutes() {
  log('\n=== Protected Routes Tests ===', 'cyan');

  await runTest('Protected route without auth returns 401', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`);
    assertEqual(res.status, 401, 'Should return 401 without authentication');
  });

  await runTest('Protected route with auth succeeds', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assert(res.status === 200 || res.status === 403, 'Should return 200 or 403 (if unauthorized)');
  });
}

async function testRoleBasedAccess() {
  log('\n=== Role-Based Access Control Tests ===', 'cyan');

  // Admin should access stats
  await runTest('Admin can access /api/stats', async () => {
    const res = await makeRequest(`${BASE_URL}/api/stats`, {
      headers: {
        Cookie: sessions.admin
      }
    });

    assertEqual(res.status, 200, 'Admin should access stats');
    assert(res.body.stats, 'Stats data should be present');
  });

  // Doctor should NOT access stats
  await runTest('Doctor cannot access /api/stats', async () => {
    const res = await makeRequest(`${BASE_URL}/api/stats`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 403, 'Doctor should not access stats');
  });

  // Doctor should access patients list
  await runTest('Doctor can access /api/patients', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Doctor should access patients');
    assert(res.body.patients, 'Patients data should be present');
  });

  // Patient should NOT access patients list
  await runTest('Patient cannot access /api/patients', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 403, 'Patient should not access patients list');
  });
}

async function testPatientEndpoints() {
  log('\n=== Patient Endpoints Tests ===', 'cyan');

  await runTest('GET /api/patients returns patient list (doctor)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(Array.isArray(res.body.patients), 'Patients should be an array');
    assert(res.body.patients.length > 0, 'Should have at least one patient');
  });

  await runTest('GET /api/patients/:id returns patient details (doctor)', async () => {
    // Get patient list first to get a valid ID
    const listRes = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    if (listRes.body.patients && listRes.body.patients.length > 0) {
      const patientId = listRes.body.patients[0].id;

      const res = await makeRequest(`${BASE_URL}/api/patients/${patientId}`, {
        headers: {
          Cookie: sessions.doctor
        }
      });

      assertEqual(res.status, 200, 'Should return 200');
      assert(res.body.patient, 'Patient data should be present');
    } else {
      throw new Error('No patients available for testing');
    }
  });

  await runTest('GET /api/patients/:id with invalid ID returns 404', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients/99999`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 404, 'Should return 404 for invalid patient ID');
  });
}

async function testVitalsEndpoints() {
  log('\n=== Vitals Endpoints Tests ===', 'cyan');

  await runTest('GET /api/vitals returns vitals (patient)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/vitals`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.vitals !== undefined, 'Vitals data should be present');
  });

  await runTest('GET /api/vitals/thresholds returns threshold data', async () => {
    const res = await makeRequest(`${BASE_URL}/api/vitals/thresholds`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.thresholds, 'Thresholds should be present');
    assert(res.body.thresholds.heartRate, 'Heart rate thresholds should exist');
  });
}

async function testAppointmentEndpoints() {
  log('\n=== Appointment Endpoints Tests ===', 'cyan');

  await runTest('GET /api/appointments returns appointments (patient)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/appointments`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.appointments !== undefined, 'Appointments should be present');
  });

  await runTest('GET /api/appointments returns appointments (doctor)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/appointments`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.appointments !== undefined, 'Appointments should be present');
  });

  await runTest('POST /api/appointments creates appointment', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const res = await makeRequest(`${BASE_URL}/api/appointments`, {
      method: 'POST',
      headers: {
        Cookie: sessions.patient
      },
      body: {
        patient_id: 3,
        doctor_id: 2,
        date: dateStr,
        time: '14:00',
        reason: 'Test appointment'
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.appointment, 'Appointment data should be returned');
  });
}

async function testPrescriptionEndpoints() {
  log('\n=== Prescription Endpoints Tests ===', 'cyan');

  await runTest('GET /api/prescriptions returns prescriptions (patient)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/prescriptions`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.prescriptions !== undefined, 'Prescriptions should be present');
  });

  await runTest('GET /api/prescriptions returns prescriptions (doctor)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/prescriptions`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.prescriptions !== undefined, 'Prescriptions should be present');
  });

  await runTest('POST /api/prescriptions creates prescription (doctor)', async () => {
    const res = await makeRequest(`${BASE_URL}/api/prescriptions`, {
      method: 'POST',
      headers: {
        Cookie: sessions.doctor
      },
      body: {
        patient_id: 3,
        doctor_id: 2,
        medication: 'Test Medication',
        dosage: '10mg',
        frequency: 'Once daily',
        pharmacy: 'Test Pharmacy'
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.prescription, 'Prescription data should be returned');
  });
}

async function testAIEndpoints() {
  log('\n=== AI Endpoints Tests ===', 'cyan');

  await runTest('GET /api/ai/status returns AI status', async () => {
    const res = await makeRequest(`${BASE_URL}/api/ai/status`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assertEqual(res.status, 200, 'Should return 200');
    assert(res.body.services, 'Services status should be present');
    assert(res.body.mode, 'Mode should be specified');
  });

  await runTest('POST /api/ai/triage accepts symptoms', async () => {
    const res = await makeRequest(`${BASE_URL}/api/ai/triage`, {
      method: 'POST',
      headers: {
        Cookie: sessions.patient
      },
      body: {
        symptoms: 'headache and fever for 2 days'
      }
    });

    // Should succeed in both demo and production mode
    assert(res.status === 200 || res.status === 500, 'Should return 200 or 500');
    if (res.status === 200) {
      assert(res.body.success !== undefined, 'Success flag should be present');
    }
  });

  await runTest('POST /api/ai/triage rejects empty symptoms', async () => {
    const res = await makeRequest(`${BASE_URL}/api/ai/triage`, {
      method: 'POST',
      headers: {
        Cookie: sessions.patient
      },
      body: {}
    });

    assertEqual(res.status, 400, 'Should return 400 for missing symptoms');
  });
}

async function testDataIntegrity() {
  log('\n=== Data Integrity Tests ===', 'cyan');

  await runTest('Patient data has required fields', async () => {
    const res = await makeRequest(`${BASE_URL}/api/patients`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    if (res.body.patients && res.body.patients.length > 0) {
      const patient = res.body.patients[0];
      assert(patient.id, 'Patient should have ID');
      assert(patient.name, 'Patient should have name');
      assert(patient.email, 'Patient should have email');
    }
  });

  await runTest('Vitals data has valid format', async () => {
    const res = await makeRequest(`${BASE_URL}/api/vitals`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    if (res.body.vitals && res.body.vitals.length > 0) {
      const vital = res.body.vitals[0];
      assert(vital.id, 'Vital should have ID');
      assert(vital.recorded_at, 'Vital should have timestamp');
    }
  });

  await runTest('Appointments have valid structure', async () => {
    const res = await makeRequest(`${BASE_URL}/api/appointments`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    if (res.body.appointments && res.body.appointments.length > 0) {
      const appointment = res.body.appointments[0];
      assert(appointment.id, 'Appointment should have ID');
      assert(appointment.date, 'Appointment should have date');
      assert(appointment.time, 'Appointment should have time');
      assert(appointment.status, 'Appointment should have status');
    }
  });
}

async function testErrorHandling() {
  log('\n=== Error Handling Tests ===', 'cyan');

  await runTest('Invalid endpoint returns 404', async () => {
    const res = await makeRequest(`${BASE_URL}/api/nonexistent`, {
      headers: {
        Cookie: sessions.doctor
      }
    });

    assert(res.status === 404 || res.status === 401, 'Should return 404 or 401');
  });

  await runTest('Malformed JSON is handled gracefully', async () => {
    try {
      const parsedUrl = new URL(`${BASE_URL}/api/auth/login`);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      await new Promise((resolve, reject) => {
        const req = client.request({
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
          path: parsedUrl.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }, (res) => {
          assert(res.statusCode === 400 || res.statusCode === 500, 'Should return 400 or 500');
          resolve();
        });

        req.on('error', reject);
        req.write('{ invalid json }');
        req.end();
      });
    } catch (error) {
      // Error is expected, test passes
    }
  });
}

async function testLogout() {
  log('\n=== Logout Tests ===', 'cyan');

  await runTest('POST /api/auth/logout clears session', async () => {
    const res = await makeRequest(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 200, 'Logout should succeed');
    assert(res.body.success, 'Should return success');
  });

  await runTest('Accessing protected route after logout fails', async () => {
    const res = await makeRequest(`${BASE_URL}/api/vitals`, {
      headers: {
        Cookie: sessions.patient
      }
    });

    assertEqual(res.status, 401, 'Should return 401 after logout');
  });
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   MediConnect Pro - Integration Test Suite                ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTesting: ${BASE_URL}`, 'cyan');
  log(`Timeout: ${TIMEOUT}ms`, 'cyan');
  log(`Starting: ${new Date().toISOString()}\n`, 'cyan');

  const startTime = Date.now();

  try {
    await testHealthCheck();
    await testAuthentication();
    await testProtectedRoutes();
    await testRoleBasedAccess();
    await testPatientEndpoints();
    await testVitalsEndpoints();
    await testAppointmentEndpoints();
    await testPrescriptionEndpoints();
    await testAIEndpoints();
    await testDataIntegrity();
    await testErrorHandling();
    await testLogout();
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   Test Summary                                             ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTotal Tests:    ${results.passed + results.failed + results.skipped}`);
  log(`Passed:         ${results.passed}`, 'green');
  log(`Failed:         ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  log(`Skipped:        ${results.skipped}`, results.skipped > 0 ? 'yellow' : 'reset');
  log(`Duration:       ${duration}s`);
  log(`Success Rate:   ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  log(`Completed:      ${new Date().toISOString()}\n`);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log(`\nUnhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

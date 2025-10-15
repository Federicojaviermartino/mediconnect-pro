/**
 * MediConnect Pro - Production Verification Script
 *
 * Verifies production deployment health and functionality
 *
 * Usage:
 *   node scripts/verify-production.js [url]
 *
 * Examples:
 *   node scripts/verify-production.js https://mediconnect-pro.onrender.com
 *   node scripts/verify-production.js http://localhost:3000
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const PRODUCTION_URL = process.argv[2] || 'https://mediconnect-pro.onrender.com';
const TIMEOUT = 15000; // 15 seconds for production checks

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
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
        'User-Agent': 'MediConnect-Verification/1.0',
        ...options.headers
      },
      timeout: options.timeout || TIMEOUT
    };

    const startTime = Date.now();

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            responseTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            responseTime
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

// Logging helpers
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, message = '', responseTime = null) {
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
      break;
    case 'warn':
      symbol = '⚠';
      color = 'yellow';
      results.warnings++;
      break;
  }

  let output = `  ${symbol} ${name}`;
  if (responseTime !== null) {
    output += ` (${responseTime}ms)`;
  }

  log(output, color);

  if (message) {
    log(`    ${message}`, color);
  }

  results.tests.push({ name, status, message, responseTime });
}

// Verification Tests
async function verifyHealthEndpoint() {
  log('\n=== Health Check Verification ===', 'cyan');

  try {
    const res = await makeRequest(`${PRODUCTION_URL}/health`);

    if (res.status === 200) {
      logTest('Health endpoint returns 200', 'pass', '', res.responseTime);

      if (res.body && res.body.status === 'ok') {
        logTest('Health status is "ok"', 'pass');
      } else {
        logTest('Health status check', 'warn', 'Status field missing or not "ok"');
      }

      if (res.body && res.body.database) {
        logTest('Database connection verified', 'pass');
      } else {
        logTest('Database connection', 'warn', 'Database status not reported');
      }

      if (res.responseTime < 1000) {
        logTest('Response time acceptable', 'pass', `${res.responseTime}ms < 1000ms`);
      } else {
        logTest('Response time', 'warn', `${res.responseTime}ms >= 1000ms (slow)`);
      }
    } else {
      logTest('Health endpoint', 'fail', `Expected 200, got ${res.status}`, res.responseTime);
    }
  } catch (error) {
    logTest('Health endpoint', 'fail', error.message);
  }
}

async function verifyAPIEndpoint() {
  log('\n=== API Endpoint Verification ===', 'cyan');

  try {
    const res = await makeRequest(`${PRODUCTION_URL}/api`);

    if (res.status === 200) {
      logTest('API info endpoint returns 200', 'pass', '', res.responseTime);

      if (res.body && res.body.endpoints) {
        logTest('API endpoints list present', 'pass');
      } else {
        logTest('API endpoints list', 'warn', 'Endpoints not documented');
      }
    } else {
      logTest('API endpoint', 'fail', `Expected 200, got ${res.status}`, res.responseTime);
    }
  } catch (error) {
    logTest('API endpoint', 'fail', error.message);
  }
}

async function verifyLoginEndpoint() {
  log('\n=== Login Endpoint Verification ===', 'cyan');

  try {
    // Test with invalid credentials (should fail gracefully)
    const res = await makeRequest(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'wrongpassword'
      }
    });

    if (res.status === 401) {
      logTest('Login rejects invalid credentials', 'pass', 'Returns 401 as expected', res.responseTime);
    } else {
      logTest('Login authentication', 'warn', `Expected 401, got ${res.status}`, res.responseTime);
    }

    if (res.body && res.body.error) {
      logTest('Login error message present', 'pass');
    } else {
      logTest('Login error handling', 'warn', 'Error message not provided');
    }
  } catch (error) {
    logTest('Login endpoint', 'fail', error.message);
  }
}

async function verifyProtectedEndpoints() {
  log('\n=== Protected Endpoints Verification ===', 'cyan');

  const protectedEndpoints = [
    '/api/auth/me',
    '/api/patients',
    '/api/vitals',
    '/api/appointments',
    '/api/prescriptions'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const res = await makeRequest(`${PRODUCTION_URL}${endpoint}`);

      if (res.status === 401) {
        logTest(`${endpoint} requires auth`, 'pass', 'Returns 401 without session', res.responseTime);
      } else {
        logTest(`${endpoint} auth check`, 'warn', `Expected 401, got ${res.status}`, res.responseTime);
      }
    } catch (error) {
      logTest(`${endpoint}`, 'fail', error.message);
    }
  }
}

async function verifyStaticFiles() {
  log('\n=== Static Files Verification ===', 'cyan');

  const staticFiles = [
    '/login.html',
    '/dashboard-patient.html',
    '/dashboard-doctor.html',
    '/dashboard-admin.html'
  ];

  for (const file of staticFiles) {
    try {
      const res = await makeRequest(`${PRODUCTION_URL}${file}`);

      if (res.status === 200) {
        logTest(`${file} accessible`, 'pass', '', res.responseTime);
      } else {
        logTest(`${file}`, 'fail', `Expected 200, got ${res.status}`, res.responseTime);
      }
    } catch (error) {
      logTest(`${file}`, 'fail', error.message);
    }
  }
}

async function verifySecurityHeaders() {
  log('\n=== Security Headers Verification ===', 'cyan');

  try {
    const res = await makeRequest(`${PRODUCTION_URL}/health`);

    // Check for security headers
    const headers = res.headers;

    if (headers['x-powered-by']) {
      logTest('X-Powered-By header', 'warn', 'Header should be removed for security');
    } else {
      logTest('X-Powered-By header removed', 'pass');
    }

    if (headers['strict-transport-security']) {
      logTest('HSTS header present', 'pass');
    } else {
      logTest('HSTS header', 'warn', 'Consider adding Strict-Transport-Security header');
    }

    if (headers['x-content-type-options']) {
      logTest('X-Content-Type-Options present', 'pass');
    } else {
      logTest('X-Content-Type-Options', 'warn', 'Consider adding nosniff header');
    }

    if (headers['x-frame-options']) {
      logTest('X-Frame-Options present', 'pass');
    } else {
      logTest('X-Frame-Options', 'warn', 'Consider adding frame protection');
    }
  } catch (error) {
    logTest('Security headers check', 'fail', error.message);
  }
}

async function verifySSL() {
  log('\n=== SSL/TLS Verification ===', 'cyan');

  const parsedUrl = new URL(PRODUCTION_URL);

  if (parsedUrl.protocol === 'https:') {
    try {
      // SSL is being used
      logTest('HTTPS enabled', 'pass');

      // Test certificate validity by making a request
      await makeRequest(PRODUCTION_URL);
      logTest('SSL certificate valid', 'pass');
    } catch (error) {
      if (error.message.includes('certificate')) {
        logTest('SSL certificate', 'fail', 'Certificate error: ' + error.message);
      } else {
        logTest('SSL verification', 'warn', 'Could not fully verify SSL');
      }
    }
  } else {
    logTest('HTTPS', 'warn', 'Production should use HTTPS');
  }
}

async function verifyPerformance() {
  log('\n=== Performance Verification ===', 'cyan');

  try {
    const res = await makeRequest(`${PRODUCTION_URL}/health`);

    if (res.responseTime < 500) {
      logTest('Response time < 500ms', 'pass', `${res.responseTime}ms`);
    } else if (res.responseTime < 1000) {
      logTest('Response time < 1s', 'warn', `${res.responseTime}ms (acceptable but could be faster)`);
    } else {
      logTest('Response time', 'warn', `${res.responseTime}ms (slow)`);
    }

    // Test multiple requests to check consistency
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(makeRequest(`${PRODUCTION_URL}/health`));
    }

    const responses = await Promise.all(requests);
    const avgTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
    const maxTime = Math.max(...responses.map(r => r.responseTime));
    const minTime = Math.min(...responses.map(r => r.responseTime));

    logTest('Average response time', avgTime < 1000 ? 'pass' : 'warn', `${avgTime.toFixed(0)}ms (min: ${minTime}ms, max: ${maxTime}ms)`);

    const variance = maxTime - minTime;
    if (variance < 500) {
      logTest('Response time consistency', 'pass', `Variance: ${variance}ms`);
    } else {
      logTest('Response time consistency', 'warn', `High variance: ${variance}ms`);
    }
  } catch (error) {
    logTest('Performance check', 'fail', error.message);
  }
}

async function verifyDatabaseConnection() {
  log('\n=== Database Verification ===', 'cyan');

  try {
    // Login with test credentials to verify database access
    const loginRes = await makeRequest(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@mediconnect.demo',
        password: 'Demo2024!Admin'
      }
    });

    if (loginRes.status === 200 && loginRes.body.success) {
      logTest('Database read access verified', 'pass', 'Login successful', loginRes.responseTime);

      if (loginRes.body.user) {
        logTest('User data retrieval', 'pass', 'User object returned');
      }

      // Get session cookie
      const sessionCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : null;

      if (sessionCookie) {
        // Test data retrieval
        const patientsRes = await makeRequest(`${PRODUCTION_URL}/api/patients`, {
          headers: {
            Cookie: sessionCookie
          }
        });

        if (patientsRes.status === 200) {
          logTest('Database query successful', 'pass', 'Patients list retrieved', patientsRes.responseTime);
        } else {
          logTest('Database query', 'warn', `Expected 200, got ${patientsRes.status}`);
        }
      }
    } else {
      logTest('Database connection', 'warn', 'Could not verify database access');
    }
  } catch (error) {
    logTest('Database verification', 'fail', error.message);
  }
}

async function verifyAIServices() {
  log('\n=== AI Services Verification ===', 'cyan');

  try {
    // Login to get session
    const loginRes = await makeRequest(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: 'admin@mediconnect.demo',
        password: 'Demo2024!Admin'
      }
    });

    if (loginRes.status === 200) {
      const sessionCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : null;

      if (sessionCookie) {
        const aiStatusRes = await makeRequest(`${PRODUCTION_URL}/api/ai/status`, {
          headers: {
            Cookie: sessionCookie
          }
        });

        if (aiStatusRes.status === 200) {
          logTest('AI status endpoint accessible', 'pass', '', aiStatusRes.responseTime);

          if (aiStatusRes.body.mode === 'production') {
            logTest('AI services configured', 'pass', 'Running in production mode');
          } else {
            logTest('AI services', 'warn', 'Running in demo mode (API keys not configured)');
          }

          if (aiStatusRes.body.services) {
            const servicesCount = Object.values(aiStatusRes.body.services).filter(Boolean).length;
            logTest('AI services available', servicesCount > 0 ? 'pass' : 'warn', `${servicesCount} services enabled`);
          }
        }
      }
    }
  } catch (error) {
    logTest('AI services check', 'fail', error.message);
  }
}

// Main verification runner
async function runVerification() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   MediConnect Pro - Production Verification               ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝', 'blue');
  log(`\nTarget URL: ${PRODUCTION_URL}`, 'cyan');
  log(`Timeout: ${TIMEOUT}ms`, 'cyan');
  log(`Started: ${new Date().toISOString()}\n`, 'cyan');

  const startTime = Date.now();

  try {
    await verifyHealthEndpoint();
    await verifyAPIEndpoint();
    await verifyLoginEndpoint();
    await verifyProtectedEndpoints();
    await verifyStaticFiles();
    await verifySecurityHeaders();
    await verifySSL();
    await verifyPerformance();
    await verifyDatabaseConnection();
    await verifyAIServices();
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║   Verification Summary                                     ║', 'blue');
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
      log('✓ Production deployment is HEALTHY', 'green');
    } else {
      log('⚠ Production deployment is OPERATIONAL with warnings', 'yellow');
    }
  } else {
    log('✗ Production deployment has ISSUES that need attention', 'red');
  }

  // Recommendations
  if (results.warnings > 0 || results.failed > 0) {
    log('\n--- Recommendations ---', 'magenta');
    const failedTests = results.tests.filter(t => t.status === 'fail');
    const warnTests = results.tests.filter(t => t.status === 'warn');

    if (failedTests.length > 0) {
      log('\nFailed Checks:', 'red');
      failedTests.forEach(t => {
        log(`  - ${t.name}: ${t.message}`, 'red');
      });
    }

    if (warnTests.length > 0) {
      log('\nWarnings:', 'yellow');
      warnTests.forEach(t => {
        log(`  - ${t.name}: ${t.message}`, 'yellow');
      });
    }
  }

  log('\n');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run verification
runVerification().catch((error) => {
  log(`\nUnhandled error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

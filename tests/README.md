# MediConnect Pro - Testing Suite

This directory contains the automated testing infrastructure for MediConnect Pro.

## Overview

The testing suite consists of three main components:

1. **Automated Integration Tests** - Comprehensive API and functionality tests
2. **Production Verification** - Health checks and deployment validation
3. **Database Validation** - Data integrity and structure verification

## Quick Start

### Run All Tests

```bash
# Validate database
node scripts/validate-database.js

# Verify production deployment
node scripts/verify-production.js https://mediconnect-pro.onrender.com

# Run integration tests (when server is running)
node tests/integration-tests.js http://localhost:3000
```

### Run Individual Test Suites

See below for detailed instructions on each test suite.

---

## 1. Integration Tests

**File**: `tests/integration-tests.js`

Comprehensive automated tests covering all API endpoints, authentication, authorization, and data operations.

### Usage

```bash
# Test local development server
node tests/integration-tests.js http://localhost:3000

# Test production
node tests/integration-tests.js https://mediconnect-pro.onrender.com

# Default (localhost:3000)
node tests/integration-tests.js
```

### What It Tests

- **Health Check** (2 tests)
  - Health endpoint availability
  - Required response fields

- **Authentication** (6 tests)
  - Login with valid credentials (all roles)
  - Login with invalid credentials
  - Session management
  - Protected route access

- **Role-Based Access Control** (4 tests)
  - Admin-only endpoints
  - Doctor-only endpoints
  - Patient restrictions
  - Permission enforcement

- **Patient Endpoints** (3 tests)
  - List patients
  - Get patient details
  - Invalid patient ID handling

- **Vitals Endpoints** (2 tests)
  - Get patient vitals
  - Get vital thresholds

- **Appointment Endpoints** (3 tests)
  - List appointments
  - Create appointment
  - Role-based filtering

- **Prescription Endpoints** (3 tests)
  - List prescriptions
  - Create prescription
  - Role-based filtering

- **AI Endpoints** (3 tests)
  - AI service status
  - Triage functionality
  - Input validation

- **Data Integrity** (3 tests)
  - Required fields present
  - Valid data formats
  - Relationship integrity

- **Error Handling** (2 tests)
  - Invalid endpoints
  - Malformed requests

- **Logout** (2 tests)
  - Session destruction
  - Post-logout access denial

### Example Output

```
TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   MediConnect Pro - Integration Test Suite                Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Testing: http://localhost:3000
Timeout: 120000ms

=== Health Check Tests ===
   GET /health returns 200
   Health check has required fields

=== Authentication Tests ===
   POST /api/auth/login with admin credentials
   POST /api/auth/login with doctor credentials
   POST /api/auth/login with patient credentials
  ...

TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   Test Summary                                             Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Total Tests:    35
Passed:         35
Failed:         0
Skipped:        0
Duration:       5.42s
Success Rate:   100.0%
```

### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

---

## 2. Production Verification

**File**: `scripts/verify-production.js`

Validates production deployment health, security, performance, and functionality.

### Usage

```bash
# Verify production
node scripts/verify-production.js https://mediconnect-pro.onrender.com

# Verify local
node scripts/verify-production.js http://localhost:3000

# Default (production)
node scripts/verify-production.js
```

### What It Verifies

- **Health Check** (4 checks)
  - Endpoint availability
  - Response time
  - Database status
  - Health status

- **API Endpoints** (2 checks)
  - API info endpoint
  - Documentation presence

- **Authentication** (2 checks)
  - Login rejection
  - Error messages

- **Protected Endpoints** (5 checks)
  - Authorization enforcement
  - 401 responses
  - Session requirements

- **Static Files** (4 checks)
  - Dashboard pages
  - Login page
  - Load times

- **Security Headers** (4 checks)
  - HSTS presence
  - X-Content-Type-Options
  - X-Frame-Options
  - X-Powered-By removal

- **SSL/TLS** (2 checks)
  - HTTPS enabled
  - Certificate validity

- **Performance** (3 checks)
  - Response times
  - Consistency
  - Average performance

- **Database** (3 checks)
  - Connection health
  - Read operations
  - Query performance

- **AI Services** (3 checks)
  - Status endpoint
  - Configuration
  - Service availability

### Example Output

```
TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   MediConnect Pro - Production Verification               Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Target URL: https://mediconnect-pro.onrender.com
Timeout: 15000ms

=== Health Check Verification ===
   Health endpoint returns 200 (234ms)
   Health status is "ok"
   Database connection verified
   Response time acceptable (234ms < 1000ms)

...

TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   Verification Summary                                     Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Total Checks:   29
Passed:         26
Failed:         0
Warnings:       3
Duration:       8.45s

 Production deployment is HEALTHY
```

### Exit Codes

- `0` - All checks passed (warnings allowed)
- `1` - One or more checks failed

---

## 3. Database Validation

**File**: `scripts/validate-database.js`

Validates database structure, data integrity, and relationships.

### Usage

```bash
# Validate default database
node scripts/validate-database.js

# Validate specific database file
node scripts/validate-database.js demo-app/database/database.json

# Validate custom path
node scripts/validate-database.js /path/to/database.json
```

### What It Validates

- **Database File** (2 checks)
  - File exists
  - Valid JSON format

- **Database Structure** (7 checks)
  - Required collections present
  - Collections are arrays
  - No unexpected collections

- **Users Collection** (5 checks)
  - Required fields
  - Password hashing
  - Unique IDs and emails
  - Valid roles
  - Role distribution

- **Patients Collection** (3 checks)
  - Required fields
  - User references
  - No orphaned records

- **Vital Signs Collection** (2 checks)
  - Required fields
  - Patient references

- **Appointments Collection** (2 checks)
  - Required fields
  - Valid references

- **Prescriptions Collection** (2 checks)
  - Required fields
  - Valid references

- **Data Integrity** (4 checks)
  - Patient-user relationships
  - User-patient relationships
  - Appointment references
  - Prescription references

### Example Output

```
TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   MediConnect Pro - Database Validation                   Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Database: demo-app/database/database.json

=== Database File Validation ===
   Database file exists
   Database file is valid JSON

=== Database Structure Validation ===
   Collection "users" exists and is an array
   Collection "patients" exists and is an array
  ...

=== Database Statistics ===
  Users:           3
  Patients:        1
  Vital Signs:     3
  Appointments:    1
  Prescriptions:   1

TPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPW
Q   Validation Summary                                       Q
ZPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP]

Total Checks:   27
Passed:         27
Failed:         0
Warnings:       0

 Database is VALID and HEALTHY
```

### Exit Codes

- `0` - Database is valid
- `1` - Database has integrity issues

---

## Manual Testing

**File**: `TESTING_GUIDE.md` (in project root)

Comprehensive manual testing checklist covering:

- Frontend testing
- User workflows
- Cross-browser testing
- Performance testing
- Security testing
- Accessibility testing

### Usage

1. Open `TESTING_GUIDE.md`
2. Follow the step-by-step checklists
3. Document results in the template sections
4. Report issues using the provided template

---

## Test Reports

**File**: `TEST_REPORT.md` (in project root)

Generated comprehensive test report including:

- Executive summary
- Database validation results
- Production verification results
- Security assessment
- Performance metrics
- Issues found
- Recommendations

### Generating a New Report

1. Run all test suites
2. Capture output
3. Update `TEST_REPORT.md` with new results
4. Include date and tester information

---

## Continuous Integration

### GitHub Actions (Future)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Database Validation
        run: node scripts/validate-database.js
      - name: Integration Tests
        run: |
          npm start &
          sleep 5
          node tests/integration-tests.js
```

### Pre-deployment Checks

```bash
#!/bin/bash
# pre-deploy.sh

echo "Running pre-deployment checks..."

# Validate database
node scripts/validate-database.js || exit 1

# Start server for testing
npm start &
SERVER_PID=$!
sleep 5

# Run integration tests
node tests/integration-tests.js http://localhost:3000
TEST_RESULT=$?

# Stop server
kill $SERVER_PID

# Exit with test result
exit $TEST_RESULT
```

---

## Troubleshooting

### Integration Tests Fail to Connect

**Problem**: Tests timeout or cannot reach server

**Solutions**:
- Ensure server is running: `npm start`
- Check correct URL is provided
- Verify firewall settings
- Check network connectivity

### Database Validation Fails

**Problem**: Database file not found or invalid

**Solutions**:
- Check database file path
- Verify file exists: `demo-app/database/database.json`
- Ensure database was initialized: run server once
- Check file permissions

### Production Verification Slow

**Problem**: Verification takes very long or times out

**Solutions**:
- Production server may be on cold start (Render free tier)
- Increase timeout: edit `TIMEOUT` in script
- Check production server status
- Verify network connection

### Tests Pass Locally but Fail in Production

**Problem**: Tests work locally but not on deployment

**Solutions**:
- Check environment variables
- Verify database state
- Check API keys configuration
- Review production logs
- Ensure same Node.js version

---

## Best Practices

### Before Committing

1. Run database validation
2. Run integration tests locally
3. Fix all failing tests
4. Review test output

### Before Deploying

1. Run full test suite
2. Run production verification on staging
3. Review test report
4. Address critical issues

### After Deploying

1. Run production verification immediately
2. Monitor for failures
3. Check application logs
4. Verify user workflows manually

### Regular Testing

- Run tests daily
- Include in CI/CD pipeline
- Review test reports weekly
- Update tests for new features

---

## Contributing

### Adding New Tests

1. Open `tests/integration-tests.js`
2. Add new test function
3. Call function in `runAllTests()`
4. Document in this README

### Updating Validation

1. Open relevant script
2. Add new validation checks
3. Update documentation
4. Test validation logic

### Reporting Issues

Use the template in `TESTING_GUIDE.md`:

```markdown
### Issue Title: [Description]
**Severity**: Critical / High / Medium / Low
**Environment**: [Production / Local]
**Steps to Reproduce**: [...]
**Expected Behavior**: [...]
**Actual Behavior**: [...]
```

---

## Resources

- **Integration Tests**: `tests/integration-tests.js`
- **Production Verification**: `scripts/verify-production.js`
- **Database Validation**: `scripts/validate-database.js`
- **Manual Testing Guide**: `TESTING_GUIDE.md`
- **Test Report**: `TEST_REPORT.md`
- **Project Documentation**: `CLAUDE.md`

---

## Support

For questions or issues:

1. Check `TESTING_GUIDE.md` for manual testing procedures
2. Review `TEST_REPORT.md` for known issues
3. Check `CLAUDE.md` for project architecture
4. Review test output for specific errors

---

## License

MIT License - See project LICENSE file

---

**Last Updated**: October 15, 2025
**Version**: 1.0.0
**Maintainer**: MediConnect Pro Development Team

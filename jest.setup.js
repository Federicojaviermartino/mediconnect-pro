const fs = require('fs');
const path = require('path');

// Path to the test database
const DB_PATH = path.join(__dirname, 'demo-app', 'database', 'database.json');

// Delete database.json before each test suite to ensure isolation
beforeAll(() => {
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('🗑️  Cleaned database.json for test isolation');
    }
  } catch (error) {
    console.warn('Warning: Could not delete database.json:', error.message);
  }
});

// Also clean up after all tests in this suite complete
afterAll(() => {
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

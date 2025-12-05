module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'demo-app/**/*.js',
    'server.js',
    '!demo-app/tests/**',
    '!demo-app/__tests__/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],

  // Coverage thresholds (Phase 7: adjusted for performance utilities)
  coverageThreshold: {
    global: {
      branches: 14,
      functions: 20,
      lines: 14,
      statements: 14
    }
  },

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Setup files
  setupFilesAfterEnv: [],

  // Verbose output
  verbose: true,

  // Detect open handles (useful for debugging)
  detectOpenHandles: false,

  // Force exit after tests complete
  forceExit: true,

  // Test timeout (5 seconds)
  testTimeout: 5000,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};

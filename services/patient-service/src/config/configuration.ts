/**
 * Configuration Factory
 * Loads and validates environment variables for Patient Service
 */

export default () => ({
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PATIENT_SERVICE_PORT || '3002', 10),

  // Database
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'mediconnect_admin',
    password: process.env.POSTGRES_PASSWORD,
    database: 'mediconnect_patient',
    ssl: process.env.POSTGRES_SSL === 'true',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
  },

  // Auth Service (for JWT verification)
  authService: {
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    jwtSecret: process.env.JWT_SECRET,
    jwtIssuer: process.env.JWT_ISSUER || 'mediconnect-pro',
    jwtAudience: process.env.JWT_AUDIENCE || 'mediconnect-pro-users',
  },

  // Pagination defaults
  pagination: {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100,
  },

  // URLs
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  vitalsServiceUrl: process.env.VITALS_SERVICE_URL || 'http://localhost:3003',
});

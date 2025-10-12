/**
 * Configuration Factory
 * Loads and validates environment variables
 */

export default () => ({
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),

  // Database
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'mediconnect_admin',
    password: process.env.POSTGRES_PASSWORD,
    database: 'mediconnect_auth',
    ssl: process.env.POSTGRES_SSL === 'true',
    maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20', 10),
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'mediconnect-pro',
    audience: process.env.JWT_AUDIENCE || 'mediconnect-pro-users',
  },

  // Bcrypt
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Email
  email: {
    service: process.env.EMAIL_SERVICE || 'smtp',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'MediConnect Pro <noreply@mediconnect.com>',
  },

  // URLs
  frontendUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  apiGatewayUrl: process.env.API_GATEWAY_URL || 'http://localhost:3000',
});

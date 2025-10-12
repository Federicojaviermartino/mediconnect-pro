/**
 * Configuration Module for API Gateway
 * Centralizes all environment variables and configuration settings
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

/**
 * Environment type
 */
type Environment = 'development' | 'production' | 'test';

/**
 * Configuration interface
 */
interface Config {
  env: Environment;
  port: number;
  host: string;
  apiPrefix: string;

  // JWT Configuration
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
  };

  // CORS Configuration
  cors: {
    origin: string | string[];
    credentials: boolean;
  };

  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
  };

  // Microservices URLs
  services: {
    auth: string;
    patient: string;
    vitals: string;
    consultation: string;
    ml: string;
  };

  // Database URLs (for health checks)
  database: {
    postgres: string;
    mongodb: string;
    redis: string;
    timescale: string;
  };

  // Logging
  logging: {
    level: string;
    logDir: string;
  };

  // Security
  security: {
    bcryptRounds: number;
    encryptionKey: string;
  };

  // Feature Flags
  features: {
    videoConsultations: boolean;
    iotMonitoring: boolean;
    mlPredictions: boolean;
    realTimeAlerts: boolean;
  };
}

/**
 * Get environment variable with type casting
 */
function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Parse CORS origins
 */
function parseCorsOrigin(): string | string[] {
  const origin = getEnv('CORS_ORIGIN', 'http://localhost:3000');
  return origin.includes(',') ? origin.split(',').map((o) => o.trim()) : origin;
}

/**
 * Application Configuration
 */
export const config: Config = {
  env: getEnv('NODE_ENV', 'development') as Environment,
  port: getEnvNumber('API_GATEWAY_PORT', 3000),
  host: getEnv('API_GATEWAY_HOST', 'localhost'),
  apiPrefix: '/api/v1',

  jwt: {
    secret: getEnv('JWT_SECRET', 'your_super_secret_jwt_key_change_this_in_production'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '15m'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET', 'your_super_secret_refresh_key_change_this_in_production'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    issuer: getEnv('JWT_ISSUER', 'mediconnect-pro'),
    audience: getEnv('JWT_AUDIENCE', 'mediconnect-pro-users'),
  },

  cors: {
    origin: parseCorsOrigin(),
    credentials: getEnvBoolean('CORS_CREDENTIALS', true),
  },

  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    authMaxRequests: getEnvNumber('RATE_LIMIT_AUTH_MAX_REQUESTS', 5),
  },

  services: {
    auth: getEnv('AUTH_SERVICE_URL', 'http://localhost:3001'),
    patient: getEnv('PATIENT_SERVICE_URL', 'http://localhost:3002'),
    vitals: getEnv('VITALS_SERVICE_URL', 'http://localhost:3003'),
    consultation: getEnv('CONSULTATION_SERVICE_URL', 'http://localhost:3004'),
    ml: getEnv('ML_SERVICE_URL', 'http://localhost:8000'),
  },

  database: {
    postgres: getEnv('POSTGRES_DB_URL', 'postgresql://mediconnect_admin:password@localhost:5432/mediconnect_db'),
    mongodb: getEnv('MONGODB_URI', 'mongodb://localhost:27017/mediconnect_vitals'),
    redis: getEnv('REDIS_URL', 'redis://localhost:6379/0'),
    timescale: getEnv('TIMESCALE_URL', 'postgresql://mediconnect_timescale:password@localhost:5433/mediconnect_timeseries'),
  },

  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    logDir: getEnv('LOG_DIR', 'logs'),
  },

  security: {
    bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
    encryptionKey: getEnv('ENCRYPTION_KEY', ''),
  },

  features: {
    videoConsultations: getEnvBoolean('FEATURE_VIDEO_CONSULTATIONS', true),
    iotMonitoring: getEnvBoolean('FEATURE_IOT_MONITORING', true),
    mlPredictions: getEnvBoolean('FEATURE_ML_PREDICTIONS', true),
    realTimeAlerts: getEnvBoolean('FEATURE_REAL_TIME_ALERTS', true),
  },
};

/**
 * Validate configuration
 * Throws error if required configuration is missing
 */
export function validateConfig(): void {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }

  // Warn about using default secrets in production
  if (config.env === 'production') {
    if (config.jwt.secret.includes('change_this')) {
      console.warn('WARNING: Using default JWT secret in production! Please change it immediately.');
    }
    if (config.jwt.refreshSecret.includes('change_this')) {
      console.warn('WARNING: Using default refresh token secret in production! Please change it immediately.');
    }
  }
}

/**
 * Is development environment
 */
export function isDevelopment(): boolean {
  return config.env === 'development';
}

/**
 * Is production environment
 */
export function isProduction(): boolean {
  return config.env === 'production';
}

/**
 * Is test environment
 */
export function isTest(): boolean {
  return config.env === 'test';
}

export default config;

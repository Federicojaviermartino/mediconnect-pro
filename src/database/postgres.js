/**
 * PostgreSQL Database Connection Module
 * Provides connection pooling and query helpers for MediConnect Pro
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// ============================================================================
// CONNECTION CONFIGURATION
// ============================================================================

/**
 * Create PostgreSQL connection pool
 * Uses environment variables for configuration with sensible defaults
 */
const createPool = () => {
  const config = {
    // Connection settings
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'mediconnect',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',

    // Pool settings (optimized for 1,000-5,000 concurrent users)
    max: parseInt(process.env.POSTGRES_POOL_MAX || '30'), // Maximum pool size (increased for production)
    min: parseInt(process.env.POSTGRES_POOL_MIN || '5'),  // Minimum pool size (keep connections warm)
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'), // 30 seconds
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'), // 10 seconds
    allowExitOnIdle: false, // Don't close pool during idle periods
    application_name: 'mediconnect-pro', // Identify application in PostgreSQL logs

    // SSL settings (required for some cloud providers like Render, Heroku)
    ssl: process.env.POSTGRES_SSL === 'true' ? {
      rejectUnauthorized: false // Required for self-signed certificates
    } : false
  };

  // Support for DATABASE_URL (common in cloud deployments)
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.POSTGRES_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false,
      max: parseInt(process.env.POSTGRES_POOL_MAX || '30'), // Increased for production
      min: parseInt(process.env.POSTGRES_POOL_MIN || '5'),  // Keep connections warm
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'),
      allowExitOnIdle: false,
      application_name: 'mediconnect-pro'
    });
  }

  return new Pool(config);
};

// Create the pool instance
const pool = createPool();

// Monitor pool stats periodically (every 5 minutes) in production
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const stats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    };
    logger.info('PostgreSQL connection pool stats', {
      database: 'postgresql',
      ...stats,
      utilization: `${Math.round(((stats.total - stats.idle) / stats.total) * 100)}%`
    });
  }, 5 * 60 * 1000); // 5 minutes
}

// ============================================================================
// CONNECTION HEALTH
// ============================================================================

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connected, false otherwise
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    logger.error('PostgreSQL connection test failed', {
      database: 'postgresql',
      operation: 'test-connection',
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

/**
 * Get connection pool statistics
 * @returns {Object} Pool statistics
 */
function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Execute a query
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<pg.QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow database query detected', {
        database: 'postgresql',
        operation: 'query',
        duration: `${duration}ms`,
        query: text.substring(0, 100)
      });
    }

    return result;
  } catch (error) {
    logger.error('Database query error', {
      database: 'postgresql',
      operation: 'query',
      error: error.message,
      query: text.substring(0, 100),
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Execute a query and return the first row
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>}
 */
async function queryOne(text, params) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
async function queryAll(text, params) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Execute an INSERT and return the inserted row
 * @param {string} text - SQL INSERT statement
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>}
 */
async function insert(text, params) {
  const result = await query(text + ' RETURNING *', params);
  return result.rows[0];
}

/**
 * Execute an UPDATE and return the updated row(s)
 * @param {string} text - SQL UPDATE statement
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>}
 */
async function update(text, params) {
  const result = await query(text + ' RETURNING *', params);
  return result.rows;
}

/**
 * Execute a DELETE and return the number of deleted rows
 * @param {string} text - SQL DELETE statement
 * @param {Array} params - Query parameters
 * @returns {Promise<number>}
 */
async function deleteQuery(text, params) {
  const result = await query(text, params);
  return result.rowCount;
}

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Execute queries within a transaction
 * @param {Function} callback - Async function that performs queries
 * @returns {Promise<any>} Result from callback
 */
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Run migration SQL file
 * @param {string} sqlContent - SQL file content
 * @returns {Promise<void>}
 */
async function runMigration(sqlContent) {
  try {
    // Keep console.log for migration CLI output
    console.log('Running migration...');
    await query(sqlContent);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    // Keep console.error for migration CLI output
    console.error('❌ Migration failed:', error.message);
    logger.error('Migration execution failed', {
      database: 'postgresql',
      operation: 'migration',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Check if migrations table exists
 * @returns {Promise<boolean>}
 */
async function migrationsTableExists() {
  const result = await query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'migrations'
    );
  `);
  return result.rows[0].exists;
}

/**
 * Create migrations tracking table
 * @returns {Promise<void>}
 */
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Check if a migration has been run
 * @param {string} migrationName - Name of the migration
 * @returns {Promise<boolean>}
 */
async function migrationExecuted(migrationName) {
  const result = await query(
    'SELECT EXISTS(SELECT 1 FROM migrations WHERE name = $1)',
    [migrationName]
  );
  return result.rows[0].exists;
}

/**
 * Record a migration as executed
 * @param {string} migrationName - Name of the migration
 * @returns {Promise<void>}
 */
async function recordMigration(migrationName) {
  await query(
    'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
    [migrationName]
  );
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
async function close() {
  logger.info('Closing PostgreSQL connection pool', {
    database: 'postgresql',
    operation: 'shutdown'
  });
  await pool.end();
  logger.info('PostgreSQL connection pool closed', {
    database: 'postgresql',
    operation: 'shutdown'
  });
}

// Handle process termination
process.on('SIGINT', async () => {
  await close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await close();
  process.exit(0);
});

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core
  pool,
  query,
  queryOne,
  queryAll,
  insert,
  update,
  deleteQuery,

  // Transactions
  transaction,

  // Health
  testConnection,
  getPoolStats,

  // Migrations
  runMigration,
  migrationsTableExists,
  createMigrationsTable,
  migrationExecuted,
  recordMigration,

  // Lifecycle
  close
};

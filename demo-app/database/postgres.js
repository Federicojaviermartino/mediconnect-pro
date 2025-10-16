/**
 * PostgreSQL Database Connection Module
 * Provides connection pooling and query helpers for MediConnect Pro
 */

const { Pool } = require('pg');

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

    // Pool settings
    max: parseInt(process.env.POSTGRES_POOL_MAX || '20'), // Maximum pool size
    min: parseInt(process.env.POSTGRES_POOL_MIN || '2'),  // Minimum pool size
    idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'), // 30 seconds
    connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000'), // 10 seconds

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
      max: parseInt(process.env.POSTGRES_POOL_MAX || '20'),
      min: parseInt(process.env.POSTGRES_POOL_MIN || '2'),
      idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000')
    });
  }

  return new Pool(config);
};

// Create the pool instance
const pool = createPool();

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
    console.error('PostgreSQL connection test failed:', error.message);
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
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('Query error:', error.message);
    console.error('Query:', text);
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
    console.log('Running migration...');
    await query(sqlContent);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
  console.log('Closing PostgreSQL connection pool...');
  await pool.end();
  console.log('PostgreSQL connection pool closed');
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

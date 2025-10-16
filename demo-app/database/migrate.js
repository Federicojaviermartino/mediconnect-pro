#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('./postgres');

// Migration files directory
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ============================================================================
// MIGRATION RUNNER
// ============================================================================

/**
 * Get all migration files sorted by name
 * @returns {Promise<Array<string>>}
 */
async function getMigrationFiles() {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Files are named 001_, 002_, etc.
  } catch (error) {
    console.error('Error reading migrations directory:', error.message);
    return [];
  }
}

/**
 * Read migration file content
 * @param {string} filename - Migration filename
 * @returns {Promise<string>}
 */
async function readMigrationFile(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  return await fs.readFile(filePath, 'utf8');
}

/**
 * Run a single migration
 * @param {string} filename - Migration filename
 * @returns {Promise<void>}
 */
async function runSingleMigration(filename) {
  console.log(`\n📄 Running migration: ${filename}`);

  try {
    // Check if already executed
    const executed = await db.migrationExecuted(filename);
    if (executed) {
      console.log(`⏭️  Skipping (already executed): ${filename}`);
      return;
    }

    // Read and execute migration
    const sql = await readMigrationFile(filename);
    await db.runMigration(sql);

    // Record as executed
    await db.recordMigration(filename);

    console.log(`✅ Completed: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed: ${filename}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

/**
 * Run all pending migrations
 * @returns {Promise<void>}
 */
async function runAllMigrations() {
  console.log('🚀 MediConnect Pro - Database Migration Runner');
  console.log('='.repeat(60));

  try {
    // Test connection
    console.log('\n🔍 Testing database connection...');
    const connected = await db.testConnection();

    if (!connected) {
      throw new Error('Failed to connect to database. Please check your configuration.');
    }
    console.log('✅ Database connection successful');

    // Ensure migrations table exists
    console.log('\n📋 Checking migrations tracking table...');
    const tableExists = await db.migrationsTableExists();

    if (!tableExists) {
      console.log('Creating migrations tracking table...');
      await db.createMigrationsTable();
      console.log('✅ Migrations table created');
    } else {
      console.log('✅ Migrations table exists');
    }

    // Get migration files
    console.log('\n📂 Scanning for migration files...');
    const files = await getMigrationFiles();

    if (files.length === 0) {
      console.log('⚠️  No migration files found in:', MIGRATIONS_DIR);
      return;
    }

    console.log(`Found ${files.length} migration file(s):`);
    files.forEach(f => console.log(`   - ${f}`));

    // Run migrations
    console.log('\n🔄 Running migrations...');
    for (const file of files) {
      await runSingleMigration(file);
    }

    // Show pool statistics
    const stats = db.getPoolStats();
    console.log('\n📊 Connection pool statistics:');
    console.log(`   Total connections: ${stats.total}`);
    console.log(`   Idle connections: ${stats.idle}`);
    console.log(`   Waiting clients: ${stats.waiting}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All migrations completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed!');
    console.error('='.repeat(60));
    console.error(error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

/**
 * Run a specific migration by name
 * @param {string} migrationName - Name of migration file
 * @returns {Promise<void>}
 */
async function runSpecificMigration(migrationName) {
  console.log(`🚀 Running specific migration: ${migrationName}`);

  try {
    await db.testConnection();
    await db.createMigrationsTable();
    await runSingleMigration(migrationName);

    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

/**
 * Rollback last migration (for development only)
 * WARNING: This will drop all tables!
 * @returns {Promise<void>}
 */
async function rollbackAll() {
  console.log('⚠️  WARNING: This will drop all tables!');
  console.log('This should only be used in development.');

  try {
    await db.testConnection();

    console.log('\n🗑️  Dropping all tables...');

    // Drop all tables in reverse dependency order
    await db.query('DROP TABLE IF EXISTS audit_log CASCADE');
    await db.query('DROP TABLE IF EXISTS notifications CASCADE');
    await db.query('DROP TABLE IF EXISTS messages CASCADE');
    await db.query('DROP TABLE IF EXISTS medical_records CASCADE');
    await db.query('DROP TABLE IF EXISTS prescriptions CASCADE');
    await db.query('DROP TABLE IF EXISTS appointments CASCADE');
    await db.query('DROP TABLE IF EXISTS vital_signs CASCADE');
    await db.query('DROP TABLE IF EXISTS patients CASCADE');
    await db.query('DROP TABLE IF EXISTS sessions CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');
    await db.query('DROP TABLE IF EXISTS migrations CASCADE');

    // Drop views
    await db.query('DROP VIEW IF EXISTS patient_summary CASCADE');
    await db.query('DROP VIEW IF EXISTS upcoming_appointments CASCADE');
    await db.query('DROP VIEW IF EXISTS active_prescriptions CASCADE');

    console.log('✅ All tables dropped');
    console.log('Run migrations again to recreate the schema.');

  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'run':
      // Run all pending migrations
      await runAllMigrations();
      break;

    case 'specific':
      // Run a specific migration
      if (!args[1]) {
        console.error('❌ Please specify migration filename');
        console.error('Usage: node migrate.js specific <filename>');
        process.exit(1);
      }
      await runSpecificMigration(args[1]);
      break;

    case 'rollback':
      // Rollback all migrations (development only)
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Rollback is not allowed in production!');
        process.exit(1);
      }
      await rollbackAll();
      break;

    case 'status':
      // Show migration status
      try {
        await db.testConnection();

        const tableExists = await db.migrationsTableExists();
        if (!tableExists) {
          console.log('Migrations table does not exist. Run migrations first.');
          await db.close();
          return;
        }

        const executed = await db.queryAll('SELECT * FROM migrations ORDER BY executed_at');
        console.log('\n📋 Executed Migrations:');
        console.log('='.repeat(60));

        if (executed.length === 0) {
          console.log('No migrations have been executed yet.');
        } else {
          executed.forEach(m => {
            console.log(`✅ ${m.name}`);
            console.log(`   Executed at: ${m.executed_at}`);
          });
        }

        console.log('='.repeat(60));
        await db.close();
      } catch (error) {
        console.error('❌ Error checking migration status:', error.message);
        process.exit(1);
      }
      break;

    default:
      // Show help
      console.log('MediConnect Pro - Database Migration Tool');
      console.log('');
      console.log('Usage:');
      console.log('  node migrate.js run              Run all pending migrations');
      console.log('  node migrate.js specific <name>  Run a specific migration');
      console.log('  node migrate.js status           Show migration status');
      console.log('  node migrate.js rollback         Rollback all (dev only)');
      console.log('');
      console.log('Examples:');
      console.log('  node migrate.js run');
      console.log('  node migrate.js specific 001_initial_schema.sql');
      console.log('  node migrate.js status');
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllMigrations,
  runSpecificMigration,
  rollbackAll
};

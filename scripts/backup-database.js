#!/usr/bin/env node

/**
 * MediConnect Pro - Database Backup Script
 *
 * Backs up the JSON database or PostgreSQL database to a timestamped file.
 * Supports compression and automatic cleanup of old backups.
 *
 * Usage:
 *   node scripts/backup-database.js [options]
 *
 * Options:
 *   --compress    Compress backup with gzip
 *   --keep=N      Keep last N backups (default: 7)
 *   --output=PATH Custom output directory (default: ./backups)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');

// Parse command line arguments
const args = process.argv.slice(2);
const compress = args.includes('--compress');
const keepBackups = parseInt(args.find(arg => arg.startsWith('--keep='))?.split('=')[1] || '7');
const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || path.join(__dirname, '..', 'backups');

// Configuration
const DB_FILE = path.join(__dirname, '..', 'src', 'database', 'database.json');
const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;

/**
 * Create backup directory if it doesn't exist
 */
function ensureBackupDir() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✅ Created backup directory: ${outputDir}`);
  }
}

/**
 * Generate timestamp for backup filename
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').split('T').join('_').split('.')[0];
}

/**
 * Backup JSON database
 */
function backupJSON() {
  console.log('📦 Backing up JSON database...');

  if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Database file not found:', DB_FILE);
    process.exit(1);
  }

  const timestamp = getTimestamp();
  const backupName = `mediconnect-backup-${timestamp}.json`;
  const backupPath = path.join(outputDir, backupName);

  // Read database file
  const data = fs.readFileSync(DB_FILE, 'utf8');

  if (compress) {
    // Compress with gzip
    const compressed = zlib.gzipSync(data);
    fs.writeFileSync(backupPath + '.gz', compressed);
    console.log(`✅ Backup created (compressed): ${backupPath}.gz`);

    // Get file sizes
    const originalSize = Buffer.byteLength(data);
    const compressedSize = compressed.length;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`📊 Compression: ${(originalSize / 1024).toFixed(2)} KB → ${(compressedSize / 1024).toFixed(2)} KB (${ratio}% smaller)`);
  } else {
    // Copy file
    fs.writeFileSync(backupPath, data);
    const size = (Buffer.byteLength(data) / 1024).toFixed(2);
    console.log(`✅ Backup created: ${backupPath} (${size} KB)`);
  }

  return backupPath + (compress ? '.gz' : '');
}

/**
 * Backup PostgreSQL database
 */
function backupPostgreSQL() {
  console.log('📦 Backing up PostgreSQL database...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const timestamp = getTimestamp();
  const backupName = `mediconnect-backup-${timestamp}.sql`;
  const backupPath = path.join(outputDir, backupName);

  try {
    // Use pg_dump to create backup
    const command = compress
      ? `pg_dump ${process.env.DATABASE_URL} | gzip > ${backupPath}.gz`
      : `pg_dump ${process.env.DATABASE_URL} > ${backupPath}`;

    console.log('⏳ Running pg_dump...');
    execSync(command, { stdio: 'inherit' });

    const finalPath = backupPath + (compress ? '.gz' : '');
    const stats = fs.statSync(finalPath);
    const size = (stats.size / 1024).toFixed(2);

    console.log(`✅ Backup created: ${finalPath} (${size} KB)`);
    return finalPath;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Clean up old backups
 */
function cleanupOldBackups() {
  console.log(`🧹 Cleaning up old backups (keeping ${keepBackups} most recent)...`);

  // Get all backup files
  const files = fs.readdirSync(outputDir)
    .filter(f => f.startsWith('mediconnect-backup-'))
    .map(f => ({
      name: f,
      path: path.join(outputDir, f),
      time: fs.statSync(path.join(outputDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // Sort by most recent first

  // Delete old backups
  const toDelete = files.slice(keepBackups);
  toDelete.forEach(file => {
    fs.unlinkSync(file.path);
    console.log(`🗑️  Deleted old backup: ${file.name}`);
  });

  if (toDelete.length === 0) {
    console.log('✅ No old backups to delete');
  } else {
    console.log(`✅ Deleted ${toDelete.length} old backup(s)`);
  }
}

/**
 * Main backup function
 */
function main() {
  console.log('🏥 MediConnect Pro - Database Backup');
  console.log('=====================================\n');

  ensureBackupDir();

  // Perform backup
  const backupPath = USE_POSTGRES ? backupPostgreSQL() : backupJSON();

  // Clean up old backups
  cleanupOldBackups();

  console.log('\n✅ Backup completed successfully!');
  console.log(`📁 Backup location: ${backupPath}`);
}

// Run backup
main();

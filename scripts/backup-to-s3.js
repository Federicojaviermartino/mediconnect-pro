#!/usr/bin/env node

/**
 * MediConnect Pro - S3 Backup Script
 *
 * Backs up the database (JSON or PostgreSQL) and uploads to AWS S3 or S3-compatible storage.
 * Supports encryption, retention policies, and automated cleanup.
 *
 * Usage:
 *   node scripts/backup-to-s3.js [options]
 *
 * Options:
 *   --encrypt     Encrypt backup with AES-256
 *   --keep=N      Keep last N backups in S3 (default: 30)
 *   --compress    Compress backup with gzip (recommended)
 *
 * Environment Variables (Required):
 *   AWS_ACCESS_KEY_ID       - AWS access key
 *   AWS_SECRET_ACCESS_KEY   - AWS secret key
 *   AWS_S3_BUCKET           - S3 bucket name
 *   AWS_S3_REGION           - AWS region (default: us-east-1)
 *
 * Alternative S3-compatible storage (Backblaze B2, DigitalOcean Spaces, etc.):
 *   S3_ENDPOINT             - Custom S3 endpoint URL
 *   S3_ACCESS_KEY_ID        - Access key
 *   S3_SECRET_ACCESS_KEY    - Secret key
 *   S3_BUCKET               - Bucket name
 *   S3_REGION               - Region
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const zlib = require('zlib');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
const encrypt = args.includes('--encrypt');
const compress = args.includes('--compress');
const keepBackups = parseInt(args.find(arg => arg.startsWith('--keep='))?.split('=')[1] || '30');

// Configuration
const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.DATABASE_URL;
const DB_FILE = path.join(__dirname, '..', 'demo-app', 'database', 'database.json');
const TEMP_DIR = path.join(__dirname, '..', 'temp-backups');

// S3 Configuration (AWS or custom endpoint)
const S3_CONFIG = {
  bucket: process.env.S3_BUCKET || process.env.AWS_S3_BUCKET,
  region: process.env.S3_REGION || process.env.AWS_S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
};

// Encryption key (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY
  ? Buffer.from(process.env.BACKUP_ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);

/**
 * Validate S3 configuration
 */
function validateS3Config() {
  if (!S3_CONFIG.bucket) {
    console.error('❌ S3_BUCKET or AWS_S3_BUCKET environment variable not set');
    process.exit(1);
  }

  if (!S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
    console.error('❌ S3 credentials not configured');
    console.error('   Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY');
    console.error('   Or AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }
}

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
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
 * Create database backup (JSON or PostgreSQL)
 */
function createBackup() {
  console.log('📦 Creating database backup...');

  const timestamp = getTimestamp();
  const backupName = `mediconnect-backup-${timestamp}`;
  const extension = USE_POSTGRES ? '.sql' : '.json';
  const backupPath = path.join(TEMP_DIR, backupName + extension);

  if (USE_POSTGRES) {
    // PostgreSQL backup
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set');
      process.exit(1);
    }

    console.log('⏳ Running pg_dump...');
    execSync(`pg_dump ${process.env.DATABASE_URL} > "${backupPath}"`, { stdio: 'inherit' });

  } else {
    // JSON backup
    if (!fs.existsSync(DB_FILE)) {
      console.error('❌ Database file not found:', DB_FILE);
      process.exit(1);
    }

    fs.copyFileSync(DB_FILE, backupPath);
  }

  const stats = fs.statSync(backupPath);
  console.log(`✅ Backup created: ${backupName}${extension} (${(stats.size / 1024).toFixed(2)} KB)`);

  return backupPath;
}

/**
 * Compress backup file
 */
function compressBackup(backupPath) {
  console.log('🗜️  Compressing backup...');

  const compressedPath = backupPath + '.gz';
  const input = fs.readFileSync(backupPath);
  const compressed = zlib.gzipSync(input, { level: 9 });
  fs.writeFileSync(compressedPath, compressed);

  // Remove uncompressed file
  fs.unlinkSync(backupPath);

  const ratio = ((1 - compressed.length / input.length) * 100).toFixed(1);
  console.log(`✅ Compressed: ${(input.length / 1024).toFixed(2)} KB → ${(compressed.length / 1024).toFixed(2)} KB (${ratio}% smaller)`);

  return compressedPath;
}

/**
 * Encrypt backup file
 */
function encryptBackup(backupPath) {
  console.log('🔐 Encrypting backup...');

  const encryptedPath = backupPath + '.enc';
  const input = fs.readFileSync(backupPath);

  // Generate random IV
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);

  // Encrypt data
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  // Prepend IV to encrypted data
  const output = Buffer.concat([iv, encrypted]);
  fs.writeFileSync(encryptedPath, output);

  // Remove unencrypted file
  fs.unlinkSync(backupPath);

  console.log('✅ Backup encrypted with AES-256');
  console.log(`🔑 Encryption key (save this securely): ${ENCRYPTION_KEY.toString('hex')}`);

  return encryptedPath;
}

/**
 * Upload backup to S3
 */
async function uploadToS3(backupPath) {
  console.log('☁️  Uploading to S3...');

  try {
    // Dynamically import AWS SDK v3
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

    // Create S3 client
    const s3Client = new S3Client({
      region: S3_CONFIG.region,
      endpoint: S3_CONFIG.endpoint,
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey
      }
    });

    // Read backup file
    const fileContent = fs.readFileSync(backupPath);
    const fileName = path.basename(backupPath);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: `backups/${fileName}`,
      Body: fileContent,
      ContentType: 'application/octet-stream',
      Metadata: {
        'backup-type': USE_POSTGRES ? 'postgresql' : 'json',
        'backup-date': new Date().toISOString(),
        'compressed': compress ? 'true' : 'false',
        'encrypted': encrypt ? 'true' : 'false'
      }
    });

    await s3Client.send(command);

    console.log(`✅ Uploaded to S3: s3://${S3_CONFIG.bucket}/backups/${fileName}`);
    console.log(`📊 Size: ${(fileContent.length / 1024).toFixed(2)} KB`);

    return fileName;

  } catch (error) {
    console.error('❌ S3 upload failed:', error.message);

    if (error.name === 'MODULE_NOT_FOUND') {
      console.error('\n💡 Install AWS SDK: npm install @aws-sdk/client-s3');
    }

    throw error;
  }
}

/**
 * Cleanup old backups in S3
 */
async function cleanupOldBackups() {
  console.log(`🧹 Cleaning up old backups (keeping ${keepBackups} most recent)...`);

  try {
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: S3_CONFIG.region,
      endpoint: S3_CONFIG.endpoint,
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey
      }
    });

    // List all backups
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_CONFIG.bucket,
      Prefix: 'backups/'
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      console.log('✅ No backups to clean up');
      return;
    }

    // Sort by date (most recent first)
    const backups = response.Contents
      .sort((a, b) => b.LastModified - a.LastModified);

    // Get backups to delete
    const toDelete = backups.slice(keepBackups);

    if (toDelete.length === 0) {
      console.log('✅ No old backups to delete');
      return;
    }

    // Delete old backups
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: S3_CONFIG.bucket,
      Delete: {
        Objects: toDelete.map(obj => ({ Key: obj.Key }))
      }
    });

    await s3Client.send(deleteCommand);

    console.log(`✅ Deleted ${toDelete.length} old backup(s) from S3`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    // Don't throw - cleanup failure shouldn't fail the backup
  }
}

/**
 * Cleanup temp directory
 */
function cleanupTemp() {
  if (fs.existsSync(TEMP_DIR)) {
    const files = fs.readdirSync(TEMP_DIR);
    files.forEach(file => {
      fs.unlinkSync(path.join(TEMP_DIR, file));
    });
    fs.rmdirSync(TEMP_DIR);
    console.log('🧹 Cleaned up temporary files');
  }
}

/**
 * Main backup function
 */
async function main() {
  console.log('🏥 MediConnect Pro - S3 Backup');
  console.log('================================\n');

  // Validate configuration
  validateS3Config();

  // Ensure temp directory
  ensureTempDir();

  try {
    // Step 1: Create backup
    let backupPath = createBackup();

    // Step 2: Compress (if requested)
    if (compress) {
      backupPath = compressBackup(backupPath);
    }

    // Step 3: Encrypt (if requested)
    if (encrypt) {
      backupPath = encryptBackup(backupPath);
    }

    // Step 4: Upload to S3
    const fileName = await uploadToS3(backupPath);

    // Step 5: Cleanup old backups
    await cleanupOldBackups();

    // Step 6: Cleanup temp directory
    cleanupTemp();

    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 S3 location: s3://${S3_CONFIG.bucket}/backups/${fileName}`);

    if (encrypt && !process.env.BACKUP_ENCRYPTION_KEY) {
      console.log('\n⚠️  IMPORTANT: Save the encryption key shown above!');
      console.log('   You will need it to decrypt the backup.');
      console.log('   Add to .env: BACKUP_ENCRYPTION_KEY=<key>');
    }

  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    cleanupTemp();
    process.exit(1);
  }
}

// Run backup
main();

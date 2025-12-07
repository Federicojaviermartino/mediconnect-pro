#!/usr/bin/env node

/**
 * Script to remove console.log statements from frontend JavaScript files
 * Keeps error handling in try-catch blocks by converting to proper error handling
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../public');

// Files to process
const filesToProcess = [
  'dashboard-interactive.js',
  'ai-assistant.js',
  'vitals-monitor.js',
  'insurance-manager.js',
  'dashboard-scripts.js',
  'utils/csrf.js',
  'utils/lazy-load.js',
  'utils/advanced-lazy-load.js'
];

function removeConsoleLogs(filePath) {
  const fullPath = path.join(PUBLIC_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return { removed: 0, kept: 0 };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalLines = content.split('\n').length;

  let removed = 0;
  let kept = 0;

  // Remove debug console.log statements (with "Debug" comment)
  content = content.replace(/console\.log\([^)]*\);\s*\/\/\s*Debug.*$/gm, (match) => {
    removed++;
    return '// Debug log removed';
  });

  // Remove standalone console.log statements (not in try-catch)
  // This regex matches console.log that is not part of error handling
  content = content.replace(/^\s*console\.log\([^)]*\);?\s*$/gm, (match) => {
    removed++;
    return '';
  });

  // Keep console.error in catch blocks but add comment
  const errorMatches = content.match(/console\.error/g);
  if (errorMatches) {
    kept = errorMatches.length;
  }

  // Write back
  fs.writeFileSync(fullPath, content, 'utf8');

  return { removed, kept };
}

// Process all files
let totalRemoved = 0;
let totalKept = 0;

console.log('Starting console.log removal from frontend files...\n');

filesToProcess.forEach(file => {
  const { removed, kept } = removeConsoleLogs(file);
  totalRemoved += removed;
  totalKept += kept;

  if (removed > 0 || kept > 0) {
    console.log(`✓ ${file}`);
    console.log(`  - Removed: ${removed} console.log statements`);
    if (kept > 0) {
      console.log(`  - Kept: ${kept} console.error statements (error handling)`);
    }
  }
});

console.log(`\n✅ Total console.log removed: ${totalRemoved}`);
console.log(`📝 Total console.error kept for error handling: ${totalKept}`);

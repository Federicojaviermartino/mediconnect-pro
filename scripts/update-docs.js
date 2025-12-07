// Script to update demo-app/ references to src/ in all markdown files
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Find all markdown files recursively
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Replace demo-app/ with src/ in file
function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Replace all occurrences of demo-app/ with src/
  content = content.replace(/demo-app\//g, 'src/');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${path.relative(projectRoot, filePath)}`);
    return true;
  }

  return false;
}

// Main execution
console.log('🔍 Finding markdown files...');
const markdownFiles = findMarkdownFiles(projectRoot);
console.log(`📝 Found ${markdownFiles.length} markdown files\n`);

let updatedCount = 0;
markdownFiles.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✨ Updated ${updatedCount} files`);

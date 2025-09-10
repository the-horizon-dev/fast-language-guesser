#!/usr/bin/env node
/**
 * Build script for ESM that adds import attributes for Node.js v22+ compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a temporary directory for ESM source with import attributes
const tempDir = path.join(__dirname, '../temp-esm-src');
const srcDir = path.join(__dirname, '../src');

function copyAndTransformFiles(srcPath, destPath) {
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  const items = fs.readdirSync(srcPath);
  
  for (const item of items) {
    const srcItemPath = path.join(srcPath, item);
    const destItemPath = path.join(destPath, item);
    const stat = fs.statSync(srcItemPath);
    
    if (stat.isDirectory()) {
      copyAndTransformFiles(srcItemPath, destItemPath);
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      let content = fs.readFileSync(srcItemPath, 'utf8');
      
      // Add import attributes for JSON imports for Node.js v22+ ESM compatibility
      content = content.replace(/import\s+(.+?)\s+from\s+["'](.+?\.json)["'];?/g, 
        'import $1 from "$2" with { type: "json" };');
      
      fs.writeFileSync(destItemPath, content);
    } else {
      // Copy other files as-is (like JSON files)
      fs.copyFileSync(srcItemPath, destItemPath);
    }
  }
}

try {
  console.log('Creating temporary source directory for ESM build with import attributes...');
  
  // Clean up any existing temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  
  // Copy and transform source files
  copyAndTransformFiles(srcDir, tempDir);
  
  // Create a temporary tsconfig for the ESM build
  const originalTsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  const tempTsConfig = {
    ...originalTsConfig,
    compilerOptions: {
      ...originalTsConfig.compilerOptions,
      rootDir: tempDir
    },
    include: [`${tempDir}/**/*`]
  };
  
  const tempTsConfigPath = path.join(__dirname, '../tsconfig.temp.json');
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tempTsConfig, null, 2));
  
  // Build ESM using the transformed source
  console.log('Building ESM with import attributes...');
  execSync(`tsc --project ${tempTsConfigPath}`, { stdio: 'inherit' });
  
  // Clean up temp files
  console.log('Cleaning up...');
  fs.rmSync(tempDir, { recursive: true });
  fs.rmSync(tempTsConfigPath);
  
  console.log('ESM build with import attributes completed successfully!');
  
} catch (error) {
  console.error('ESM build failed:', error.message);
  
  // Clean up on error
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
  
  const tempTsConfigPath = path.join(__dirname, '../tsconfig.temp.json');
  if (fs.existsSync(tempTsConfigPath)) {
    fs.rmSync(tempTsConfigPath);
  }
  
  process.exit(1);
}

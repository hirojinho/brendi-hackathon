#!/usr/bin/env node

/**
 * Simple diagnostic script to test tab functionality
 * Run this after starting the application to verify tabs work
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Tab Crash Diagnostic Script');
console.log('================================');

// Check if the application is built
const distPath = path.join(__dirname, 'dist', 'renderer');
if (!fs.existsSync(distPath)) {
  console.log('❌ Application not built. Running build...');
  try {
    execSync('npm run build:renderer', { stdio: 'inherit' });
    console.log('✅ Build completed');
  } catch (error) {
    console.log('❌ Build failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Application is built');
}

// Check for key component files
const componentChecks = [
  'src/renderer/components/DesktopApp.tsx',
  'src/renderer/components/desktop/MinimalChatPanel.tsx',
  'src/renderer/components/desktop/MinimalNotesPanel.tsx',
  'src/renderer/components/desktop/DesktopChatPanel.tsx',
  'src/renderer/components/desktop/DesktopNotesPanel.tsx',
  'src/renderer/components/common/ErrorBoundary.tsx'
];

console.log('\n📁 Checking component files:');
componentChecks.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
  }
});

// Check for potential problematic imports
console.log('\n🔍 Checking for potential issues:');

const desktopAppPath = path.join(__dirname, 'src/renderer/components/DesktopApp.tsx');
if (fs.existsSync(desktopAppPath)) {
  const content = fs.readFileSync(desktopAppPath, 'utf8');
  
  if (content.includes('useMinimalComponents')) {
    console.log('✅ Minimal component toggle is implemented');
  } else {
    console.log('❌ Minimal component toggle is missing');
  }
  
  if (content.includes('ErrorBoundary')) {
    console.log('✅ Error boundaries are implemented');
  } else {
    console.log('❌ Error boundaries are missing');
  }
  
  if (content.includes('MinimalChatPanel')) {
    console.log('✅ Minimal chat panel is imported');
  } else {
    console.log('❌ Minimal chat panel is not imported');
  }
}

console.log('\n🚀 Application Status:');
console.log('- The application should start in Minimal Mode by default');
console.log('- All tabs should be clickable without crashing');
console.log('- Use Cmd+Shift+M to toggle between minimal and full modes');
console.log('- Check the browser console for any error messages');

console.log('\n📋 Testing Checklist:');
console.log('1. Start the app: npm run dev');
console.log('2. Click each tab: Chat, Notes, Zettelkasten, Review, Documents');
console.log('3. Verify no crashes occur');
console.log('4. If in dev mode, try toggling minimal/full mode');
console.log('5. Report any specific error messages');

console.log('\n✨ Diagnostic complete!');
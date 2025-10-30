import { watch, renameSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const preloadSrc = join(process.cwd(), 'dist', 'main', 'preload.js');
const preloadDest = join(process.cwd(), 'dist', 'main', 'preload.cjs');

function renamePreload() {
  if (existsSync(preloadSrc)) {
    try {
      if (existsSync(preloadDest)) {
        unlinkSync(preloadDest);
      }
      renameSync(preloadSrc, preloadDest);
      console.log('[Preload Watch] ✓ Renamed preload.js → preload.cjs');
    } catch (err) {
      console.error('[Preload Watch] Failed to rename:', err);
    }
  }
}

// Start tsc in watch mode
console.log('[Preload Watch] Starting TypeScript watch...');
const tscProcess = spawn('tsc', ['-p', 'tsconfig.preload.json', '--watch'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Watch the output directory for preload.js changes
const distDir = join(process.cwd(), 'dist', 'main');
console.log('[Preload Watch] Watching for preload.js in:', distDir);

// Initial rename after a short delay
setTimeout(renamePreload, 1000);

watch(distDir, (eventType, filename) => {
  if (filename === 'preload.js') {
    setTimeout(renamePreload, 100);
  }
});

tscProcess.on('exit', () => {
  process.exit(0);
});


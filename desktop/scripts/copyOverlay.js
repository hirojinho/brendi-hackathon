import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'overlay');
const destDir = path.join(process.cwd(), 'dist', 'overlay');

fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(srcDir, destDir, { recursive: true });

console.log('[copyOverlay] Copied overlay to dist/overlay');



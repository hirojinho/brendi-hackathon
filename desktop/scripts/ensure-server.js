import { existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve paths: from desktop/scripts/ to server/dist/
const desktopRoot = resolve(__dirname, '..');
const workspaceRoot = resolve(desktopRoot, '..');
const serverDistPath = join(workspaceRoot, 'server', 'dist');
const containerPath = join(serverDistPath, 'bootstrap', 'container.js');
const routesPath = join(serverDistPath, 'http', 'registerRoutes.js');

// Check if server is built
const isServerBuilt = existsSync(containerPath) && existsSync(routesPath);

if (!isServerBuilt) {
  console.log('[ensure-server] Server not built. Building server...');
  try {
    const serverDir = join(workspaceRoot, 'server');
    execSync('npm run build', {
      cwd: serverDir,
      stdio: 'inherit'
    });
    console.log('[ensure-server] Server built successfully.');
  } catch (error) {
    console.error('[ensure-server] Failed to build server:', error.message);
    process.exit(1);
  }
} else {
  console.log('[ensure-server] Server already built.');
}


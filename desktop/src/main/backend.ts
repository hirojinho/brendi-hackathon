import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve server dist path (server must be built)
// From desktop/dist/main/ we need to go up to workspace root, then to server/dist
const workspaceRoot = path.resolve(__dirname, '../../../');
const serverDistPath = path.resolve(workspaceRoot, 'server/dist');

// Use dynamic import to load server modules from dist
// This allows us to handle the case where server might not be built yet
async function loadServerModules() {
  // Check if server dist exists
  const containerPath = path.join(serverDistPath, 'bootstrap/container.js');
  const routesPath = path.join(serverDistPath, 'http/registerRoutes.js');
  
  if (!fs.existsSync(containerPath) || !fs.existsSync(routesPath)) {
    throw new Error(
      `Server not built. Please run: cd ../server && npm run build\n` +
      `Expected files:\n` +
      `  ${containerPath}\n` +
      `  ${routesPath}`
    );
  }
  
  try {
    const containerUrl = pathToFileURL(containerPath).href;
    const routesUrl = pathToFileURL(routesPath).href;
    
    const containerModule = await import(containerUrl);
    const routesModule = await import(routesUrl);
    
    return {
      buildContainer: containerModule.buildContainer,
      registerAllRoutes: routesModule.registerAllRoutes
    };
  } catch (error: any) {
    console.error('[Backend] Failed to import server modules:', error);
    throw new Error(`Cannot import server modules from dist. Error: ${error.message}`);
  }
}

export interface BackendServer {
  app: express.Application;
  container: any; // Container type from server
  port: number;
}

/**
 * Initialize embedded Express server with custom port and userData directory
 */
export async function initializeBackend(port: number, envVars?: Record<string, string>): Promise<BackendServer> {
  // Load server modules
  const { buildContainer, registerAllRoutes } = await loadServerModules();
  
  // Set environment variables if provided
  if (envVars) {
    for (const [key, value] of Object.entries(envVars)) {
      process.env[key] = value;
    }
  }

  // Build container (this will use process.cwd() which we override in main.ts)
  const container = buildContainer();
  
  const app = express();

  // CORS not needed for loopback-only access, but keeping it minimal
  app.use(cors({
    origin: '*', // Not important for localhost-only
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  
  app.use(express.json());

  // Register all routes
  registerAllRoutes(app, container);

  // Start server on loopback only
  await new Promise<void>((resolve, reject) => {
    try {
      const server = app.listen(port, '127.0.0.1', () => {
        resolve();
      });
      server.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });

  return {
    app,
    container,
    port
  };
}


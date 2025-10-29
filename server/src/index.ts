import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { buildContainer } from './bootstrap/container.js';
import { registerAllRoutes } from './http/registerRoutes.js';

dotenv.config();

const app = express();
const container = buildContainer();
const port = container.config.port;

app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Mount all routes via the new HTTP layer
registerAllRoutes(app, container);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 
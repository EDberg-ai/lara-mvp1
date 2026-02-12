import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import folderRoutes from './routes/folders';
import sessionRoutes from './routes/sessions';
import uploadRoutes from './routes/upload';
import { validateDatabaseConnection, disconnectDatabase } from './lib/prisma';
import { initializeSocket } from './lib/socket';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse allowed origins from environment (comma-separated) or use defaults
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

console.log('Allowed CORS origins:', allowedOrigins);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      // Return false instead of throwing - this sends proper CORS rejection headers
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Explicit OPTIONS handler for preflight (as a fallback)
// Use regex pattern since path-to-regexp no longer supports '*' wildcard
app.options(/(.*)/, cors());

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/upload', uploadRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server with database validation
async function startServer() {
  const HOST = '0.0.0.0';

  // Validate database connection before accepting requests
  const dbConnected = await validateDatabaseConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Create HTTP server and initialize Socket.io
  const httpServer = createServer(app);
  initializeSocket(httpServer, allowedOrigins);

  const server = httpServer.listen(Number(PORT), HOST, () => {
    console.log(`🚀 LARA Backend running on ${HOST}:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    console.log(`   WebSocket: Enabled`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('Server closed. Database disconnected.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();

export default app;

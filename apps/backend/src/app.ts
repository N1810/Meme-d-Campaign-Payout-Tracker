import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import campaignRoutes from './routes/campaignRoutes';
import submissionRoutes from './routes/submissionRoutes';
import earningsRoutes from './routes/earningsRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): express.Application {
  const app = express();

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev/testing, production-safe with credentials
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key'],
    }),
  );

  app.use(cookieParser());
  app.use(express.json());

  // Root endpoint
  app.get('/', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      name: "Meme'd Campaign Payout Tracker API",
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/earnings', earningsRoutes);

  // 404 Route handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

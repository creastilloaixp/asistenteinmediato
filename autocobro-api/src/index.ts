import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import transactionRoutes from './routes/transactions.js';
import storeRoutes from './routes/stores.js';
import paymentRoutes from './routes/payments.js';
import kioskRoutes from './routes/kiosks.js';
import kioskTransactionRoutes from './routes/kioskTransactions.js';
import storeRegistrationRoutes from './routes/storeRegistration.js';
import billingRoutes from './routes/billing.js';
import aiRoutes from './routes/ai.js';
import activityLogRoutes from './routes/activityLogs.js';
import customerRoutes from './routes/customers.js';
import terminalRoutes from './routes/terminal.js';
import pushRoutes from './routes/pushNotifications.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { loginLimiter, kioskLimiter } from './middleware/rateLimiter.js';
import { setupWebSocket } from './services/websocket.js';
import { initializePushNotifications } from './services/pushNotifications.js';
import { logger } from './utils/logger.js';

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Patch for BigInt serialization via JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// Configuration - Better CORS support
const envOrigins = process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',').map(u => u.trim()) : [];
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:4000',
  ...envOrigins
];

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  (req as any).prisma = prisma;
  next();
});

/**
 * Enhanced health check endpoint.
 * Verifies database connectivity and required environment variables.
 * Returns 200 if healthy, 503 if any check fails.
 */
app.get('/api/health', async (_, res) => {
  try {
    const startTime = Date.now();
    const checks: Record<string, boolean> = {};

    // Check PostgreSQL connectivity
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (dbError) {
      checks.database = false;
      logger.error('Health check: Database connectivity failed', {
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    // Check required environment variables
    const requiredEnvVars = ['JWT_SECRET'];
    const optionalEnvVars = ['STRIPE_SECRET_KEY', 'GEMINI_API_KEY'];

    checks.envVars = requiredEnvVars.every((envVar) => !!process.env[envVar]);

    if (!checks.envVars) {
      const missing = requiredEnvVars.filter((v) => !process.env[v]);
      logger.error('Health check: Missing required environment variables', {
        missing,
      });
    }

    // Check optional env vars
    const availableOptional = optionalEnvVars.filter((v) => !!process.env[v]);

    const responseTime = Date.now() - startTime;
    const allChecksPassed = checks.database && checks.envVars;

    const statusCode = allChecksPassed ? 200 : 503;

    res.status(statusCode).json({
      status: allChecksPassed ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      checks,
      features: {
        stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
        geminiEnabled: !!process.env.GEMINI_API_KEY,
      },
    });
  } catch (error) {
    logger.error('Health check endpoint error', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: { database: false, envVars: false },
    });
  }
});

// Apply rate limiting to auth endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRegistrationRoutes);
app.use('/api/billing', billingRoutes);

app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/stores/manage', authMiddleware, storeRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
// Apply rate limiting to kiosk endpoints
app.use('/api/kiosks/sync', kioskLimiter);
app.use('/api/kiosks/recommendations', kioskLimiter);
app.use('/api/kiosks', kioskRoutes);
app.use('/api/kiosk/transactions', kioskTransactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/terminal', terminalRoutes);
app.use('/api/push', authMiddleware, pushRoutes);
app.use('/api/activity-logs', authMiddleware, activityLogRoutes);

app.use(errorHandler);

// Only initialize WS and Listen if not on Vercel
if (!process.env.VERCEL) {
  setupWebSocket(app, server);
  initializePushNotifications();
  
  const main = async () => {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
    }
  };
  main();
} else {
  // On Vercel, we just want to ensure prisma is ready
  // Note: WebSockets will NOT work here
  console.log('🌩️ Running on Vercel environment');
}

export default app;
export { prisma };

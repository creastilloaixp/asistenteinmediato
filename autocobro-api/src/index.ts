import 'dotenv/config';
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
import { setupWebSocket } from './services/websocket.js';
import { initializePushNotifications } from './services/pushNotifications.js';

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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRegistrationRoutes);
app.use('/api/billing', billingRoutes);

app.use('/api/products', authMiddleware, productRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/stores/manage', authMiddleware, storeRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
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

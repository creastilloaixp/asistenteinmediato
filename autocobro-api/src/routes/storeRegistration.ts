import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, Plan, SubscriptionStatus } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const PLAN_LIMITS = {
  [Plan.FREE]: { maxKiosks: 1, maxProducts: 50 },
  [Plan.STARTER]: { maxKiosks: 2, maxProducts: 200 },
  [Plan.PRO]: { maxKiosks: 5, maxProducts: 1000 },
  [Plan.ENTERPRISE]: { maxKiosks: -1, maxProducts: -1 },
};

router.post('/register', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { name, email, password, storeName, address, phone } = req.body;

  if (!name || !email || !password || !storeName) {
    throw new HttpError('Name, email, password y storeName son requeridos', 400);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HttpError('El email ya está registrado', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const apiKey = `sk_${crypto.randomUUID().replace(/-/g, '')}`;
    const plan = Plan.FREE;
    const limits = PLAN_LIMITS[plan];

    const store = await tx.store.create({
      data: {
        name: storeName,
        address: address || null,
        phone: phone || null,
        apiKey,
        plan,
        maxKiosks: limits.maxKiosks,
        maxProducts: limits.maxProducts,
      },
    });

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await tx.subscription.create({
      data: {
        storeId: store.id,
        plan: Plan.FREE,
        status: SubscriptionStatus.TRIALING,
        currentPeriodStart: now,
        currentPeriodEnd: thirtyDaysLater,
      },
    });

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: UserRole.OWNER,
        storeId: store.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
      },
    });

    return { user, store, apiKey };
  });

  const token = jwt.sign(
    { 
      id: result.user.id, 
      email: result.user.email, 
      role: result.user.role, 
      storeId: result.user.storeId 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      store: {
        id: result.store.id,
        name: result.store.name,
        apiKey: result.apiKey,
        plan: result.store.plan,
      },
      token,
    },
  });
}));

router.get('/my-stores', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError('Token no proporcionado', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new HttpError('Usuario no encontrado', 404);
  }

  if (user.storeId) {
    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      include: {
        subscription: true,
        _count: { select: { kiosks: true, products: true, users: true } },
      },
    });

    if (store) {
      return res.json({
        success: true,
        data: {
          stores: [store],
          activeStoreId: user.storeId,
        },
      });
    }
  }

  const stores = await prisma.store.findMany({
    where: {
      users: { some: { id: user.id } },
    },
    include: {
      subscription: true,
      _count: { select: { kiosks: true, products: true, users: true } },
    },
  });

  res.json({
    success: true,
    data: {
      stores,
      activeStoreId: user.storeId,
    },
  });
}));

router.post('/switch-store', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { storeId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError('Token no proporcionado', 401);
  }

  if (!storeId) {
    throw new HttpError('StoreId es requerido', 400);
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET) as any;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new HttpError('Usuario no encontrado', 404);
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      users: { some: { id: user.id } },
    },
    include: {
      subscription: true,
      _count: { select: { kiosks: true, products: true } },
    },
  });

  if (!store) {
    throw new HttpError('Tienda no encontrada o no tienes acceso', 404);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { storeId: store.id },
  });

  const newToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, storeId: store.id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: store.id,
      },
      store,
      token: newToken,
    },
  });
}));

export default router;

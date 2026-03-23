import { Router } from 'express';
import { PrismaClient, KioskStatus, Plan, SubscriptionStatus } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore, authMiddleware } from '../middleware/auth.js';
import { generateRecommendations } from '../services/geminiService.js';
import { HealthService } from '../services/healthService.js';
import { logger } from '../utils/logger.js';
const createHealthService = (prisma: PrismaClient) => new HealthService(prisma);
import { KioskHealthMetrics } from '../services/healthService.js';

const router = Router();

const PLAN_LIMITS_KIOSKS = {
  [Plan.FREE]: 1,
  [Plan.STARTER]: 2,
  [Plan.PRO]: 5,
  [Plan.ENTERPRISE]: -1,
};

router.post('/register', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { storeId, deviceName, deviceKey } = req.body;

  if (!storeId || !deviceName) {
    throw new HttpError('StoreId y deviceName son requeridos', 400);
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { subscription: true },
  });

  if (!store) {
    throw new HttpError('Tienda no encontrada', 404);
  }

  if (!store.active) {
    throw new HttpError('Tienda desactivada', 403);
  }

  const now = new Date();
  const subscription = store.subscription;

  if (!subscription) {
    throw new HttpError('No tienes una suscripción activa', 403);
  }

  if (subscription.status === SubscriptionStatus.CANCELLED && subscription.currentPeriodEnd < now) {
    throw new HttpError('Tu suscripción ha expirado', 403);
  }

  if (subscription.status === SubscriptionStatus.PAST_DUE) {
    throw new HttpError('Tu suscripción tiene un pago pendiente', 403);
  }

  const maxKiosks = PLAN_LIMITS_KIOSKS[subscription.plan];

  if (maxKiosks !== -1) {
    const currentKiosks = await prisma.kioskDevice.count({
      where: { storeId },
    });

    if (currentKiosks >= maxKiosks) {
      throw new HttpError(
        `Has alcanzado el límite de ${maxKiosks} kiosco(s) para tu plan ${subscription.plan}. Actualiza tu plan para agregar más.`,
        403
      );
    }
  }

  const existing = await prisma.kioskDevice.findFirst({
    where: deviceKey ? { deviceKey } : { deviceName, storeId },
  });

  if (existing) {
    return res.json({
      success: true,
      data: { kiosk: existing, message: 'Kiosco ya registrado' },
    });
  }

  const kiosk = await prisma.kioskDevice.create({
    data: {
      storeId,
      deviceName,
      deviceKey: deviceKey || crypto.randomUUID(),
      status: KioskStatus.ONLINE,
      lastSeen: new Date(),
    },
  });

  res.status(201).json({
    success: true,
    data: {
      kiosk,
      plan: subscription.plan,
      maxKiosks,
    },
  });
}));

router.put('/:id/heartbeat', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;

  const kiosk = await prisma.kioskDevice.update({
    where: { id },
    data: {
      lastSeen: new Date(),
      status: KioskStatus.ONLINE,
    },
  });

  res.json({ success: true, data: { kiosk } });
}));

router.put('/:id/status', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  const { status, config } = req.body;

  if (!status) {
    throw new HttpError('Status es requerido', 400);
  }

  const kiosk = await prisma.kioskDevice.update({
    where: { id },
    data: {
      status: status as KioskStatus,
      config,
      lastSeen: new Date(),
    },
  });

  res.json({ success: true, data: { kiosk } });
}));

router.get('/store/:storeId', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { storeId } = req.params;

  if (req.user?.storeId !== storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a esta tienda', 403);
  }

  const kiosks = await prisma.kioskDevice.findMany({
    where: { storeId },
    include: {
      _count: { select: { transactions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: { kiosks } });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    include: {
      store: { select: { name: true } },
      _count: { select: { transactions: true } },
    },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  res.json({ success: true, data: { kiosk } });
}));

router.get('/:deviceKey/sync', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { deviceKey } = req.params;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { deviceKey },
    include: {
      store: {
        include: {
          products: { where: { active: true } },
        },
      },
    },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  await prisma.kioskDevice.update({
    where: { id: kiosk.id },
    data: { lastSeen: new Date() },
  });

  res.json({
    success: true,
    data: {
      products: kiosk.store.products,
      storeName: kiosk.store.name,
      kioskId: kiosk.id,
      config: kiosk.config,
      syncTime: new Date().toISOString(),
    },
  });
}));

router.post('/:id/health', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  const metrics: KioskHealthMetrics = req.body;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    select: { id: true, deviceKey: true, storeId: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  const healthService = createHealthService(prisma);
  const { health, alerts } = await healthService.recordHealth(id, metrics);

  if (alerts.length > 0) {
    const wsService = await import('../services/websocket.js');
    for (const alert of alerts) {
      wsService.wsService.broadcastToStore(kiosk.storeId, 'KIOSK_ALERT' as any, {
        kioskId: id,
        alert,
        type: 'alert',
      });
    }
  }

  res.json({
    success: true,
    data: {
      health,
      alerts,
      kioskId: id,
    },
  });
}));

router.get('/:id/health/history', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  const hours = parseInt(req.query.hours as string) || 24;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    select: { storeId: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  if (req.user?.storeId !== kiosk.storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a este kiosco', 403);
  }

  const healthService = createHealthService(prisma);
  const history = await healthService.getKioskHealthHistory(id, hours);

  res.json({ success: true, data: { history } });
}));

router.get('/:id/alerts', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  const includeAcknowledged = req.query.includeAcknowledged === 'true';
  const limit = parseInt(req.query.limit as string) || 50;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    select: { storeId: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  if (req.user?.storeId !== kiosk.storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a este kiosco', 403);
  }

  const healthService = createHealthService(prisma);
  const alerts = await healthService.getKioskAlerts(id, includeAcknowledged, limit);

  res.json({ success: true, data: { alerts } });
}));

router.put('/:id/alerts/:alertId/acknowledge', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id, alertId } = req.params;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    select: { storeId: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  if (req.user?.storeId !== kiosk.storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a este kiosco', 403);
  }

  const healthService = createHealthService(prisma);
  const alert = await healthService.acknowledgeAlert(alertId, req.user?.id || 'unknown');

  res.json({ success: true, data: { alert } });
}));

router.get('/:id/health/uptime', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { id } = req.params;
  const hours = parseInt(req.query.hours as string) || 24;

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { id },
    select: { storeId: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 404);
  }

  if (req.user?.storeId !== kiosk.storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a este kiosco', 403);
  }

  const healthService = createHealthService(prisma);
  const uptime = await healthService.calculateUptime(id, hours);

  res.json({ success: true, data: { uptime } });
}));

router.get('/store/:storeId/health/overview', authMiddleware, asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { storeId } = req.params;

  if (req.user?.storeId !== storeId && req.user?.role !== 'ADMIN') {
    throw new HttpError('No tienes acceso a esta tienda', 403);
  }

  const kiosks = await prisma.kioskDevice.findMany({
    where: { storeId },
    select: {
      id: true,
      deviceName: true,
      status: true,
      lastSeen: true,
      firstSeen: true,
      healthRecords: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          cpuUsage: true,
          memoryUsage: true,
          healthStatus: true,
          printerStatus: true,
          cashDrawerStatus: true,
          ticketStock: true,
          paperStock: true,
          createdAt: true,
        },
      },
      _count: {
        select: { transactions: true, alerts: true },
      },
    },
    orderBy: { deviceName: 'asc' },
  });

  const healthService = createHealthService(prisma);

  const kiosksWithUptime = await Promise.all(
    kiosks.map(async (kiosk) => {
      const uptime = await healthService.calculateUptime(kiosk.id, 24);
      const unacknowledgedAlerts = await prisma.kioskAlert.count({
        where: { kioskId: kiosk.id, acknowledged: false },
      });
      return {
        ...kiosk,
        uptimePercentage: uptime.uptimePercentage,
        unacknowledgedAlerts,
      };
    })
  );

  const onlineKiosks = kiosksWithUptime.filter((k) => k.status === KioskStatus.ONLINE).length;
  const offlineKiosks = kiosksWithUptime.filter((k) => k.status === KioskStatus.OFFLINE).length;
  const maintenanceKiosks = kiosksWithUptime.filter((k) => k.status === KioskStatus.MAINTENANCE).length;

  res.json({
    success: true,
    data: {
      kiosks: kiosksWithUptime,
      summary: {
        total: kiosksWithUptime.length,
        online: onlineKiosks,
        offline: offlineKiosks,
        maintenance: maintenanceKiosks,
      },
    },
  });
}));

/**
 * Solicita a Gemini recomendaciones basadas en los productos actuales en el carrito
 * POST /api/kiosks/recommendations
 */
router.post('/recommendations', asyncHandler(async (req, res) => {
  const prisma = req.prisma as PrismaClient;
  const { cartProducts } = req.body;
  const deviceKey = req.headers['x-device-key'] as string;

  if (!deviceKey) {
    throw new HttpError('X-Device-Key requerido', 401);
  }

  const kiosk = await prisma.kioskDevice.findUnique({
    where: { deviceKey },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco inválido', 401);
  }

  if (!Array.isArray(cartProducts) || cartProducts.length === 0) {
    return res.json({ success: true, data: { recommendations: [], message: 'Carrito vacío' } });
  }

  const availableProducts = await prisma.product.findMany({
    where: { storeId: kiosk.storeId, active: true },
    select: { id: true, name: true, price: true, category: true }
  });

  if (availableProducts.length === 0) {
    return res.json({
      success: true,
      data: { recommendations: [], message: 'No hay productos disponibles' }
    });
  }

  try {
    const recommendations = await generateRecommendations(
      cartProducts.map((p: any) => ({
        id: p.productId,
        name: p.productName || p.name,
        price: Number(p.price),
        category: p.category
      })),
      availableProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        category: p.category || undefined
      }))
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.geminiError('Error generating kiosk recommendations', error, {
      endpoint: 'POST /kiosks/recommendations',
      storeId: kiosk.storeId,
      deviceKey: kiosk.deviceKey,
      cartProductsCount: cartProducts?.length || 0,
    });
    // Silent fail if AI goes down (we don't want to crash the kiosk checkout)
    res.json({
      success: true,
      data: { recommendations: [], message: 'AI temporalmente no disponible' }
    });
  }
}));

export default router;

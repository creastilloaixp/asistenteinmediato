import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { 
  getVapidPublicKey, 
  isPushConfigured,
  sendPushNotification,
  sendSaleNotification,
  sendLowStockAlert,
  sendDailySummary,
  validateSubscription,
  type PushNotification
} from '../services/pushNotifications.js';

const router = Router();

router.get('/status', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const subscriptionCount = await prisma.pushSubscription.count({
    where: { storeId, active: true }
  });

  res.json({
    success: true,
    data: {
      configured: isPushConfigured(),
      publicKey: getVapidPublicKey(),
      subscriptionCount,
    },
  });
}));

router.get('/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  
  if (!publicKey) {
    return res.json({
      success: true,
      data: { publicKey: null },
    });
  }

  res.json({
    success: true,
    data: { publicKey },
  });
});

router.post('/subscribe', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { subscription } = req.body;
  const storeId = req.user!.storeId!;
  const userId = req.user!.id;

  if (!validateSubscription(subscription)) {
    throw new HttpError('Suscripción inválida', 400);
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: subscription.endpoint }
  });

  if (existing) {
    await prisma.pushSubscription.update({
      where: { endpoint: subscription.endpoint },
      data: { active: true, storeId, userId }
    });
  } else {
    await prisma.pushSubscription.create({
      data: {
        storeId,
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    });
  }

  sendPushNotification(subscription, {
    title: '🔔 Notificaciones Activadas',
    body: 'Recibirás alertas de ventas y stock bajo',
    tag: 'welcome',
  });

  res.json({
    success: true,
    message: 'Suscripción activada',
  });
}));

router.post('/unsubscribe', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { endpoint } = req.body;
  const storeId = req.user!.storeId!;

  await prisma.pushSubscription.updateMany({
    where: { endpoint, storeId },
    data: { active: false }
  });

  res.json({
    success: true,
    message: 'Suscripción desactivada',
  });
}));

router.post('/test', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { storeId, active: true }
  });

  if (subscriptions.length === 0) {
    return res.json({
      success: false,
      error: 'No hay suscripciones activas',
    });
  }

  let sent = 0;
  for (const sub of subscriptions) {
    const success = await sendPushNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }, {
      title: '🧪 Prueba de Notificación',
      body: 'Las notificaciones están funcionando correctamente',
      tag: 'test',
    });
    if (success) sent++;
  }

  res.json({
    success: true,
    data: { sent, total: subscriptions.length },
  });
}));

router.post('/test-sale', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { storeId, active: true }
  });

  if (subscriptions.length === 0) {
    return res.json({
      success: false,
      error: 'No hay suscripciones activas',
    });
  }

  let sent = 0;
  for (const sub of subscriptions) {
    const success = await sendSaleNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }, {
      total: 150.50,
      paymentMethod: 'CARD',
      items: 3,
      storeName: 'Mi Tienda'
    });
    if (success) sent++;
  }

  res.json({
    success: true,
    data: { sent, total: subscriptions.length },
  });
}));

router.post('/test-low-stock', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const storeId = req.user!.storeId!;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { storeId, active: true }
  });

  if (subscriptions.length === 0) {
    return res.json({
      success: false,
      error: 'No hay suscripciones activas',
    });
  }

  let sent = 0;
  for (const sub of subscriptions) {
    const success = await sendLowStockAlert({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }, {
      productName: 'Refresco Cola 600ml',
      currentStock: 3,
      storeName: 'Mi Tienda'
    });
    if (success) sent++;
  }

  res.json({
    success: true,
    data: { sent, total: subscriptions.length },
  });
}));

export async function sendPushToStore(
  storeId: string,
  notification: PushNotification
) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { storeId, active: true }
  });

  for (const sub of subscriptions) {
    await sendPushNotification({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    }, notification);
  }

  await prisma.$disconnect();
}

export default router;

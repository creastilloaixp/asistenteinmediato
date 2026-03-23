import { Router } from 'express';
import express from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { createQRPayment, createInStoreQROrder, getPaymentStatus, isMercadoPagoConfigured, generateExternalReference } from '../services/mercadopago.js';
import { createPaymentIntent, isStripeConfigured } from '../services/stripe.js';
import { PaymentMethod, TransactionStatus, PrismaClient } from '@prisma/client';
import { createActivityLog } from '../services/activityLog.js';
import { wsService } from '../services/websocket.js';
import { sendPushToStore } from './pushNotifications.js';

const router = Router();

/**
 * Calcula el cambio para pagos en efectivo
 * POST /api/payments/cash/calculate-change
 */
router.post('/cash/calculate-change', requireStore, asyncHandler(async (req, res) => {
  const { total, received } = req.body;

  if (total === undefined || received === undefined) {
    throw new HttpError('Total y cantidad recibida son requeridos', 400);
  }

  const change = Number(received) - Number(total);

  if (change < 0) {
    throw new HttpError('Cantidad insuficiente', 400);
  }

  res.json({
    success: true,
    data: {
      total: Number(total),
      received: Number(received),
      change,
    },
  });
}));

/**
 * Crea un código QR o voucher de Mercado Pago para pago presencial
 * POST /api/payments/mercadopago/create
 */
router.post('/mercadopago/create', requireStore, asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const storeId = (req as any).storeId;

  if (!isMercadoPagoConfigured()) {
    throw new HttpError('Mercado Pago no está configurado', 500);
  }

  if (!amount || amount <= 0) {
    throw new HttpError('Monto inválido', 400);
  }

  const externalReference = generateExternalReference();

  try {
    const payment = await createQRPayment({
      amount: Number(amount),
      description: description || 'Pago en tienda',
      externalReference,
      // notificationUrl no está en el tipo CreateOrderOptions
    });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error in Mercado Pago basic QR, trying In-Store QR:', error);
    try {
      const order = await createInStoreQROrder({
        amount: Number(amount),
        description: description || 'Pago en tienda',
        externalReference,
        posId: 'POS001'
      });

      res.json({
        success: true,
        data: order,
      });
    } catch (innerError) {
      console.error('In-Store QR error:', innerError);
      throw new HttpError('Error creando pago en Mercado Pago', 500);
    }
  }
}));

/**
 * Consulta el estado de un pago de Mercado Pago
 * GET /api/payments/mercadopago/status/:paymentId
 */
router.get('/mercadopago/status/:paymentId', requireStore, asyncHandler(async (req, res) => {
  const paymentId = req.params.paymentId as string;

  if (!isMercadoPagoConfigured()) {
    throw new HttpError('Mercado Pago no está configurado', 500);
  }

  const status = await getPaymentStatus(paymentId);

  if (!status) {
    throw new HttpError('Pago no encontrado', 404);
  }

  res.json({
    success: true,
    data: status,
  });
}));

/**
 * Crea una intención de pago con Stripe
 * POST /api/payments/stripe/create-intent
 */
router.post('/stripe/create-intent', requireStore, asyncHandler(async (req, res) => {
  const { amount, currency, description, metadata } = req.body;
  const storeId = (req as any).storeId;

  if (!isStripeConfigured()) {
    throw new HttpError('Stripe no está configurado', 500);
  }

  if (!amount || amount <= 0) {
    throw new HttpError('Monto inválido', 400);
  }

  try {
    const result = await createPaymentIntent({
      amount: Number(amount),
      currency: currency || 'mxn',
      description: description || 'Pago en tienda',
      metadata: {
        ...metadata,
        storeId,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error creando Stripe PaymentIntent:', error);
    throw new HttpError('Error procesando pago con Stripe', 500);
  }
}));

/**
 * Obtiene el estado de las integraciones de pago
 * GET /api/payments/status
 */
router.get('/status', requireStore, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      mercadopago: isMercadoPagoConfigured(),
      stripe: isStripeConfigured(),
    },
  });
}));

/**
 * Webhook de Stripe para confirmar pagos
 * POST /api/payments/stripe/webhook
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const { constructWebhookEvent } = await import('../services/stripe.js');
  const prisma = new PrismaClient();
  
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    const event = await constructWebhookEvent(req.body, sig);
    
    if (!event) {
      res.status(400).send('Webhook signature verification failed');
      return;
    }
    
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const transactionId = paymentIntent.metadata?.transactionId;
        
        if (transactionId) {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: TransactionStatus.COMPLETED },
          });
          
          const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { kiosk: true, items: true },
          });
          
          if (transaction) {
            wsService.broadcastToStore(transaction.storeId, 'TRANSACTION_COMPLETED' as any, {
              transaction,
            });
            
            await createActivityLog({
              storeId: transaction.storeId,
              type: 'TRANSACTION_COMPLETED',
              action: `Pago con tarjeta completado`,
              entityType: 'Transaction',
              entityId: transaction.id,
              details: { total: transaction.total, paymentMethod: 'CARD' },
            });
          }
        }
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const transactionId = paymentIntent.metadata?.transactionId;
        
        if (transactionId) {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: { status: TransactionStatus.CANCELLED },
          });
        }
        break;
      }
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    res.status(400).send(`Webhook Error`);
  } finally {
    await prisma.$disconnect();
  }
}));

/**
 * Confirma manualmente un pago con tarjeta (para testing)
 * POST /api/payments/stripe/confirm
 */
router.post('/stripe/confirm', requireStore, asyncHandler(async (req, res) => {
  const prisma = new PrismaClient();
  const { transactionId, paymentIntentId } = req.body;
  
  if (!transactionId) {
    throw new HttpError('transactionId es requerido', 400);
  }
  
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  
  if (!transaction) {
    throw new HttpError('Transacción no encontrada', 404);
  }
  
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: TransactionStatus.COMPLETED },
  });
  
  await createActivityLog({
    storeId: transaction.storeId,
    type: 'TRANSACTION_COMPLETED',
    action: `Pago con tarjeta completado (manual)`,
    entityType: 'Transaction',
    entityId: transaction.id,
    details: { total: transaction.total, paymentMethod: 'CARD', paymentIntentId },
  });
  
  await prisma.$disconnect();
  
  res.json({ success: true, data: { status: 'COMPLETED' } });
}));

export default router;
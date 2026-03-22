import { Router } from 'express';
import { PaymentMethod, TransactionStatus } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { createOXXOPayment, isMercadoPagoConfigured } from '../services/mercadopago.js';
import { createPaymentIntent, isStripeConfigured } from '../services/stripe.js';
import { createActivityLog } from '../services/activityLog.js';
import { wsService } from '../services/websocket.js';
import { sendPushToStore } from './pushNotifications.js';

const router = Router();

router.use(asyncHandler(async (req, res, next) => {
  const deviceKey = req.headers['x-device-key'] || req.query.deviceKey;
  
  if (!deviceKey) {
    throw new HttpError('Device key requerido', 401);
  }

  const kiosk = await req.prisma.kioskDevice.findUnique({
    where: { deviceKey: String(deviceKey) },
    include: { store: true },
  });

  if (!kiosk) {
    throw new HttpError('Kiosco no encontrado', 401);
  }

  (req as any).kiosk = kiosk;
  (req as any).storeId = kiosk.storeId;
  next();
}));

router.post('/', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { items, paymentMethod } = req.body;
  const storeId = (req as any).storeId;
  const kioskId = (req as any).kiosk.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new HttpError('Items es requerido', 400);
  }

  if (!paymentMethod) {
    throw new HttpError('PaymentMethod es requerido', 400);
  }

  let subtotal = 0;
  const transactionItems: any[] = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, storeId, active: true },
    });

    if (!product) {
      throw new HttpError(`Producto ${item.productId} no encontrado`, 404);
    }

    if (product.stock < item.quantity) {
      throw new HttpError(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`, 400);
    }

    const itemSubtotal = Number(product.price) * item.quantity;
    subtotal += itemSubtotal;

    transactionItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: itemSubtotal,
    });
  }

  const total = subtotal;

  const transaction = await prisma.transaction.create({
    data: {
      storeId,
      kioskId,
      items: { create: transactionItems },
      subtotal,
      tax: 0,
      total,
      paymentMethod: paymentMethod as PaymentMethod,
      status: TransactionStatus.PENDING,
    },
    include: { items: true },
  });

  await createActivityLog({
    storeId,
    type: 'TRANSACTION_CREATED',
    action: `Nueva transacción ${paymentMethod} por $${Number(total).toFixed(2)}`,
    entityType: 'Transaction',
    entityId: transaction.id,
    details: { total, paymentMethod, itemCount: items.length },
  });

  res.status(201).json({ success: true, data: { transaction } });
}));

router.post('/:id/complete', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { paymentReference, cashReceived, changeGiven } = req.body;
  const storeId = (req as any).storeId;

  const transaction = await prisma.transaction.findFirst({
    where: { id, storeId },
    include: { items: true },
  });

  if (!transaction) {
    throw new HttpError('Transacción no encontrada', 404);
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new HttpError('La transacción ya fue procesada', 400);
  }

  for (const item of transaction.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (product) {
      const newStock = product.stock - item.quantity;
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      if (newStock <= product.lowStockThreshold && newStock >= 0) {
        await createActivityLog({
          storeId,
          type: 'PRODUCT_LOW_STOCK',
          action: `Stock bajo: ${product.name} (${newStock} restantes)`,
          entityType: 'Product',
          entityId: product.id,
          details: {
            productName: product.name,
            currentStock: newStock,
            threshold: product.lowStockThreshold,
          },
        });

        wsService.emitLowStockAlert(storeId, {
          productId: product.id,
          productName: product.name,
          currentStock: newStock,
          threshold: product.lowStockThreshold,
        });

        sendPushToStore(storeId, {
          title: '⚠️ Stock Bajo',
          body: `${product.name}: solo ${newStock} unidades`,
          tag: 'low_stock',
          data: { productId: product.id },
        });
      }
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      status: TransactionStatus.COMPLETED,
      paymentReference,
      cashReceived: cashReceived ? Number(cashReceived) : null,
      changeGiven: changeGiven ? Number(changeGiven) : null,
      completedAt: new Date(),
    },
    include: { items: true },
  });

  await createActivityLog({
    storeId,
    type: 'TRANSACTION_COMPLETED',
    action: `Transacción completada por $${Number(updated.total).toFixed(2)}`,
    entityType: 'Transaction',
    entityId: updated.id,
    details: { total: updated.total, paymentMethod: updated.paymentMethod, paymentReference },
  });

  res.json({ success: true, data: { transaction: updated } });
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = (req as any).storeId;

  const transaction = await prisma.transaction.findFirst({
    where: { id, storeId },
  });

  if (!transaction) {
    throw new HttpError('Transacción no encontrada', 404);
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new HttpError('La transacción no puede ser cancelada', 400);
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      status: TransactionStatus.CANCELLED,
      completedAt: new Date(),
    },
  });

  await createActivityLog({
    storeId,
    type: 'TRANSACTION_CANCELLED',
    action: `Transacción cancelada por $${Number(updated.total).toFixed(2)}`,
    entityType: 'Transaction',
    entityId: updated.id,
    details: { total: updated.total, paymentMethod: updated.paymentMethod },
  });

  res.json({ success: true, data: { transaction: updated } });
}));

router.post('/mercadopago/create', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { amount, description } = req.body;
  const storeId = (req as any).storeId;
  const kioskId = (req as any).kiosk.id;

  if (!isMercadoPagoConfigured()) {
    throw new HttpError('Mercado Pago no está configurado', 500);
  }

  if (!amount || amount <= 0) {
    throw new HttpError('Monto inválido', 400);
  }

  const transactionId = `MP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const payment = await createOXXOPayment({
    amount: Number(amount),
    description: description || 'Pago AutoCobro',
    externalReference: transactionId,
    notificationUrl: `https://autocobro.com/api/payments/mercadopago/webhook`,
  });

  const transaction = await prisma.transaction.create({
    data: {
      storeId,
      kioskId,
      items: { create: [] },
      subtotal: Number(amount),
      tax: 0,
      total: Number(amount),
      paymentMethod: 'MERCADOPAGO' as PaymentMethod,
      status: TransactionStatus.PENDING,
      paymentReference: payment.id,
    },
  });

  await createActivityLog({
    storeId,
    type: 'TRANSACTION_CREATED',
    action: `Creado pago OXXO Mercado Pago por $${Number(amount).toFixed(2)}`,
    entityType: 'Transaction',
    entityId: transaction.id,
    details: { total: amount, paymentMethod: 'MERCADOPAGO', paymentId: payment.id },
  });

  res.json({
    success: true,
    data: {
      transactionId: transaction.id,
      paymentId: payment.id,
      qrCode: payment.qrCode,
      barcode: payment.qrCodeBase64,
      externalReference: payment.externalReference,
      status: payment.status,
    },
  });
}));

router.post('/stripe/create-intent', asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const storeId = (req as any).storeId;
  const kioskId = (req as any).kiosk.id;

  if (!isStripeConfigured()) {
    throw new HttpError('Stripe no está configurado. Agrega STRIPE_SECRET_KEY a .env', 500);
  }

  if (!amount || amount <= 0) {
    throw new HttpError('Monto inválido', 400);
  }

  const transactionId = `STRIPE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const result = await createPaymentIntent({
      amount: Number(amount),
      currency: 'mxn',
      description: description || 'Pago AutoCobro',
      metadata: {
        transactionId,
        storeId,
        kioskId,
      },
    });

    res.json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Stripe error:', error);
    throw new HttpError(`Error creando PaymentIntent: ${(error as Error).message}`, 500);
  }
}));

export default router;

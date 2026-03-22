import { Router } from 'express';
import { Prisma, PaymentMethod, TransactionStatus } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { wsService } from '../services/websocket.js';

const router = Router();

router.get('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { startDate, endDate, status, paymentMethod, page = 1, limit = 50 } = req.query;
  const storeId = req.user!.storeId!;

  const where: Prisma.TransactionWhereInput = { storeId };

  if (status) {
    where.status = status as TransactionStatus;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod as PaymentMethod;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(String(startDate));
    }
    if (endDate) {
      where.createdAt.lte = new Date(String(endDate));
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        items: true,
        kiosk: { select: { deviceName: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    },
  });
}));

router.get('/stats', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { startDate, endDate } = req.query;
  const storeId = req.user!.storeId!;

  const where: Prisma.TransactionWhereInput = {
    storeId,
    status: TransactionStatus.COMPLETED,
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(String(startDate));
    }
    if (endDate) {
      where.createdAt.lte = new Date(String(endDate));
    }
  }

  const [transactions, countResult] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: {
        total: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
  const salesByPayment = transactions.reduce((acc, t) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + Number(t.total);
    return acc;
  }, {} as Record<string, number>);

  res.json({
    success: true,
    data: {
      totalTransactions: countResult,
      totalSales,
      averageTicket: countResult > 0 ? totalSales / countResult : 0,
      salesByPayment,
    },
  });
}));

router.get('/:id', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

  const transaction = await prisma.transaction.findFirst({
    where: { id, storeId },
    include: {
      items: { include: { product: true } },
      kiosk: { select: { deviceName: true } },
    },
  });

  if (!transaction) {
    throw new HttpError('Transacción no encontrada', 404);
  }

  res.json({ success: true, data: { transaction } });
}));

router.post('/', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { items, kioskId, paymentMethod } = req.body;
  const storeId = req.user!.storeId!;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new HttpError('Items es requerido y debe ser un array no vacío', 400);
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

  const tax = 0;
  const total = subtotal + tax;

  const transaction = await prisma.transaction.create({
    data: {
      storeId,
      kioskId,
      items: { create: transactionItems },
      subtotal,
      tax,
      total,
      paymentMethod: paymentMethod as PaymentMethod,
      status: TransactionStatus.PENDING,
    },
    include: {
      items: true,
    },
  });

  res.status(201).json({ success: true, data: { transaction } });
}));

router.post('/:id/complete', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const { paymentReference, cashReceived, changeGiven } = req.body;
  const storeId = req.user!.storeId!;

  const transaction = await prisma.transaction.findFirst({
    where: { id, storeId },
  });

  if (!transaction) {
    throw new HttpError('Transacción no encontrada', 404);
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    throw new HttpError('La transacción ya fue procesada', 400);
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
    include: { items: true, kiosk: { select: { deviceName: true } } },
  });

  wsService.emitNewTransaction(storeId, updated);

  res.json({ success: true, data: { transaction: updated } });
}));

router.post('/:id/cancel', requireStore, asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { id } = req.params;
  const storeId = req.user!.storeId!;

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

  res.json({ success: true, data: { transaction: updated } });
}));

export default router;

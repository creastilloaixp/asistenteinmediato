import { Router } from 'express';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { PaymentMethod, TransactionStatus } from '@prisma/client';
import { 
  isTerminalConfigured, 
  getTerminalProvider,
  getTerminalStatus,
  processTerminalPayment,
  cancelTerminalPayment,
  type TerminalProvider
} from '../services/terminal.js';
import { createActivityLog } from '../services/activityLog.js';
import { wsService } from '../services/websocket.js';

const router = Router();

router.get('/status', asyncHandler(async (req, res) => {
  const status = await getTerminalStatus();
  
  res.json({
    success: true,
    data: {
      configured: isTerminalConfigured(),
      provider: getTerminalProvider(),
      status,
    },
  });
}));

router.post('/init', asyncHandler(async (req, res) => {
  if (!isTerminalConfigured()) {
    throw new HttpError('Terminal no está configurado. Configura TERMINAL_PROVIDER en .env', 500);
  }

  const status = await getTerminalStatus();
  
  res.json({
    success: true,
    data: {
      initialized: true,
      status,
    },
  });
}));

router.post('/process-payment', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { amount, transactionId, description } = req.body;

  if (!isTerminalConfigured()) {
    throw new HttpError('Terminal no está configurado', 500);
  }

  if (!amount || amount <= 0) {
    throw new HttpError('Monto inválido', 400);
  }

  const transaction = transactionId 
    ? await prisma.transaction.findUnique({ where: { id: transactionId } })
    : null;

  const storeId = (req as any).storeId || transaction?.storeId;
  const kioskId = (req as any).kiosk?.id || transaction?.kioskId;

  let newTransaction = transaction;
  if (!newTransaction && amount) {
    newTransaction = await prisma.transaction.create({
      data: {
        storeId: storeId || 'SYSTEM',
        kioskId: kioskId || null,
        items: { create: [] },
        subtotal: amount,
        tax: 0,
        total: amount,
        paymentMethod: 'CARD' as PaymentMethod,
        status: TransactionStatus.PENDING,
      },
    });
  }

  const result = await processTerminalPayment({
    amount,
    transactionId: newTransaction?.id || `TERMINAL-${Date.now()}`,
    description: description || 'Pago con terminal',
  });

  if (result.success) {
    const updated = await prisma.transaction.update({
      where: { id: newTransaction!.id },
      data: {
        status: TransactionStatus.COMPLETED,
        paymentMethod: 'CARD' as PaymentMethod,
        paymentReference: result.paymentReference,
        completedAt: new Date(),
      },
      include: { items: true },
    });

    if (storeId) {
      await createActivityLog({
        storeId,
        type: 'PAYMENT_RECEIVED',
        action: `Pago con terminal aprobado: $${amount}`,
        entityType: 'Transaction',
        entityId: updated.id,
        details: {
          amount,
          provider: result.provider,
          paymentReference: result.paymentReference,
        },
      });

      wsService.emitPaymentCompleted(storeId, updated);
    }

    res.json({
      success: true,
      data: {
        transaction: updated,
        paymentReference: result.paymentReference,
        provider: result.provider,
      },
    });
  } else {
    if (newTransaction) {
      await prisma.transaction.update({
        where: { id: newTransaction.id },
        data: {
          status: TransactionStatus.FAILED,
          paymentReference: result.paymentReference,
        },
      });
    }

    res.json({
      success: false,
      error: result.error,
      provider: result.provider,
    });
  }
}));

router.post('/cancel', asyncHandler(async (req, res) => {
  const { paymentReference } = req.body;

  if (!paymentReference) {
    throw new HttpError('Payment reference requerido', 400);
  }

  const cancelled = await cancelTerminalPayment(paymentReference);

  res.json({
    success: cancelled,
    message: cancelled ? 'Pago cancelado' : 'Error cancelando pago',
  });
}));

router.post('/connect-simulator', asyncHandler(async (req, res) => {
  const { provider } = req.body;

  if (provider === 'simulator') {
    const { setTerminalProvider } = await import('../services/terminal.js');
    setTerminalProvider('simulator');
  }

  const status = await getTerminalStatus();

  res.json({
    success: true,
    data: { status },
  });
}));

export default router;

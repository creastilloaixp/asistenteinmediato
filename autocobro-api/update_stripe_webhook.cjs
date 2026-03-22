import { Router } from 'express';
import express from 'express';
import { TransactionStatus, PaymentMethod, PrismaClient } from '@prisma/client';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { createPaymentIntent, isStripeConfigured } from '../services/stripe.js';
import { wsService } from '../services/websocket.js';
import { createActivityLog } from '../services/activityLog.js';
import { createOXXOPayment, isMercadoPagoConfigured } from '../services/mercadopago.js';

// Usamos el código de webhook base desde el que ya compila
const fs = require('fs');
const data = fs.readFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', 'utf-8');

const stripeWebhookStr = `

/**
 * Webhook de Stripe (Para recibir pagos completados)
 */
router.post('/stripe/webhook', express.raw({type: 'application/json'}), asyncHandler(async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const prisma = req.prisma as PrismaClient;
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: any) {
    console.error(\`Webhook Stripe Error: \${err.message}\`);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  // Manejar el evento cuando el pago es exitoso
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // El transactionId se envía dentro de la metadata cuando el Kiosco crea el intento
    const transactionId = paymentIntent.metadata?.transactionId;

    if (transactionId) {
      // Buscar la transacción
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { store: true, items: true },
      });

      if (transaction && transaction.status === 'PENDING') {
        
        // 1. Descontar Inventario
        for (const item of transaction.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stock: { decrement: item.quantity }
              }
            }).catch(err => console.error(\`Error updating stock for product \${item.productId}:\`, err));
          }
        }

        // 2. Marcar como Completado
        const updated = await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'COMPLETED',
            paymentMethod: 'STRIPE',
            paymentReference: paymentIntent.id,
            completedAt: new Date(),
          },
          include: { items: true }
        });

        // 3. Crear Log de Actividad
        await createActivityLog({
          storeId: transaction.storeId,
          type: 'TRANSACTION_COMPLETED',
          action: \`Pago Stripe aprobado - $\${paymentIntent.amount / 100}\`,
          entityType: 'Transaction',
          entityId: transaction.id,
          details: {
            paymentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            paymentMethod: 'stripe',
          },
        });

        // 4. Notificar a Admin por WebSocket
        wsService.broadcastToStore(transaction.storeId, {
          event: 'NEW_TRANSACTION',
          payload: {
            ...updated,
            items: updated.items.map(item => ({
              ...item,
              unitPrice: item.unitPrice.toString(),
              subtotal: item.subtotal.toString()
            }))
          },
          timestamp: new Date().toISOString()
        });

        console.log(\`Stripe webhook success: Tx \${transaction.id} paid\`);
      }
    }
  }

  res.json({ received: true });
}));

export default router;`;

fs.writeFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', data.replace('export default router;', stripeWebhookStr));

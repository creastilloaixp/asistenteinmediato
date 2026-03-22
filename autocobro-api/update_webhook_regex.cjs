const fs = require('fs');

const data = fs.readFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', 'utf-8');

const webhookRegex = /router\.post\('\/mercadopago\/webhook', asyncHandler\(async \(req, res\) => {[\s\S]*?res\.json\({ success: true }\);\n}\)\);/;

const newWebhookLogic = `router.post('/mercadopago/webhook', asyncHandler(async (req, res) => {
  const prisma = req.prisma;
  const { type, data } = req.body;

  if (type !== 'payment') {
    return res.json({ success: true, message: 'Ignored - not a payment notification' });
  }

  const paymentId = data?.id;
  if (!paymentId) {
    throw new HttpError('Payment ID requerido', 400);
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const response = await fetch(\`https://api.mercadopago.com/v1/payments/\${paymentId}\`, {
    headers: { 'Authorization': \`Bearer \${accessToken}\` },
  });

  if (!response.ok) {
    throw new HttpError('Error verificando pago en Mercado Pago', 500);
  }

  const payment = await response.json() as { 
    status: string; 
    external_reference: string; 
    transaction_amount: number;
    payment_method_id?: string;
  };
  
  const externalRef = payment.external_reference;

  const transaction = await prisma.transaction.findUnique({
    where: { id: externalRef },
    include: { store: true, items: true },
  });

  if (!transaction) {
    console.log(\`Transaction \${externalRef} not found\`);
    return res.json({ success: true, message: 'Transaction not found' });
  }

  if (transaction.status === 'COMPLETED') {
    console.log(\`Transaction \${externalRef} already completed, ignoring duplicate\`);
    return res.json({ success: true, message: 'Already processed' });
  }

  if (payment.status === 'approved') {
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
      where: { id: externalRef },
      data: {
        status: 'COMPLETED' as TransactionStatus,
        paymentMethod: 'MERCADOPAGO' as PaymentMethod,
        paymentReference: paymentId.toString(),
        completedAt: new Date(),
      },
      include: { items: true }
    });

    // 3. Crear Log de Actividad
    await createActivityLog({
      storeId: transaction.storeId,
      type: 'TRANSACTION_COMPLETED',
      action: \`Pago Mercado Pago aprobado - $\${payment.transaction_amount}\`,
      entityType: 'Transaction',
      entityId: transaction.id,
      details: {
        paymentId: paymentId.toString(),
        amount: payment.transaction_amount,
        paymentMethod: payment.payment_method_id || 'mercadopago',
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

    try {
      await sendPushToStore(transaction.storeId, 'Pago recibido', \`Mercado Pago: $\${payment.transaction_amount}\`);
    } catch (e) {
      console.error('Error sending push:', e);
    }

    // 5. Alertas de inventario
    for (const item of updated.items) {
      if (item.productId) {
        const prod = await prisma.product.findUnique({ where: { id: item.productId } });
        if (prod && prod.stock <= 5) {
          wsService.broadcastToStore(transaction.storeId, {
             event: 'LOW_STOCK_ALERT',
             payload: {
               productId: prod.id,
               productName: prod.name,
               stock: prod.stock
             },
             timestamp: new Date().toISOString()
          });
          
          await createActivityLog({
            storeId: transaction.storeId,
            type: 'PRODUCT_UPDATED',
            action: \`¡Alerta de inventario bajo! Quedan \${prod.stock} de \${prod.name}\`,
            entityType: 'Product',
            entityId: prod.id,
            details: { stock: prod.stock }
          });
        }
      }
    }

    console.log(\`Mercado Pago webhook success: Tx \${transaction.id} paid\`);
  }

  res.json({ success: true });
}));`;

const newData = data.replace(webhookRegex, newWebhookLogic);
fs.writeFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', newData);

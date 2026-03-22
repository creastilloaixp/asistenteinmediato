const fs = require('fs');

const data = fs.readFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', 'utf-8');

const newWebhookLogic = `
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
        }
      }
    }

    console.log(\`Mercado Pago webhook success: Tx \${transaction.id} paid\`);
  }

  res.json({ success: true });
}));`;

const lines = data.split('\n');
const start = lines.findIndex(l => l.includes('if (payment.status === \'approved\') {'));
const end = lines.findIndex((l, idx) => idx > start && l.includes('res.json({ success: true });'));

lines.splice(start, end - start + 2, newWebhookLogic);

fs.writeFileSync('C:/Users/carlo/OneDrive/Escritorio/AsistenteInmediato/autocobro-api/src/routes/payments.ts', lines.join('\n'));

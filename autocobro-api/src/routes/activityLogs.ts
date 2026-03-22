import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireStore } from '../middleware/auth.js';
import { getActivityLogs, getActivityStats, getActivityIcon, getActivityColor } from '../services/activityLog.js';

const router = Router();

router.get('/', requireStore, asyncHandler(async (req, res) => {
  const storeId = req.user!.storeId!;
  const { 
    limit = '50', 
    offset = '0', 
    type,
    userId,
    dateFrom,
    dateTo 
  } = req.query;

  const { logs, total } = await getActivityLogs(storeId, {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
    type: type as any,
    userId: userId as string,
    dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
    dateTo: dateTo ? new Date(dateTo as string) : undefined,
  });

  const logsWithIcons = logs.map(log => ({
    ...log,
    icon: getActivityIcon(log.type as any),
    colorClass: getActivityColor(log.type as any),
  }));

  res.json({
    success: true,
    data: {
      logs: logsWithIcons,
      total,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + logs.length < total,
      },
    },
  });
}));

router.get('/stats', requireStore, asyncHandler(async (req, res) => {
  const storeId = req.user!.storeId!;
  const { days = '7' } = req.query;

  const stats = await getActivityStats(storeId, parseInt(days as string));

  res.json({
    success: true,
    data: stats,
  });
}));

router.get('/types', asyncHandler(async (req, res) => {
  const types = [
    { id: 'USER_LOGIN', label: 'Inicio de sesión', category: 'Usuario' },
    { id: 'USER_LOGOUT', label: 'Cierre de sesión', category: 'Usuario' },
    { id: 'USER_CREATED', label: 'Usuario creado', category: 'Usuario' },
    { id: 'USER_UPDATED', label: 'Usuario actualizado', category: 'Usuario' },
    { id: 'USER_DELETED', label: 'Usuario eliminado', category: 'Usuario' },
    { id: 'PRODUCT_CREATED', label: 'Producto creado', category: 'Producto' },
    { id: 'PRODUCT_UPDATED', label: 'Producto actualizado', category: 'Producto' },
    { id: 'PRODUCT_DELETED', label: 'Producto eliminado', category: 'Producto' },
    { id: 'PRODUCT_LOW_STOCK', label: 'Stock bajo', category: 'Producto' },
    { id: 'TRANSACTION_CREATED', label: 'Transacción creada', category: 'Transacción' },
    { id: 'TRANSACTION_COMPLETED', label: 'Transacción completada', category: 'Transacción' },
    { id: 'TRANSACTION_CANCELLED', label: 'Transacción cancelada', category: 'Transacción' },
    { id: 'TRANSACTION_REFUNDED', label: 'Transacción reembolsada', category: 'Transacción' },
    { id: 'PAYMENT_RECEIVED', label: 'Pago recibido', category: 'Pago' },
    { id: 'KIOSK_ONLINE', label: 'Kiosco en línea', category: 'Kiosco' },
    { id: 'KIOSK_OFFLINE', label: 'Kiosco fuera de línea', category: 'Kiosco' },
    { id: 'KIOSK_ALERT', label: 'Alerta de kiosco', category: 'Kiosco' },
    { id: 'SETTINGS_CHANGED', label: 'Configuración cambiada', category: 'Sistema' },
    { id: 'PLAN_CHANGED', label: 'Plan cambiado', category: 'Sistema' },
    { id: 'EXPORT_DATA', label: 'Datos exportados', category: 'Sistema' },
  ];

  res.json({
    success: true,
    data: types,
  });
}));

export default router;

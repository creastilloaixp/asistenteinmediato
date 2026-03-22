/**
 * Push Notifications Service
 * 
 * Implementación de Web Push API para notificaciones en tiempo real
 * 
 * Configuración requerida en .env:
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (mailto:admin@tudominio.com)
 */

import webpush from 'web-push';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

let isConfigured = false;

export function initializePushNotifications() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey
    );
    isConfigured = true;
    console.log('✅ Push notifications initialized with VAPID');
  } else {
    console.log('⚠️ Push notifications not configured. Set VAPID keys in .env');
    isConfigured = false;
  }
}

export function isPushConfigured(): boolean {
  return isConfigured;
}

export function getVapidPublicKey(): string | null {
  if (!isConfigured) return null;
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  notification: PushNotification
): Promise<boolean> {
  if (!isConfigured) {
    console.log('📱 Push notification skipped (not configured):', notification.title);
    return false;
  }

  try {
    const payload = JSON.stringify({
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/badge-72.png',
        tag: notification.tag || 'default',
        data: notification.data,
        actions: notification.actions,
        vibrate: [200, 100, 200],
        requireInteraction: notification.tag === 'sale' || notification.tag === 'alert',
      },
    });

    await webpush.sendNotification(subscription, payload);
    console.log('📱 Push sent:', notification.title);
    return true;
  } catch (error: any) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('📱 Push subscription expired');
      return false;
    }
    console.error('📱 Push error:', error.message);
    return false;
  }
}

export async function sendSaleNotification(
  subscription: PushSubscription,
  data: {
    total: number;
    paymentMethod: string;
    items: number;
    storeName: string;
  }
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: '💰 ¡Venta Completada!',
    body: `$${data.total.toFixed(2)} - ${data.paymentMethod} (${data.items} productos)`,
    tag: 'sale',
    data: { type: 'sale', ...data },
    actions: [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  });
}

export async function sendLowStockAlert(
  subscription: PushSubscription,
  data: {
    productName: string;
    currentStock: number;
    storeName: string;
  }
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: '⚠️ Stock Bajo',
    body: `${data.productName}: solo ${data.currentStock} unidades`,
    tag: 'alert',
    data: { type: 'low_stock', ...data },
    actions: [
      { action: 'restock', title: 'Reabastecer' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  });
}

export async function sendDailySummary(
  subscription: PushSubscription,
  data: {
    totalSales: number;
    transactionCount: number;
    topProduct: string;
    storeName: string;
  }
): Promise<boolean> {
  return sendPushNotification(subscription, {
    title: '📊 Resumen del Día',
    body: `Ventas: $${data.totalSales.toFixed(2)} | ${data.transactionCount} transacciones | Top: ${data.topProduct}`,
    tag: 'summary',
    data: { type: 'daily_summary', ...data },
  });
}

export function validateSubscription(subscription: any): subscription is PushSubscription {
  return (
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
}

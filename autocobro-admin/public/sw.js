// public/sw.js

self.addEventListener('push', event => {
  if (!event.data) {
    console.log('Push received but no data');
    return;
  }
  
  const data = event.data.json();
  const notification = data.notification;

  const title = notification.title || 'AutoCobro';
  const options = {
    body: notification.body,
    icon: notification.icon || '/icon-192.png',
    badge: notification.badge || '/badge-72.png',
    tag: notification.tag || 'default-tag',
    data: notification.data || {},
    actions: notification.actions || [],
    vibrate: notification.vibrate || [200, 100, 200],
    requireInteraction: notification.requireInteraction || false,
  };

  const promiseChain = self.registration.showNotification(title, options);
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  // Puedes definir URLs específicas para cada acción y tipo de notificación
  let targetUrl = '/'; 

  if (action === 'view') {
    if (data.type === 'sale' && data.transactionId) {
      targetUrl = `/?view=transaction&id=${data.transactionId}`;
    }
  } else if (action === 'restock') {
    if (data.type === 'low_stock' && data.productId) {
      targetUrl = `/?view=product&id=${data.productId}`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window open
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

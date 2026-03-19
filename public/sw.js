/*
 * KNGindica Service Worker
 * Handles background push notifications
 */

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'KNGindica',
      body: event.data.text()
    };
  }

  const title = data.title || 'KNGindica';
  const options = {
    body: data.body || 'Você tem uma nova notificação.',
    icon: '/logo192.png', // Fallback to a default icon
    badge: '/badge.png',  // Fallback to a default badge
    data: data.url || '/',
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Ver agora'
      }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

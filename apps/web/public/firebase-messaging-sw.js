/* Firebase Cloud Messaging service worker (SpareBolt) */
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDS9qFYSsj7bOBwUxoZfNlpQ0facDiTuRk',
  authDomain: 'sparebolt-16c25.firebaseapp.com',
  projectId: 'sparebolt-16c25',
  storageBucket: 'sparebolt-16c25.firebasestorage.app',
  messagingSenderId: '393046900320',
  appId: '1:393046900320:web:907240c429ecd07db10d05',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'SpareBolt';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
    tag: payload.data?.notificationId || payload.data?.orderId || 'sparebolt',
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/notifications';
  if (data.orderId) url = '/orders/' + data.orderId;
  else if (data.link) url = data.link;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

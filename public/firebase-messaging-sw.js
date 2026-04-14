// Firebase Messaging Service Worker
// This runs in the background and displays notifications when the app tab is not focused.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Minimal config — only projectId and apiKey are needed for messaging
firebase.initializeApp({
  apiKey: 'AIzaSyCsLNONMFW3_SOe0BX_HmtRvN39gAV2QME',
  projectId: 'fixly-c4040',
  messagingSenderId: '111396659473',
  appId: '1:111396659473:web:234e43d0c03e33cc4aecb0',
});

const messaging = firebase.messaging();

// Handle background messages (when the tab is not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);

  const title = payload.notification?.title || 'ai-fixly';
  const body = payload.notification?.body || '';
  const data = payload.data || {};

  // Determine the click action URL based on notification type
  let clickUrl = '/';
  if (data.type === 'chat' || data.type === 'selection') {
    clickUrl = `/chat/${data.requestId}`;
  } else if (data.type === 'new_bid') {
    clickUrl = `/request/${data.requestId}`;
  }

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.requestId || 'default',
    data: { url: clickUrl },
    actions: [
      { action: 'open', title: '\u05E4\u05EA\u05D7' },
    ],
  });
});

// Handle notification click — navigate to the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If we have an open tab, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return;
        }
      }
      // Otherwise open a new tab
      return clients.openWindow(url);
    })
  );
});

import { getToken, onMessage } from 'firebase/messaging';
import { api } from '@/lib/api';
import {
  firebaseVapidKey,
  getFirebaseMessaging,
  isFirebaseConfigured,
} from '@/lib/firebase';

const TOKEN_KEY = 'sb_fcm_token';

/**
 * Register FCM web push for the logged-in user.
 * Safe to call repeatedly — no-ops if unsupported / denied / misconfigured.
 */
export async function registerWebPush(): Promise<{
  ok: boolean;
  reason?: string;
  token?: string;
}> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'ssr' };
  }
  if (!isFirebaseConfigured()) {
    return { ok: false, reason: 'firebase-not-configured' };
  }
  if (!firebaseVapidKey?.trim()) {
    console.warn(
      '[SpareBolt] VITE_FIREBASE_VAPID_KEY missing. Add a Web Push certificate key from Firebase Console → Project settings → Cloud Messaging.',
    );
    return { ok: false, reason: 'vapid-missing' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }

  // Must be secure context (https or localhost)
  if (!window.isSecureContext) {
    return { ok: false, reason: 'insecure-context' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission-denied' };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return { ok: false, reason: 'messaging-unavailable' };
  }

  // Use the PWA service worker (vite-plugin-pwa imports FCM handlers via importScripts)
  // Ensure SW is registered first (registerSW in main.tsx)
  const registration = await navigator.serviceWorker.ready;

  let token: string;
  try {
    token = await getToken(messaging, {
      vapidKey: firebaseVapidKey.trim(),
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    console.warn('[SpareBolt] FCM getToken failed', err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'getToken-failed',
    };
  }

  if (!token) {
    return { ok: false, reason: 'empty-token' };
  }

  const prev = localStorage.getItem(TOKEN_KEY);
  if (prev === token) {
    // Still re-register occasionally in case server lost it
    try {
      await api.post('/notifications/push-token', {
        token,
        platform: 'web',
      });
    } catch {
      /* ignore */
    }
    return { ok: true, token };
  }

  try {
    await api.post('/notifications/push-token', {
      token,
      platform: 'web',
    });
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('[SpareBolt] Failed to save push token', err);
    return { ok: false, reason: 'api-register-failed' };
  }

  // Foreground messages → system notification when possible
  onMessage(messaging, (payload) => {
    const title =
      payload.notification?.title || payload.data?.title || 'SpareBolt';
    const body = payload.notification?.body || payload.data?.body || '';
    const link = payload.data?.link;
    if (Notification.permission === 'granted' && body) {
      try {
        const n = new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          tag:
            payload.data?.notificationId ||
            payload.data?.kind ||
            'sparebolt-fg',
          data: payload.data,
        });
        n.onclick = () => {
          window.focus();
          if (link) window.location.href = link;
          else window.location.href = '/notifications';
        };
      } catch {
        /* Safari / focus restrictions */
      }
    }
  });

  return { ok: true, token };
}

export async function unregisterWebPush() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await api.delete('/notifications/push-token', { data: { token } });
  } catch {
    /* ignore */
  }
  localStorage.removeItem(TOKEN_KEY);
}

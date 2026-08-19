import { PushNotifications } from '@capacitor/push-notifications';
import { savePushSubscription, deletePushSubscription, VAPID_PUBLIC_KEY } from './push.functions';
import { isNativeApp, runNative } from './capacitor';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function encodeKey(buf: ArrayBuffer | null) {
  if (!buf) return '';
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isNativeApp()) return true;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushSupported()) return 'unsupported';
  if (isNativeApp()) {
    const perm = await PushNotifications.requestPermissions();
    return perm.receive === 'granted' ? 'granted' : 'denied';
  }
  return Notification.permission;
}

async function registerSW(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  return reg;
}

async function enableWebPush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'Permission denied.' };
  const reg = await registerSW();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh ?? encodeKey(sub.getKey('p256dh'));
  const auth = json.keys?.auth ?? encodeKey(sub.getKey('auth'));
  await savePushSubscription({
    data: {
      endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 500),
    },
  });
  return { ok: true };
}

async function enableNativePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') {
    return { ok: false, reason: 'Permission denied.' };
  }

  // Register with FCM/APNs and forward the native token to our backend.
  await PushNotifications.register();

  const token = await new Promise<string | null>((resolve) => {
    const handler = (event: { value?: string }) => {
      resolve(event.value ?? null);
    };
    PushNotifications.addListener('registration', handler);
    // Timeout in case the event never fires.
    window.setTimeout(() => {
      PushNotifications.removeAllListeners();
      resolve(null);
    }, 10000);
  });

  if (!token) {
    return { ok: false, reason: 'Could not retrieve push token from device.' };
  }

  await savePushSubscription({
    data: {
      endpoint: `capacitor://fcm/${token}`,
      p256dh: token,
      auth: token,
      user_agent: navigator.userAgent.slice(0, 500),
    },
  });

  return { ok: true };
}

export async function enablePush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!pushSupported()) return { ok: false, reason: 'This device does not support push notifications.' };
  if (isNativeApp()) {
    return enableNativePush();
  }
  return enableWebPush();
}

export async function disablePush(): Promise<{ ok: true }> {
  if (isNativeApp()) {
    await runNative(async () => {
      await PushNotifications.removeAllListeners();
      // On native we cannot easily delete the backend token here without the
      // original token; the backend will prune stale tokens on delivery failure.
    });
    return { ok: true };
  }

  if (!pushSupported()) return { ok: true };
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await deletePushSubscription({ data: { endpoint: sub.endpoint } });
    } catch {
      /* ignore */
    }
    await sub.unsubscribe();
  }
  return { ok: true };
}

import { Capacitor } from '@capacitor/core';

/**
 * True when the web app is running inside a Capacitor native shell
 * (iOS or Android). False in the browser / PWA.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Current Capacitor platform name: 'ios', 'android', or 'web'.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Returns the deep-link / universal-link origin for the app.
 * - In native app: the configured app link origin (e.g. https://heytaylor.co.za)
 * - In browser: current window.location.origin
 */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/**
 * Safe helper for running Capacitor-only code. Returns undefined in browser.
 */
export async function runNative<T>(fn: () => Promise<T>): Promise<T | undefined> {
  if (!isNativeApp()) return undefined;
  try {
    return await fn();
  } catch (err) {
    console.warn('[capacitor] native call failed:', err);
    return undefined;
  }
}

/**
 * AppBuild wrapper bridge.
 *
 * The app is loaded by its URL inside the AppBuild mobile shell, which exposes
 * native plugins on `window.AppbuildWrapper`. In a normal browser the global is
 * undefined and every helper here degrades gracefully to web behaviour.
 *
 * The SDK script is loaded once from the root route head.
 */

export type BridgeErrorCode =
  | "USER_CANCELLED"
  | "PLUGIN_NOT_AVAILABLE"
  | "NOT_IMPLEMENTED"
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export interface WrapperCapabilities {
  platform?: "ios" | "android" | string;
  plugins?: Record<string, { available?: boolean } | undefined>;
  [key: string]: unknown;
}

interface PluginProxy {
  [method: string]: (...args: unknown[]) => Promise<any>;
}

export interface AppbuildWrapperSDK {
  ready: Promise<unknown>;
  isReady?: boolean;
  capabilities?: WrapperCapabilities;
  platform?: string;
  push: {
    register: () => Promise<any>;
    [key: string]: (...args: any[]) => Promise<any>;
  };
  camera: {
    getPhoto: (options?: Record<string, unknown>) => Promise<any>;
    [key: string]: (...args: any[]) => Promise<any>;
  };
  plugin: (name: string) => PluginProxy;
}

declare global {
  interface Window {
    AppbuildWrapper?: AppbuildWrapperSDK;
  }
}

/** True when the app is running inside the AppBuild native shell. */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && !!window.AppbuildWrapper;
}

/** Resolves the wrapper SDK once its bridge is ready, or undefined in a browser. */
export async function getWrapper(): Promise<AppbuildWrapperSDK | undefined> {
  if (typeof window === "undefined") return undefined;
  const sdk = window.AppbuildWrapper;
  if (!sdk) return undefined;
  try {
    await sdk.ready;
  } catch {
    return undefined;
  }
  return sdk;
}

/** Current platform: 'ios' | 'android' inside the wrapper, otherwise 'web'. */
export function getPlatform(): "ios" | "android" | "web" {
  const platform =
    (typeof window !== "undefined" &&
      (window.AppbuildWrapper?.capabilities?.platform || window.AppbuildWrapper?.platform)) ||
    "";
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "web";
}

/** True when the wrapper build includes the named native plugin. */
export function pluginAvailable(name: string): boolean {
  if (typeof window === "undefined") return false;
  return !!window.AppbuildWrapper?.capabilities?.plugins?.[name]?.available;
}

/** Typed access to a wrapper plugin proxy; undefined when unavailable. */
export async function getPlugin(name: string): Promise<PluginProxy | undefined> {
  const sdk = await getWrapper();
  if (!sdk) return undefined;
  if (!pluginAvailable(name)) return undefined;
  try {
    return sdk.plugin(name);
  } catch {
    return undefined;
  }
}

/** Returns the app origin (used for deep links / redirects). */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/** Runs native-only code, swallowing bridge errors. Returns undefined in a browser. */
export async function runNative<T>(fn: (sdk: AppbuildWrapperSDK) => Promise<T>): Promise<T | undefined> {
  const sdk = await getWrapper();
  if (!sdk) return undefined;
  try {
    return await fn(sdk);
  } catch (err) {
    console.warn("[appbuild] native call failed:", err);
    return undefined;
  }
}

/** Extracts a BridgeError code when present. */
export function bridgeErrorCode(err: unknown): BridgeErrorCode | undefined {
  const code = (err as { code?: string } | null)?.code;
  return code as BridgeErrorCode | undefined;
}

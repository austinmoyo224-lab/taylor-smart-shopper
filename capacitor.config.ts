import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heytaylor.app',
  appName: 'Hey Taylor',
  webDir: 'dist/client',
  backgroundColor: '#0F1B3D',
  loggingBehavior: 'production',
  server: {
    // Production app loads the live web app; set CAPACITOR_SERVER_URL for local dev testing.
    url: process.env.CAPACITOR_SERVER_URL || "https://heytaylor.co.za",
    cleartext: !!process.env.CAPACITOR_SERVER_URL,
    allowNavigation: ["heytaylor.co.za", "www.heytaylor.co.za", "*.lovable.app"],
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#0F1B3D',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV === 'development',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#0F1B3D',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F1B3D',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heytaylor.app',
  appName: 'Hey Taylor',
  webDir: 'dist',
  backgroundColor: '#0F1B3D',
  loggingBehavior: 'production',
  server: {
    // Allow Capacitor to load from the local dev server during development.
    // In production builds this is ignored and the bundled dist/ assets are used.
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: true,
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

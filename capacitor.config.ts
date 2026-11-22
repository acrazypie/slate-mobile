import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.egenesio.slate',
  appName: 'Slate',
  webDir: 'www',
  plugins: {
    SystemBars: {
      // index.html has viewport-fit=cover; telling Capacitor up front avoids
      // a layout jump and lets new WebViews (>= 140) draw under the bars
      initialViewportFitValueHint: 'cover',
    },
    SplashScreen: {
      // src/native/app.ts hides it once the first screen has rendered
      launchAutoHide: false,
      showSpinner: false,
    },
  },
};

export default config;

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
    LocalNotifications: {
      // Status-bar icon for reminders and notices (android/.../drawable/ic_stat_slate.xml)
      smallIcon: 'ic_stat_slate',
      iconColor: '#6BB6A3',
    },
    SplashScreen: {
      // src/native/app.ts hides it once the first screen has rendered
      launchAutoHide: false,
      showSpinner: false,
    },
  },
};

export default config;

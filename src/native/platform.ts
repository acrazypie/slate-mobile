// Glue between the React app and the native shell (Capacitor): platform
// detection, status bar, splash, haptics, Android back button and app resume.
// Mirrors native/bridge.js in sudoku-app, but typed and bundled.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type Platform = 'ios' | 'android' | 'web';

/**
 * In a desktop browser, `?platform=ios|android` previews the app look
 * (like PREVIEW= in sudoku-app); native calls are then no-ops.
 */
function detectPlatform(): Platform {
  const native = Capacitor.getPlatform();
  if (native === 'ios' || native === 'android') return native;
  const wanted = new URLSearchParams(location.search).get('platform');
  return wanted === 'ios' || wanted === 'android' ? wanted : 'web';
}

export const isNative = Capacitor.isNativePlatform();
export const platform: Platform = detectPlatform();
document.documentElement.dataset.platform = platform;
/** Which platform look the CSS uses: the web preview defaults to the iOS one. */
document.documentElement.dataset.look = platform === 'android' ? 'android' : 'ios';

// Android only, local plugin (android/app/src/main/java/.../WindowBackgroundPlugin.java):
// paints the strips behind the system bars on WebView < 140.
const WindowBackground = registerPlugin<{ setColor(o: { color: string }): Promise<void> }>('WindowBackground');

// ---------------------------------------------------------------------------
// Status bar: light icons on the dark theme, dark icons on the light one.

export function syncStatusBar(dark: boolean) {
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#0a0a0a' : '#fafafa');
  if (!isNative) return;
  StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
  if (platform === 'android') WindowBackground.setColor({ color: dark ? '#0a0a0a' : '#fafafa' }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Splash: hidden once the first screen has painted (with a safety net).

let splashHidden = false;
export function hideSplash(afterHide?: () => void) {
  if (splashHidden) return;
  splashHidden = true;
  if (!isNative) return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      SplashScreen.hide({ fadeOutDuration: 200 })
        .catch(() => {})
        // leaving the splash theme resets bar styles, so apply ours again
        .then(() => setTimeout(() => afterHide?.(), 250));
    }),
  );
}
setTimeout(() => hideSplash(), 4000);

// ---------------------------------------------------------------------------
// Haptics, gated by the user's setting.

let hapticsOn = true;
export function setHapticsEnabled(on: boolean) {
  hapticsOn = on;
}

function haptic(fn: () => Promise<void>) {
  if (!isNative || !hapticsOn) return;
  fn().catch(() => {});
}

export const haptics = {
  /** Selection changes: view switch, day change, toggles. */
  tick: () => haptic(() => Haptics.selectionChanged()),
  /** A sheet opens on a long-ish action, a shift is placed. */
  light: () => haptic(() => Haptics.impact({ style: ImpactStyle.Light })),
  success: () => haptic(() => Haptics.notification({ type: NotificationType.Success })),
  warning: () => haptic(() => Haptics.notification({ type: NotificationType.Warning })),
};

// ---------------------------------------------------------------------------
// Android back button: the topmost registered handler wins (open sheets push
// one each), then the app's root handler, then the app goes to background.

type BackHandler = () => void;
const backStack: BackHandler[] = [];
let rootBack: (() => boolean) | null = null;

/** Registers a back handler (e.g. "close this sheet"). Returns the unregister function. */
export function pushBackHandler(handler: BackHandler): () => void {
  backStack.push(handler);
  return () => {
    const i = backStack.lastIndexOf(handler);
    if (i !== -1) backStack.splice(i, 1);
  };
}

/** Called when no sheet is open; return true if it handled the press (e.g. went back to the calendar tab). */
export function setRootBackHandler(handler: () => boolean) {
  rootBack = handler;
}

export function handleBack() {
  const top = backStack[backStack.length - 1];
  if (top) return top();
  if (rootBack?.()) return;
  if (isNative) App.minimizeApp().catch(() => App.exitApp());
}

if (isNative) {
  App.addListener('backButton', handleBack).catch(() => {});
}

// ---------------------------------------------------------------------------
// Resume: the device calendar may have changed while Slate was in background.

export function onResume(listener: () => void): () => void {
  if (!isNative) {
    const onVisible = () => document.visibilityState === 'visible' && listener();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }
  const handle = App.addListener('resume', listener);
  return () => {
    handle.then((h) => h.remove()).catch(() => {});
  };
}

export async function appVersion(): Promise<string> {
  if (!isNative) return import.meta.env.VITE_APP_VERSION ?? 'dev';
  try {
    const info = await App.getInfo();
    return `${info.version} (${info.build})`;
  } catch {
    return '?';
  }
}

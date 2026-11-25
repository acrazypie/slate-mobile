// The native side of an update: download, checksum and hand the APK to Android's
// installer. The Java code is ApkInstallerPlugin.java. Android only.

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface ApkInstallerPlugin {
  canInstall(): Promise<{ allowed: boolean }>;
  openInstallSettings(): Promise<void>;
  install(options: { url: string; sha256: string; fileName: string }): Promise<{ started: boolean }>;
  addListener(event: 'progress', fn: (p: { received: number; total: number }) => void): Promise<PluginListenerHandle>;
}

export const ApkInstaller = registerPlugin<ApkInstallerPlugin>('ApkInstaller');

// Switches the home-screen icon through the AppIcon plugin (Android:
// AppIconPlugin.java, iOS: AppIconPlugin.swift). On the web it does nothing.

import { registerPlugin } from '@capacitor/core';
import type { AppIconKey } from '../data/schema';
import { isNative, platform } from './platform';

interface AppIconPlugin {
  set(options: { icon: AppIconKey }): Promise<void>;
}

const AppIcon = registerPlugin<AppIconPlugin>('AppIcon');

/** Rejects with a message if the system refuses; the caller keeps the old choice then. */
export async function setAppIcon(icon: AppIconKey): Promise<void> {
  if (!isNative) return;
  await AppIcon.set({ icon });
}

/**
 * On Android, the launcher entry follows the setting at start-up too, so a
 * restored backup or a reset takes effect. (On iOS a change always comes from
 * the user, through the picker, because iOS shows an alert each time.)
 */
export function syncAppIconOnStart(icon: AppIconKey): void {
  if (!isNative || platform !== 'android') return;
  void AppIcon.set({ icon }).catch(() => {});
}

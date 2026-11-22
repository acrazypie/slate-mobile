// Where the data physically lives. One small interface so the repository can
// run on Capacitor Preferences in the app and on a Map in the Node tests.

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Capacitor Preferences: SharedPreferences on Android, UserDefaults on iOS,
 * localStorage in a desktop browser (`npm run dev`). Imported lazily so the
 * Node tests never load Capacitor.
 */
export function preferencesStore(): KeyValueStore {
  // Wrapped in an object: Capacitor plugin proxies answer every property,
  // including `then`, so resolving a promise with one directly never settles.
  const mod = import('@capacitor/preferences').then((m) => ({ prefs: m.Preferences }));
  return {
    async get(key) {
      return (await (await mod).prefs.get({ key })).value;
    },
    async set(key, value) {
      await (await mod).prefs.set({ key, value });
    },
    async remove(key) {
      await (await mod).prefs.remove({ key });
    },
  };
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    async get(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map);
    },
  };
}

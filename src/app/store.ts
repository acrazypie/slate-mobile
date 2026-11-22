// The app-wide repository instance and the React hooks that read it.

import { useSyncExternalStore } from 'react';
import { SlateRepository } from '../data/repository';
import { preferencesStore } from '../data/storage';
import type { SlateData, Settings } from '../data/schema';

export const kv = preferencesStore();
export const repo = new SlateRepository(kv);

export function useData(): SlateData {
  return useSyncExternalStore(repo.subscribe, repo.getSnapshot);
}

export function useSettings(): Settings {
  return useData().settings;
}

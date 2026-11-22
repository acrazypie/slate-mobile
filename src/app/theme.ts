// Applies theme and accent to <html>. Tokens live in styles/tokens.css; this
// only sets data-theme and overrides --accent / --accent-ink when the user
// picked a colour other than the default.

import type { Settings, ThemeSetting } from '../data/schema';
import { DEFAULT_ACCENT } from '../data/schema';
import { syncStatusBar } from '../native/platform';
import type { ColorKey } from '../lib/types';

/**
 * Accent choices. Gesso first (default); presets that equal a block or
 * category colour (COLOR_PALETTE / CATEGORY_COLORS) are left out, so the
 * accent can never be mistaken for a block (owner decision). `light` is the
 * deeper shade used on the light theme (>= 4.5:1 on #fafafa).
 */
export const ACCENT_OPTIONS: { value: string; light: string; name: ColorKey | 'gesso' }[] = [
  { value: '#D4EE5E', light: '#5A7000', name: 'gesso' },
  { value: '#E0B84C', light: '#7F5D00', name: 'amber' },
  { value: '#8BC48A', light: '#2F7A34', name: 'sage' },
  { value: '#E58FB4', light: '#A8346A', name: 'pink' },
];

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function resolveTheme(theme: ThemeSetting): 'dark' | 'light' {
  if (theme === 'system') return media.matches ? 'dark' : 'light';
  return theme;
}

function luminance(hex: string): number {
  const ch = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

/** Darkens a custom accent until it reaches 4.5:1 on the light background (design-notes §1). */
export function lightVariant(hex: string): string {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const bg = luminance('#FAFAFA');
  for (let i = 0; i < 40; i++) {
    const cur = '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    if ((bg + 0.05) / (luminance(cur) + 0.05) >= 4.5) return cur.toUpperCase();
    [r, g, b] = [r * 0.92, g * 0.92, b * 0.92];
  }
  return '#333333';
}

function ink(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#0a0a0a' : '#ffffff';
}

export function applyAppearance(settings: Pick<Settings, 'theme' | 'accent'>) {
  const root = document.documentElement;
  const theme = resolveTheme(settings.theme);
  root.dataset.theme = theme;
  const accent = settings.accent.toUpperCase();
  if (accent === DEFAULT_ACCENT) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-ink');
  } else {
    const known = ACCENT_OPTIONS.find((o) => o.value === accent);
    const value = theme === 'dark' ? accent : (known?.light ?? lightVariant(accent));
    root.style.setProperty('--accent', value);
    root.style.setProperty('--accent-ink', theme === 'dark' ? ink(accent) : '#ffffff');
  }
  syncStatusBar(theme === 'dark');
  try {
    // read by the inline script in index.html before first paint
    localStorage.setItem('slate:theme', theme);
  } catch {
    /* private mode */
  }
}

export function onSystemThemeChange(listener: () => void): () => void {
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

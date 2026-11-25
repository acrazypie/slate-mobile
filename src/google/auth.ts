// Google sign-in on the phone (or in a desktop browser for `npm run dev`).
// The access token is kept in this device's preferences and sent straight to
// Google. There is no refresh token and no Slate server involved: when the
// hour is up, the user signs in again.

import { SocialLogin } from '@capgo/capacitor-social-login';
import type { KeyValueStore } from '../data/storage';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_SCOPES, GOOGLE_WEB_CLIENT_ID } from './config';

export const GOOGLE_SESSION_KEY = 'slate:google-session';

/** Google access tokens last one hour; we stop trusting ours a few minutes early. */
const LIFETIME_MS = 55 * 60_000;

export interface GoogleSession {
  accessToken: string;
  expiresAt: number;
  email: string | null;
}

let ready: Promise<void> | null = null;
function initialize(): Promise<void> {
  ready ??= SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID, iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined, mode: 'online' },
  }).then(() => undefined);
  return ready;
}

export async function readSession(store: KeyValueStore): Promise<GoogleSession | null> {
  try {
    const raw = await store.get(GOOGLE_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleSession;
    if (!s.accessToken || s.expiresAt <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/** Asks Google for a token with the calendar scopes. Shows Google's own account and consent screens. */
export async function signIn(store: KeyValueStore): Promise<GoogleSession> {
  await initialize();
  const res = await SocialLogin.login({ provider: 'google', options: { scopes: GOOGLE_SCOPES } });
  const r = res.result as unknown as { accessToken?: { token?: string } | null; profile?: { email?: string | null } | null };
  const token = r.accessToken?.token;
  if (!token) throw new Error('Google did not grant access to the calendar');
  const session: GoogleSession = { accessToken: token, expiresAt: Date.now() + LIFETIME_MS, email: r.profile?.email ?? null };
  await store.set(GOOGLE_SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function signOut(store: KeyValueStore): Promise<void> {
  try {
    await initialize();
    await SocialLogin.logout({ provider: 'google' });
  } catch {
    /* already signed out on the device; forgetting the token is what matters */
  }
  await store.remove(GOOGLE_SESSION_KEY);
}

'use client';

// ── DEMO auth (client-only, localStorage) ──────────────────────────────────
// Temporary so both experiences (user + admin) can be tried today.
// Swap for Supabase auth once the backend project is provisioned.

export const DEMO_ACCOUNTS = [
  {
    email: 'creadora@letshoot.ai',
    password: 'creadora123',
    role: 'user',
    name: 'Sofía',
  },
  {
    email: 'equipo@letshoot.ai',
    password: 'equipo123',
    role: 'admin',
    name: 'Equipo LetShoot',
  },
];

const KEY = 'letshoot-portal-session';

export function login(email, password) {
  const acct = DEMO_ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === String(email).trim().toLowerCase() &&
      a.password === password
  );
  if (!acct) return null;
  const session = { email: acct.email, role: acct.role, name: acct.name };
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {}
  return session;
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

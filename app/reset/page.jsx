'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Check, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { getUserProfile, homeForProfile } from '@/lib/supabase/session';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';

// Landing page for the Supabase password-recovery email link.
// Handles both PKCE (?code=...) and implicit (#access_token...) flows.
export default function ResetPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [phase, setPhase] = useState('checking'); // checking | ready | invalid | done
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        setPhase(err ? 'invalid' : 'ready');
        return;
      }
      // Implicit flow: detectSessionInUrl already consumed the hash if present.
      const { data: { session } } = await supabase.auth.getSession();
      setPhase(session ? 'ready' : 'invalid');
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (pw1.length < 8) { setError(t.signup.shortPassword); return; }
    if (pw1 !== pw2) { setError(t.reset.mismatch); return; }
    setSaving(true);
    const { error: err } = await getSupabase().auth.updateUser({ password: pw1 });
    setSaving(false);
    if (err) { console.error(err); setError(t.common.error); return; }
    setPhase('done');
  }

  async function goHome() {
    const up = await getUserProfile();
    router.push(homeForProfile(up?.profile));
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">{t.reset.title}</h1>
          <p className="mt-1.5 text-sm text-paper-mute">{t.reset.sub}</p>
        </div>

        {phase === 'checking' && (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-line bg-card p-8 text-paper-dim">
            <Loader2 size={18} className="animate-spin" /> {t.common.loading}
          </div>
        )}

        {phase === 'invalid' && (
          <div className="rounded-3xl border border-line bg-card p-7 text-center">
            <p className="text-sm text-rose-300">{t.reset.invalid}</p>
            <Link href="/forgot" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">{t.reset.requestNew}</Link>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
            {[{ v: pw1, set: setPw1, ph: t.reset.newPh, ac: 'new-password' }, { v: pw2, set: setPw2, ph: t.reset.confirmPh, ac: 'new-password' }].map((f, i) => (
              <label key={i} className={`block ${i ? 'mt-4' : ''}`}>
                <div className="relative">
                  <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
                  <input type="password" autoComplete={f.ac} required value={f.v}
                    onChange={(e) => f.set(e.target.value)} placeholder={f.ph}
                    className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60" />
                </div>
              </label>
            ))}
            {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
            <button type="submit" disabled={saving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {saving ? t.reset.submitting : t.reset.submit}
            </button>
          </form>
        )}

        {phase === 'done' && (
          <div className="rounded-3xl border border-line bg-card p-7 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand"><Check size={24} /></span>
            <p className="text-paper">{t.reset.done}</p>
            <button onClick={goHome} className="mt-5 w-full rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
              {t.reset.goPortal}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

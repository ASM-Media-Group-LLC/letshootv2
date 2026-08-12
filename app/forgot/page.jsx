'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, MailCheck } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';

export default function ForgotPage() {
  const { t } = usePortal();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    // Our branded edge function sends the reset email (letshoot.ai/reset link),
    // never Supabase's default template. Anti-enumeration: it always replies ok.
    const { data, error: err } = await getSupabase().functions.invoke('forgot-password', {
      body: { email: String(email).trim().toLowerCase() },
    });
    setLoading(false);
    if (err && data?.ok !== true) { console.error(err); setError(t.common.error); return; }
    setSent(true);
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          {sent ? (
            <>
              <MailCheck className="mt-8 mb-2 text-brand" size={40} />
              <h1 className="font-display text-2xl font-semibold text-paper">{t.forgot.sentTitle}</h1>
              <p className="mt-2 text-sm text-paper-mute">
                {t.forgot.sentBody1} <span className="break-all text-paper">{email}</span> {t.forgot.sentBody2}
              </p>
              <Link href="/login" className="mt-6 text-sm font-semibold text-brand hover:underline">{t.forgot.backLogin}</Link>
            </>
          ) : (
            <>
              <h1 className="mt-6 font-display text-2xl font-semibold text-paper">{t.forgot.title}</h1>
              <p className="mt-1.5 text-sm text-paper-mute">{t.forgot.sub}</p>
            </>
          )}
        </div>

        {!sent && (
          <>
            <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.common.email}</span>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
                  <input type="email" autoComplete="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder={t.login.emailPh}
                    className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60" />
                </div>
              </label>
              {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
              <button type="submit" disabled={loading}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
                {loading ? t.forgot.submitting : t.forgot.submit}
                {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
              </button>
            </form>
            <p className="mt-5 text-center text-sm text-paper-mute">
              <Link href="/login" className="font-semibold text-brand hover:underline">{t.forgot.backLogin}</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

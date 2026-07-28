'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { signIn, homeForProfile } from '@/lib/supabase/session';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn(email, password);
    if (res.error || !res.profile) {
      if (res.error) console.error(res.error);
      setError(res.error === 'Invalid login credentials' ? t.login.badCreds : t.login.generic);
      setLoading(false);
      return;
    }
    router.push(homeForProfile(res.profile));
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">{t.login.title}</h1>
          <p className="mt-1.5 text-sm text-paper-mute">{t.login.sub}</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.common.email}</span>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder={t.login.emailPh}
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">{t.common.password}</span>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type={show ? 'text' : 'password'} autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder={t.login.passwordPh}
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-11 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
              <button
                type="button" onClick={() => setShow((s) => !s)}
                aria-label={show ? t.common.hidePassword : t.common.showPassword}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="mt-2 text-right">
            <Link href="/forgot" className="text-xs font-medium text-paper-dim transition-colors hover:text-brand">{t.login.forgot}</Link>
          </div>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? t.login.submitting : t.login.submit}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-paper-mute">
          {t.login.noAccount} <Link href="/signup" className="font-semibold text-brand hover:underline">{t.login.create}</Link>
        </p>
      </div>
    </main>
  );
}

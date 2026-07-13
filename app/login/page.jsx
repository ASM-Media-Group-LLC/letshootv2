'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { login, DEMO_ACCOUNTS } from '@/lib/portalAuth';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const session = login(email, password);
    if (!session) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }
    router.push(session.role === 'admin' ? '/admin' : '/panel');
  }

  function fill(acct) {
    setEmail(acct.email);
    setPassword(acct.password);
    setError('');
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Entra a tu portal</h1>
          <p className="mt-1.5 text-sm text-paper-mute">Tu contenido, listo cuando lo necesitas.</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7"
        >
          {/* Email */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Correo</span>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
            </div>
          </label>

          {/* Password with show/hide */}
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Contraseña</span>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-11 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        {/* Demo accounts helper */}
        <div className="mt-5 rounded-2xl border border-line bg-ink-2/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
            <ShieldCheck size={14} className="text-brand" /> Cuentas de prueba
          </div>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fill(a)}
                className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-2 text-left text-xs transition-colors hover:border-brand/40"
              >
                <span>
                  <span className="block font-medium text-paper">{a.role === 'admin' ? 'Admin (equipo)' : 'Usuaria (creadora)'}</span>
                  <span className="text-paper-dim">{a.email} · {a.password}</span>
                </span>
                <span className="font-mono text-[10px] text-brand">usar →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

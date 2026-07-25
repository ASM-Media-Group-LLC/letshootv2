'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowRight, MailCheck } from 'lucide-react';
import { signUp } from '@/lib/supabase/session';
import Logo from '@/components/Logo';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setLoading(true);
    const res = await signUp(email, password);
    setLoading(false);
    if (res.error) {
      setError(/already registered|exists/i.test(res.error) ? 'Ese correo ya tiene cuenta. Inicia sesión.' : res.error);
      return;
    }
    if (res.needsConfirm) { setSent(true); return; }
    router.push('/onboarding');
  }

  if (sent) {
    return (
      <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
        <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
        <div className="relative w-full max-w-sm text-center">
          <Logo size="lg" />
          <MailCheck className="mx-auto mt-8 mb-3 text-brand" size={40} />
          <h1 className="font-display text-2xl font-semibold text-paper">Revisa tu correo</h1>
          <p className="mt-2 text-sm text-paper-mute">Te enviamos un enlace a <span className="text-paper">{email}</span> para confirmar tu cuenta. Ábrelo y vuelve a entrar para continuar tu registro.</p>
          <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-brand hover:underline">Ir a iniciar sesión</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Crea tu cuenta</h1>
          <p className="mt-1.5 text-sm text-paper-mute">Empieza tu registro como creadora en minutos.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Correo</span>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Contraseña</span>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" aria-hidden />
              <input
                type={show ? 'text' : 'password'} autoComplete="new-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-11 text-paper outline-none transition-colors placeholder:text-paper-dim focus:border-brand/60"
              />
              <button
                type="button" onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper"
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"
          >
            {loading ? 'Creando…' : 'Crear cuenta'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>

          <p className="mt-4 text-center text-xs text-paper-dim">
            Al registrarte aceptas verificar tu identidad (mayor de 18) antes de activar tu clon.
          </p>
        </form>

        <p className="mt-5 text-center text-sm text-paper-mute">
          ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}

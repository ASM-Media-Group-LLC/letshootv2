'use client';

// Public team-join page. An invited person lands here via the admin's invite
// link, registers, and their account is created as internal team PENDING approval.
// The admin then approves + assigns puesto & accesos in the admin panel.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, CheckCircle2, Users } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

export default function JoinPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Completa correo y contraseña.'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setLoading(true);
    const { data, error: err } = await getSupabase().functions.invoke('redeem-invite', {
      body: { token, ...form },
    });
    setLoading(false);
    let out = data;
    if (err && !out) { try { out = await err.context.json(); } catch { out = { error: err.message }; } }
    if (!out?.ok) { setError(out?.error || 'No se pudo completar el registro.'); return; }
    setDone(true);
  }

  if (done) {
    return (
      <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
        <div className="blob left-1/2 top-1/3 h-[420px] w-[520px] -translate-x-1/2 bg-brand/10" aria-hidden />
        <div className="relative w-full max-w-sm text-center">
          <Logo size="lg" />
          <CheckCircle2 className="mx-auto mt-8 mb-3 text-brand" size={40} />
          <h1 className="font-display text-2xl font-semibold text-paper">Cuenta creada</h1>
          <p className="mt-2 text-sm leading-relaxed text-paper-mute">
            Tu registro quedó enviado. El administrador debe <span className="text-paper">aprobar tu acceso</span> y asignarte tu puesto y permisos. Cuando lo haga, podrás entrar a trabajar.
          </p>
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
          <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
            <Users size={13} /> Únete al equipo
          </span>
          <h1 className="mt-3 font-display text-2xl font-semibold text-paper">Crea tu cuenta de equipo</h1>
          <p className="mt-1.5 text-sm text-paper-mute">Te invitaron a trabajar en LetShoot. Regístrate y el administrador aprobará tu acceso.</p>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6 shadow-glow-sm sm:p-7">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Tu nombre</span>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input value={form.full_name} onChange={set('full_name')} placeholder="Ej. Camila"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Correo</span>
            <div className="relative">
              <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="tu@correo.com"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-3 text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            </div>
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-paper-mute">Contraseña</span>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
              <input type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-line bg-ink-2 py-3 pl-11 pr-11 text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

          <button type="submit" disabled={loading}
            className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
            {loading ? 'Creando…' : 'Crear mi cuenta'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
          <p className="mt-4 text-center text-[11px] text-paper-dim">Tu puesto y tus permisos los asigna el administrador. Tú solo los verás reflejados.</p>
        </form>

        <p className="mt-5 text-center text-sm text-paper-mute">
          ¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-brand hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </main>
  );
}

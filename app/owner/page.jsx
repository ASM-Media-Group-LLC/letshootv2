'use client';

// ─────────────────────────────────────────────────────────────────────────
// PRIVATE OWNER SHORTCUT PAGE — for the owner's own testing only.
// One-click sign-in as Admin or as User (creadora), credentials pre-filled.
// ⚠️ This page exposes working credentials. Keep it unlinked and remove (or
// gate) it before a public launch.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, ArrowRight, RotateCcw, Loader2, Sparkles, Building2, ClipboardList } from 'lucide-react';
import { signIn, signOut, homeForProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

const ADMIN = { email: 'admin@letshoot.ai', password: 'LetShoot!admin' };
const USER = { email: 'creadora@letshoot.ai', password: 'LetShoot!creadora' };
// Fully paid + content-delivered demo creator — the post-payment experience.
const CLIENTA = { email: 'clienta@letshoot.ai', password: 'LetShoot!clienta' };
// Agency / manager — manages its models, makes requests, records sales.
const AGENCY = { email: 'agencia@letshoot.ai', password: 'LetShoot!agencia' };
// Team personas — dynamic roles, each with only their function(s).
const STAFF = [
  { key: 'manager', label: 'Manager', desc: 'Todas las funciones', acct: { email: 'manager@letshoot.ai', password: 'LetShoot!manager' } },
  { key: 'soporte', label: 'Servicio al cliente', desc: 'Pedidos', acct: { email: 'soporte@letshoot.ai', password: 'LetShoot!soporte' } },
  { key: 'fotos', label: 'Subir fotos', desc: 'Entregas', acct: { email: 'fotos@letshoot.ai', password: 'LetShoot!fotos' } },
  { key: 'ids', label: 'Revisar IDs', desc: 'Verificación', acct: { email: 'ids@letshoot.ai', password: 'LetShoot!ids' } },
];

export default function OwnerPage() {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function enter(acct, tag) {
    setBusy(tag); setError('');
    // Clear any prior session first so a stale login never blocks the switch.
    await signOut().catch(() => {});
    const res = await signIn(acct.email, acct.password);
    if (res.error || !res.profile) {
      setError(res.error || 'No se pudo entrar.'); setBusy(''); return;
    }
    router.push(homeForProfile(res.profile));
  }

  // Sign in as the test user, wipe their onboarding progress, land on the wizard.
  async function resetUser() {
    setBusy('reset'); setError('');
    await signOut().catch(() => {});
    const res = await signIn(USER.email, USER.password);
    if (res.error || !res.profile) { setError(res.error || 'No se pudo entrar.'); setBusy(''); return; }
    const { error: err } = await getSupabase().from('profiles').update({
      onboarding_status: 'registered',
      legal_first_name: null, legal_last_name: null, date_of_birth: null,
      country: null, phone: null, stage_name: null, full_name: 'Creadora Prueba',
      id_rejection_reason: null, payment_status: 'unpaid', lora_status: 'none',
      consent_clone: false, consent_billing: false, consent_at: null,
    }).eq('id', res.user.id);
    if (err) { setError(err.message); setBusy(''); return; }
    router.push('/onboarding');
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[560px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Acceso rápido</h1>
          <p className="mt-1.5 text-sm text-paper-mute">Página privada para tus pruebas. Un clic y entras.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Admin */}
          <div className="flex flex-col rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-brand/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
              <ShieldCheck size={14} /> Admin
            </span>
            <p className="text-sm text-paper-mute">Panel del equipo: registros, verificaciones, roles.</p>
            <div className="mt-3 space-y-1 rounded-xl border border-line bg-ink-2 px-3 py-2 font-mono text-xs text-paper-dim">
              <div>{ADMIN.email}</div>
              <div>{ADMIN.password}</div>
            </div>
            <button onClick={() => enter(ADMIN, 'admin')} disabled={!!busy}
              className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {busy === 'admin' ? <Loader2 size={18} className="animate-spin" /> : <>Entrar como Admin <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
            </button>
          </div>

          {/* User */}
          <div className="flex flex-col rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-hair/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-paper-mute">
              <User size={14} /> Usuario (creadora)
            </span>
            <p className="text-sm text-paper-mute">Para probar el registro: datos → ID + consentimiento → aprobación → pago. Fotos del clon: opcionales, en cualquier momento.</p>
            <div className="mt-3 space-y-1 rounded-xl border border-line bg-ink-2 px-3 py-2 font-mono text-xs text-paper-dim">
              <div>{USER.email}</div>
              <div>{USER.password}</div>
            </div>
            <button onClick={() => enter(USER, 'user')} disabled={!!busy}
              className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {busy === 'user' ? <Loader2 size={18} className="animate-spin" /> : <>Entrar como Usuario <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
            </button>
            <button onClick={resetUser} disabled={!!busy}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:opacity-60">
              {busy === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <><RotateCcw size={15} /> Reiniciar onboarding y entrar</>}
            </button>
          </div>
        </div>

        {/* Cuenta ya completada — pagada + contenido entregado (experiencia post-pago) */}
        <div className="mt-4 flex flex-col rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-6 shadow-glow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
                <Sparkles size={14} /> Cuenta completada
              </span>
              <p className="text-sm text-paper-mute">
                Cómo se ve la cuenta <strong className="text-paper">después de pagar</strong>: contenido ya
                entregado por el equipo, organizado en carpetas, con propósito de cada foto y el seguimiento
                de ventas, ingresos y alcance. Así vive su cuenta un cliente activo.
              </p>
              <div className="mt-3 inline-flex flex-col gap-0.5 rounded-xl border border-line bg-ink-2 px-3 py-2 font-mono text-xs text-paper-dim">
                <div>{CLIENTA.email}</div>
                <div>{CLIENTA.password}</div>
              </div>
            </div>
          </div>
          <button onClick={() => enter(CLIENTA, 'clienta')} disabled={!!busy}
            className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
            {busy === 'clienta' ? <Loader2 size={18} className="animate-spin" /> : <>Entrar como cuenta completada <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </div>

        {/* Agencia / Manager — gestiona sus modelos, pide contenido y lleva sus cuentas */}
        <div className="mt-4 flex flex-col rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-brand/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
            <Building2 size={14} /> Agencia / Manager
          </span>
          <p className="text-sm text-paper-mute">
            La cuenta que <strong className="text-paper">gestiona a las modelos</strong>: ve el contenido que
            el equipo entrega, hace las peticiones y registra cuánto vendió cada pieza. La plataforma le lleva
            las cuentas.
          </p>
          <div className="mt-3 inline-flex w-fit flex-col gap-0.5 rounded-xl border border-line bg-ink-2 px-3 py-2 font-mono text-xs text-paper-dim">
            <div>{AGENCY.email}</div>
            <div>{AGENCY.password}</div>
          </div>
          <button onClick={() => enter(AGENCY, 'agency')} disabled={!!busy}
            className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
            {busy === 'agency' ? <Loader2 size={18} className="animate-spin" /> : <>Entrar como Agencia <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </div>

        {/* Equipo — roles dinámicos, cada uno con su función */}
        <div className="mt-4 rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-brand/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
            <ClipboardList size={14} /> Equipo (trabajadores)
          </span>
          <p className="mb-4 text-sm text-paper-mute">
            Roles por función: cada quien ve solo lo suyo. El admin activa o quita funciones en «Equipo».
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {STAFF.map((s) => (
              <button key={s.key} onClick={() => enter(s.acct, s.key)} disabled={!!busy}
                className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-ink-2 px-4 py-3 text-left transition-colors hover:border-brand/40 disabled:opacity-60">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-paper">{s.label}</span>
                  <span className="block truncate text-xs text-paper-dim">{s.desc} · {s.acct.email}</span>
                </span>
                {busy === s.key ? <Loader2 size={16} className="shrink-0 animate-spin text-brand" /> : <ArrowRight size={16} className="shrink-0 text-paper-dim transition-transform group-hover:translate-x-1 group-hover:text-brand" />}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mx-auto mt-5 max-w-md rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-sm text-paper-dim">
          <Link href="/login" className="hover:text-brand">Login normal</Link>
          <span>·</span>
          <Link href="/signup" className="hover:text-brand">Registro público</Link>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-paper-dim">
          Página privada de pruebas: muestra credenciales reales. No la enlaces en ningún lado y quítala (o protégela) antes del lanzamiento público.
        </p>
      </div>
    </main>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────
// PRIVATE OWNER SHORTCUT PAGE — for the owner's own testing only.
// One-click sign-in as Admin or as User (creadora), credentials pre-filled.
// WARNING: This page exposes working credentials. Keep it unlinked and remove (or
// gate) it before a public launch.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, ArrowRight, RotateCcw, Loader2, Sparkles, Building2, ClipboardList, Upload } from 'lucide-react';
import { signIn, signOut, homeForProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

const ADMIN = { email: 'admin@letshoot.ai', password: 'LetShoot!admin' };
const USER = { email: 'creadora@letshoot.ai', password: 'LetShoot!creadora' };
// Fully paid + content-delivered demo creator — the post-payment experience.
const CLIENTA = { email: 'clienta@letshoot.ai', password: 'LetShoot!clienta' };
// Agency / manager — manages its models, makes requests, records sales.
const AGENCY = { email: 'agencia@letshoot.ai', password: 'LetShoot!agencia' };
// Uploader: the person who uploads the product (photos/videos) into each
// model's account. Real staff are created from Admin → «Equipo interno»
// (the Uploader preset comes ready); this is a demo puesto to preview it.
const TEAM = { email: 'equipo@letshoot.ai', password: 'LetShoot!equipo' };

// El acceso rápido con credenciales SOLO existe en desarrollo/staging.
// En producción (dominio público) no se sirve, salvo que se active
// explícitamente con NEXT_PUBLIC_OWNER_ACCESS=1 en ese entorno.
const OWNER_ENABLED = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_OWNER_ACCESS === '1';

export default function OwnerPage() {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { if (!OWNER_ENABLED) router.replace('/login'); }, [router]);
  if (!OWNER_ENABLED) return null;

  async function enter(acct, tag) {
    setBusy(tag); setError('');
    // Clear any prior session first so a stale login never blocks the switch.
    await signOut().catch(() => {});
    const res = await signIn(acct.email, acct.password);
    if (res.error || !res.profile) {
      // The demo accounts were wiped in the fake-data cleanup — say exactly how to
      // restore each one instead of a mute "Invalid login credentials".
      const invalid = /invalid/i.test(res.error || '');
      setError(invalid
        ? `La cuenta demo ${acct.email} no existe (se borró en la limpieza de datos de prueba). ` +
          (tag === 'agency'
            ? 'Créala en Admin → Agencias → «Crear agencia» con ese correo y esa contraseña, y este botón vuelve a funcionar.'
            : 'Créala en Admin → Registros → «Add creator» con ese correo y esa contraseña, y este botón vuelve a funcionar.')
        : (res.error || 'No se pudo entrar.'));
      setBusy(''); return;
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

  // One click: recreate the 4 demo accounts (creadora/clienta/agencia/equipo) that /owner
  // uses to preview each experience. Signs in as admin and calls create-user (the same
  // function «Add creator» uses) with the fixed demo passwords, so the buttons below work
  // again. Idempotent: an existing account is just skipped.
  async function seedDemo() {
    setBusy('seed'); setError('');
    try {
      await signOut().catch(() => {});
      const res = await signIn(ADMIN.email, ADMIN.password);
      if (res.error || res.profile?.role !== 'admin') throw new Error(res.error || 'No entré como admin.');
      const sb = getSupabase();
      // Attach the fresh admin token explicitly — after a just-completed signIn the
      // cookie-based client may not have propagated it to functions.invoke yet.
      const { data: { session } } = await sb.auth.getSession();
      const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
      const demos = [
        { full_name: 'Creadora Demo', email: USER.email,    password: USER.password,    role: 'creator' },
        { full_name: 'Clienta Demo',  email: CLIENTA.email, password: CLIENTA.password, role: 'creator', profile: { activate: true, plan: 'core' } },
        { full_name: 'Agencia Demo',  email: AGENCY.email,  password: AGENCY.password,  role: 'agency' },
        { full_name: 'Equipo Demo',   email: TEAM.email,    password: TEAM.password,    role: 'supervisor', capabilities: ['content', 'requests', 'feedback'] },
      ];
      let created = 0, skipped = 0; const failed = [];
      for (const d of demos) {
        const { data, error } = await sb.functions.invoke('create-user', { body: { ...d, send_invite: false }, headers });
        let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
        if (out?.ok) created++;
        else if (/ya existe|already/i.test(out?.error || '')) skipped++;
        else failed.push(`${d.email}: ${out?.error || 'sin respuesta'}`);
      }
      setError(failed.length
        ? `Fallaron: ${failed.join(' · ')}`
        : `Listo — ${created} creada(s), ${skipped} ya existían. Recarga y entra como cualquiera de abajo.`);
    } catch (e) {
      setError('Error: ' + (e?.message || String(e)));
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-16">
      <div className="blob left-1/2 top-1/3 h-[420px] w-[560px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative w-full max-w-3xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Acceso rápido</h1>
          <p className="mt-1.5 text-sm text-paper-mute">Página privada para tus pruebas. Un clic y entras.</p>
          <button onClick={seedDemo} disabled={!!busy}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
            {busy === 'seed' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={15} />} Restaurar cuentas demo
          </button>
          <p className="mt-1.5 max-w-md text-[11px] text-paper-dim">Recrea las cuentas de prueba (creadora, clienta, agencia, equipo) para que todos los botones de abajo funcionen. Úsalo si alguno dice que la cuenta no existe.</p>
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

        {/* Uploaders — el trabajador que sube el contenido a las modelos */}
        <div className="mt-4 flex flex-col rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
          <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-brand/12 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand">
            <Upload size={14} /> Uploaders · suben contenido
          </span>
          <p className="text-sm text-paper-mute">
            Los <strong className="text-paper">uploaders</strong> cargan el producto: entran a una modelo, suben sus
            fotos y videos, les ponen el propósito y los amarran a un pedido. Al subirlos aparecen al instante en la
            cuenta de la modelo y en la de su agencia. Solo ven sus funciones (contenido, pedidos, feedback).
          </p>
          <div className="mt-3 inline-flex w-fit flex-col gap-0.5 rounded-xl border border-line bg-ink-2 px-3 py-2 font-mono text-xs text-paper-dim">
            <div>{TEAM.email}</div>
            <div>{TEAM.password}</div>
          </div>
          <button onClick={() => enter(TEAM, 'team')} disabled={!!busy}
            className="group mt-4 flex items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
            {busy === 'team' ? <Loader2 size={18} className="animate-spin" /> : <>Entrar como Uploader <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-paper-dim">
            <ClipboardList size={12} className="mr-1 inline" /> A tus uploaders reales los creas en <strong className="text-paper-mute">Admin → «Equipo interno» → Crear puesto</strong> (el preset «Uploader» ya viene armado; agregas o quitas accesos) o por link de invitación.
          </p>
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

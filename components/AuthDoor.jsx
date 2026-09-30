'use client';

// "Una sola puerta" — /signup usa este flujo (correo primero, estilo Google/Notion); /login
// quedó con su página de siempre (decisión del dueño).
// La creadora nunca elige entre "Entrar" y "Crear cuenta" (se confundían: una ya registrada tocaba
// "Crear cuenta", le salía "Ese correo ya tiene cuenta" y se quedaba trabada).
//   Paso 1: correo → RPC email_account_status → 'exists' | 'new'.
//   Paso 2a ('exists'): contraseña → Entrar.   Paso 2b ('new'): contraseña nueva → Crear mi cuenta.
//   Si la RPC falla o tarda: paso 2 con dos pestañas ("Ya tengo cuenta" / "Soy nueva") — nunca bloquea.
// La contraseña vive solo en el estado del form: nunca se loguea ni va en una URL.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, MailCheck } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { signIn, signUp, homeForProfile } from '@/lib/supabase/session';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOOKUP_TIMEOUT_MS = 8000;

// ¿El correo ya tiene cuenta? 'exists' | 'new', o null si no se pudo saber (→ pestañas de respaldo).
async function lookupEmail(clean) {
  let timer;
  try {
    const call = getSupabase().rpc('email_account_status', { p_email: clean });
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve({ timedOut: true }), LOOKUP_TIMEOUT_MS); });
    const res = await Promise.race([call, timeout]);
    if (!res || res.timedOut || res.error) return null;
    return res.data === 'exists' || res.data === 'new' ? res.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const INPUT = 'w-full rounded-2xl border border-line bg-ink-2 py-4 pl-12 text-base text-paper outline-none transition-[border-color,box-shadow] placeholder:text-paper-dim focus:border-brand/70 focus:ring-4 focus:ring-brand/15';
const ERROR_TXT = 'text-rose-300 [[data-theme=light]_&]:text-rose-700';

function StepIndicator({ n, d }) {
  const dot = (active, done) =>
    `flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
      active ? 'bg-brand text-on-accent' : done ? 'bg-brand/20 text-brand' : 'border border-line text-paper-dim'
    }`;
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={dot(n === 1, n > 1)}>{n > 1 ? <Check size={12} strokeWidth={3} /> : '1'}</span>
      <span aria-hidden className={`h-px w-6 transition-colors ${n > 1 ? 'bg-brand' : 'bg-line'}`} />
      <span aria-hidden className={dot(n === 2, false)}>2</span>
      <span className="ml-1 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
        {d.step} {n} {d.of} 2
      </span>
    </div>
  );
}

export default function AuthDoor({ intent = 'auto' }) {
  const { t } = usePortal();
  const d = t.door;
  const router = useRouter();

  const [step, setStep] = useState('email');     // 'email' | 'password' | 'sent'
  const [mode, setMode] = useState('exists');    // 'exists' → entrar · 'new' → crear cuenta
  const [fallback, setFallback] = useState(false); // la RPC no respondió → pestañas
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileBg, setMobileBg] = useState(false);     // < lg → video del homepage de fondo
  const [reduceMotion, setReduceMotion] = useState(false);
  const busy = useRef(false); // candado anti doble-envío (el estado de React llega tarde)
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  const clean = email.trim().toLowerCase();

  // Deep links (?email=) desde correos, /forgot "Volver", etc. → correo ya puesto.
  useEffect(() => {
    try {
      const em = new URLSearchParams(window.location.search).get('email');
      if (em) setEmail(em.trim());
    } catch {}
  }, []);

  // Fondo de video solo en pantallas chicas (< lg) y si la persona no pidió "reducir movimiento".
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const small = window.matchMedia('(max-width: 1023.98px)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { setMobileBg(small.matches); setReduceMotion(calm.matches); };
    sync();
    small.addEventListener?.('change', sync);
    calm.addEventListener?.('change', sync);
    return () => {
      small.removeEventListener?.('change', sync);
      calm.removeEventListener?.('change', sync);
    };
  }, []);

  // Foco al campo que toca en cada paso.
  useEffect(() => {
    const el = step === 'email' ? emailRef.current : step === 'password' ? pwRef.current : null;
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch { el.focus(); }
  }, [step]);

  function resetMessages() { setError(''); setNote(''); }

  function backToEmail() {
    if (busy.current) return;
    resetMessages();
    setPassword(''); setShow(false); setFallback(false);
    setStep('email');
  }

  function pickMode(m) {
    if (busy.current || m === mode) return;
    resetMessages();
    setMode(m);
  }

  async function onEmail(e) {
    e.preventDefault();
    if (busy.current) return;
    resetMessages();
    if (!EMAIL_RE.test(clean)) { setError(d.badEmail); return; }
    busy.current = true; setLoading(true);
    const status = await lookupEmail(clean);
    busy.current = false; setLoading(false);
    setEmail(clean);
    setPassword(''); setShow(false);
    if (status) { setMode(status); setFallback(false); }
    else { setMode(intent === 'new' ? 'new' : 'exists'); setFallback(true); }
    setStep('password');
  }

  // Devuelven true cuando ya nos vamos de la página (dejamos el botón bloqueado mientras navega).
  async function doSignIn() {
    const res = await signIn(clean, password);
    if (!res.error) { router.push(res.profile ? homeForProfile(res.profile) : '/panel'); return true; }
    const msg = res.error || '';
    const wrong = msg === 'Invalid login credentials';
    setError(
      wrong ? (fallback ? d.badCredsFallback : d.wrongPassword)
        : /not confirmed/i.test(msg) ? t.login.notConfirmed
        : t.login.generic,
    );
    // Contraseña equivocada → queda seleccionada para reescribirla de una.
    if (wrong) requestAnimationFrame(() => { pwRef.current?.focus(); pwRef.current?.select(); });
    return false;
  }

  async function doSignUp() {
    const res = await signUp(clean, password);
    if (!res.error) {
      if (res.needsConfirm) { setStep('sent'); return false; }
      // El welcome ya lo manda public-signup (servidor); no lo repetimos acá.
      router.push('/onboarding');
      return true;
    }
    if (/already registered|exists/i.test(res.error)) {
      // Carrera (o pestaña "Soy nueva" con un correo que ya existía): si la clave escrita es la suya,
      // entra directo; si no, pasamos solos a "¡Hola de nuevo!" con una nota corta.
      const li = await signIn(clean, password);
      if (!li.error) { router.push(li.profile ? homeForProfile(li.profile) : '/panel'); return true; }
      setMode('exists'); setFallback(false);
      setPassword(''); setShow(false);
      setNote(d.raceNote);
      requestAnimationFrame(() => pwRef.current?.focus());
      return false;
    }
    setError(/not confirmed/i.test(res.error) ? t.login.notConfirmed : t.common.error);
    return false;
  }

  async function onPassword(e) {
    e.preventDefault();
    if (busy.current) return;
    resetMessages();
    if (!password) { pwRef.current?.focus(); return; }
    if (mode === 'new' && password.length < 8) { setError(t.signup.shortPassword); pwRef.current?.focus(); return; }
    busy.current = true; setLoading(true);
    let leaving = false;
    try {
      leaving = mode === 'exists' ? await doSignIn() : await doSignUp();
    } catch {
      setError(t.common.error);
    } finally {
      if (!leaving) { busy.current = false; setLoading(false); }
    }
  }

  function afterConfirmSent() {
    resetMessages();
    setPassword(''); setShow(false);
    setMode('exists'); setFallback(false);
    setStep('password');
  }

  // ── Encabezado según el paso ──
  let title, sub;
  if (step === 'email') { title = intent === 'new' ? d.titleNew : d.title; sub = d.sub; }
  else if (step === 'password') {
    if (fallback) { title = d.fallbackTitle; sub = d.fallbackSub; }
    else if (mode === 'exists') { title = d.welcomeBack; sub = d.welcomeBackSub; }
    else { title = d.createTitle; sub = d.createSub; }
  }

  const isNew = mode === 'new';
  const pwOk = password.length >= 8;

  return (
    <main className="relative min-h-[100svh] bg-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* ── Panel de marca (solo desktop) ── */}
      <aside className="relative hidden overflow-hidden bg-[#05070b] lg:sticky lg:top-0 lg:flex lg:h-[100svh] lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <div aria-hidden className="absolute inset-0 bg-cover"
          style={{ backgroundImage: 'url(/julia-door.jpg)', backgroundPosition: 'center 18%' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#05070b] via-[#05070b]/60 to-[#05070b]/25" />
        <div aria-hidden className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 85% 60% at 0% 0%, rgba(0,177,246,0.30), transparent 62%)' }} />
        <div aria-hidden className="absolute inset-y-0 right-0 w-px bg-white/10" />

        <div className="relative">
          <Logo size="lg" forceDark />
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur">
            {d.eyebrow}
          </span>
          <p className="mt-5 font-display text-4xl font-semibold leading-[1.06] tracking-tight text-white xl:text-5xl">
            {d.brandA} <span className="text-brand">{d.brandB}</span>
          </p>
          <ul className="mt-8 space-y-3.5">
            {d.perks.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] text-white/85">
                <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
                  <Check size={14} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Formulario ── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden px-4 sm:px-8">
        {/* Celular/tablet: el video del homepage de fondo (solo se monta ahí → en desktop no se baja). */}
        {mobileBg && (
          <div aria-hidden className="pointer-events-none absolute inset-0 lg:hidden">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/hero-miami-poster.jpg)' }} />
            {!reduceMotion && (
              <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline
                preload="auto" poster="/hero-miami-poster.jpg">
                <source src="/hero-miami.mp4" type="video/mp4" />
              </video>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/80 to-ink" />
          </div>
        )}

        <header className="relative z-10 flex items-center justify-between py-4">
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto"><LangToggle /></div>
        </header>

        <div className="relative flex flex-1 items-center justify-center py-8 sm:py-12">
          <div key={step} className="w-full max-w-[400px] animate-risein">
            {step === 'sent' ? (
              <div className="text-center sm:text-left">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand sm:mx-0">
                  <MailCheck size={28} aria-hidden />
                </span>
                <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-paper">{t.signup.checkTitle}</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-paper-mute">
                  {t.signup.checkBody1} <span className="break-all font-medium text-paper">{clean}</span> {t.signup.checkBody2}
                </p>
                <button type="button" onClick={afterConfirmSent}
                  className="btn3d-ghost mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold">
                  {t.signup.goLogin} <ArrowRight size={16} aria-hidden />
                </button>
              </div>
            ) : (
              <>
                <StepIndicator n={step === 'email' ? 1 : 2} d={d} />
                <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-paper sm:text-[2.1rem] sm:leading-tight">{title}</h1>
                <p className="mt-2 text-[15px] leading-relaxed text-paper-mute">{sub}</p>

                {step === 'email' ? (
                  <form onSubmit={onEmail} noValidate className="mt-8" aria-busy={loading}>
                    <label htmlFor="door-email" className="mb-2 block text-sm font-medium text-paper-mute">{t.common.email}</label>
                    <div className="relative">
                      <Mail size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-dim" />
                      <input
                        id="door-email" ref={emailRef} name="email" type="email" inputMode="email"
                        autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                        autoFocus required value={email} readOnly={loading}
                        onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                        placeholder={t.login.emailPh}
                        aria-invalid={!!error} aria-describedby={error ? 'door-error' : undefined}
                        className={`${INPUT} pr-4 read-only:opacity-70`}
                      />
                    </div>

                    {error && (
                      <p id="door-error" role="alert" className={`mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-sm ${ERROR_TXT}`}>{error}</p>
                    )}

                    <button type="submit" disabled={loading}
                      className="btn3d group mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold">
                      {loading ? <><Loader2 size={18} className="animate-spin" aria-hidden /> {d.checking}</>
                        : <>{d.continue} <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-1" /></>}
                    </button>
                    {intent === 'new' && (
                      <p className="mt-5 text-center text-sm text-paper-mute">
                        {t.signup.haveAccount}{' '}
                        <Link href="/login" className="inline-block py-2 font-semibold text-brand hover:underline">{t.signup.signIn}</Link>
                      </p>
                    )}
                  </form>
                ) : (
                  <form onSubmit={onPassword} noValidate className="mt-7" aria-busy={loading}>
                    {/* Correo elegido + "Cambiar" (vuelve al paso 1) */}
                    <div className="flex items-center gap-3 rounded-2xl border border-line bg-hair/5 py-2 pl-2 pr-2">
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-sm font-bold uppercase text-brand">
                        {clean.charAt(0) || '@'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-paper" title={clean}>{clean}</span>
                      <button type="button" onClick={backToEmail} disabled={loading} aria-label={d.changeAria}
                        className="btn3d-ghost shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold sm:px-3.5 sm:py-2 sm:text-xs">
                        {d.change}
                      </button>
                    </div>
                    {/* Para que el gestor de contraseñas asocie la clave a este correo */}
                    <input type="email" name="username" autoComplete="username" value={clean} readOnly
                      tabIndex={-1} aria-hidden="true" className="sr-only" />

                    {fallback && (
                      <div role="group" aria-label={d.fallbackTitle}
                        className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-hair/5 p-1">
                        {[['exists', d.tabHave], ['new', d.tabNew]].map(([m, label]) => (
                          <button key={m} type="button" aria-pressed={mode === m} onClick={() => pickMode(m)} disabled={loading}
                            className={`min-h-[44px] rounded-xl px-2 text-sm font-semibold transition-colors ${
                              mode === m ? 'bg-brand text-on-accent' : 'text-paper-mute hover:bg-hair/5 hover:text-paper'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {note && (
                      <p role="status" className="mt-4 rounded-xl border border-brand/40 bg-brand/10 px-3.5 py-2.5 text-sm text-paper">{note}</p>
                    )}

                    <label htmlFor="door-password" className="mb-2 mt-5 block text-sm font-medium text-paper-mute">{t.common.password}</label>
                    <div className="relative">
                      <Lock size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-paper-dim" />
                      <input
                        id="door-password" ref={pwRef} name="password"
                        type={show ? 'text' : 'password'}
                        autoComplete={isNew ? 'new-password' : 'current-password'}
                        minLength={isNew ? 8 : undefined}
                        required value={password} readOnly={loading}
                        onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                        placeholder={isNew ? t.signup.passwordPh : t.login.passwordPh}
                        aria-invalid={!!error}
                        aria-describedby={[isNew ? 'door-pw-hint' : '', error ? 'door-error' : ''].filter(Boolean).join(' ') || undefined}
                        className={`${INPUT} pr-14 read-only:opacity-70`}
                      />
                      <button type="button" onClick={() => setShow((s) => !s)}
                        aria-label={show ? t.common.hidePassword : t.common.showPassword}
                        className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-paper-dim transition-colors hover:bg-hair/10 hover:text-paper">
                        {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                      </button>
                    </div>

                    {isNew ? (
                      <p id="door-pw-hint" className={`mt-2 flex items-start gap-1.5 text-xs transition-colors ${pwOk ? 'text-brand' : 'text-paper-dim'}`}>
                        <Check size={14} strokeWidth={3} aria-hidden className="mt-px shrink-0" /> {d.pwHint}
                      </p>
                    ) : (
                      <div className="mt-2 text-right">
                        <Link href={`/forgot?email=${encodeURIComponent(clean)}`}
                          className="inline-block px-1 py-2.5 text-sm font-medium text-paper-mute transition-colors hover:text-brand sm:py-1 sm:text-xs sm:text-paper-dim">
                          {t.login.forgot}
                        </Link>
                      </div>
                    )}

                    {error && (
                      <p id="door-error" role="alert" className={`mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-sm ${ERROR_TXT}`}>{error}</p>
                    )}

                    <button type="submit" disabled={loading}
                      className="btn3d group mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold">
                      {loading
                        ? <><Loader2 size={18} className="animate-spin" aria-hidden /> {isNew ? d.creating : t.login.submitting}</>
                        : <>{isNew ? d.create : t.login.submit} <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-1" /></>}
                    </button>

                    {isNew && <p className="mt-4 text-center text-xs leading-relaxed text-paper-dim">{t.signup.terms}</p>}
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        {/* En móvil no hay panel de marca: las mismas 3 promesas, discretas al pie. */}
        <ul className="relative flex flex-col items-center gap-1.5 pb-6 pt-2 text-xs text-paper-dim lg:hidden">
          {d.perks.map((p) => (
            <li key={p} className="flex items-center gap-1.5">
              <Check size={12} strokeWidth={3} aria-hidden className="shrink-0 text-brand" /> {p}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

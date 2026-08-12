'use client';

// /start — landing directa para la modelo: al grano qué hacemos por ella, pares
// de Julia Parker (real vs IA) uno al lado del otro, y la mandamos a registrarse.
// El clon es GRATIS: ella solo sube fotos y da instrucciones. Hero con el mismo
// video cinematográfico de la home.

import Link from 'next/link';
import { ArrowRight, Upload, MessageSquare, Sparkles, Gift } from 'lucide-react';
import { useLang } from '@/app/providers';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';

// Pares: cada uno es la MISMA modelo — una foto suya (candid, "real") y una que
// hizo su clon IA (estudio). Van una al lado de la otra, etiquetadas.
const PAIRS = [
  { real: '/lib/despertar-desayuno.jpg', ai: '/lib/julia-perfil-3.jpg' },
  { real: '/lib/ciudad-rooftop.jpg', ai: '/lib/julia-perfil-6.jpg' },
  { real: '/lib/lluvia-cafe.jpg', ai: '/lib/julia-frontal-1.jpg' },
];

const COPY = {
  es: {
    login: 'Ya tengo cuenta',
    eyebrow: 'Para modelos y creadoras',
    h1a: 'Te hacemos tu clon con IA,',
    h1b: 'gratis.',
    sub: 'Tú solo subes tus fotos y nos dices qué quieres. Nosotros te entregamos contenido listo para vender — cada día. Sin cámara, sin sesiones, sin fotógrafo.',
    cta: 'Registrarme gratis',
    ctaNote: 'Crear tu clon no cuesta nada. Solo pagas el contenido si te gusta.',
    galleryTitle: '¿Real o IA?',
    gallerySub: 'Todas son la misma modelo. Unas son fotos suyas, otras las hizo su clon. ¿Notas la diferencia? Tus fans tampoco.',
    real: 'Real', ai: 'IA',
    howTitle: 'Así de simple',
    steps: [
      { icon: Upload, t: 'Subes tus fotos', d: 'Unas cuantas fotos tuyas. Nosotros entrenamos tu clon con ellas.' },
      { icon: MessageSquare, t: 'Dices qué quieres', d: 'Escenas, ropa, estilo, poses… tú das las instrucciones.' },
      { icon: Sparkles, t: 'Recibes tu contenido', d: 'Fotos y videos listos para vender, en tu portal, cada día.' },
    ],
    freeTitle: 'Tu clon es 100% gratis',
    freeSub: 'Crearlo no te cuesta nada. Subes tus fotos, das las instrucciones, y lo armamos por ti. Solo pagas por el contenido — y solo si te encanta.',
    finalTitle: '¿Lista para dejar de depender de las sesiones?',
    finalSub: 'Crea tu clon hoy. Toma un minuto.',
  },
  en: {
    login: 'I already have an account',
    eyebrow: 'For models & creators',
    h1a: 'We build your AI clone,',
    h1b: 'free.',
    sub: 'You just upload your photos and tell us what you want. We deliver sell-ready content — every day. No camera, no shoots, no photographer.',
    cta: 'Sign up free',
    ctaNote: 'Building your clone costs nothing. You only pay for content if you love it.',
    galleryTitle: 'Real or AI?',
    gallerySub: "They're all the same model. Some are her own photos, some were made by her clone. Can you tell? Your fans can't either.",
    real: 'Real', ai: 'AI',
    howTitle: 'This simple',
    steps: [
      { icon: Upload, t: 'Upload your photos', d: 'A handful of photos of you. We train your clone on them.' },
      { icon: MessageSquare, t: 'Say what you want', d: 'Scenes, outfits, style, poses… you give the instructions.' },
      { icon: Sparkles, t: 'Get your content', d: 'Sell-ready photos and videos in your portal, every day.' },
    ],
    freeTitle: 'Your clone is 100% free',
    freeSub: "Building it costs you nothing. Upload your photos, give the instructions, and we build it for you. You only pay for content — and only if you love it.",
    finalTitle: 'Ready to stop depending on photoshoots?',
    finalSub: 'Create your clone today. Takes a minute.',
  },
};

export default function StartPage() {
  const { lang } = useLang();
  const c = COPY[lang] || COPY.en;

  return (
    <main className="relative bg-ink text-paper">
      {/* ── HERO con el video cinematográfico de la home ─────────────────── */}
      <div className="relative min-h-[100svh] w-full overflow-hidden">
        <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="/hero-miami-poster.jpg" aria-hidden>
          <source src="/hero-miami.mp4" type="video/mp4" />
        </video>
        {/* Overlays — dejan respirar el video pero mantienen legible el texto */}
        <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/25 to-ink" aria-hidden />
        <div className="pointer-events-none absolute inset-0" aria-hidden
          style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 40%, transparent 48%, rgb(var(--bg) / 0.6) 100%)' }} />

        <div className="relative z-10 flex min-h-[100svh] flex-col">
          {/* Header */}
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
            <Logo size="sm" />
            <div className="flex items-center gap-3">
              <LangToggle />
              <Link href="/login" className="text-sm font-medium text-paper-mute transition-colors hover:text-paper">{c.login}</Link>
            </div>
          </header>

          {/* Hero content — centrado sobre el video */}
          <section className="flex flex-1 items-center">
            <div className="mx-auto w-full max-w-3xl px-5 pb-20 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper backdrop-blur">
                <Sparkles size={12} className="text-brand" /> {c.eyebrow}
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] sm:text-7xl">
                {c.h1a} <span className="text-brand">{c.h1b}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-paper/85 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] sm:text-lg">{c.sub}</p>
              <div className="mt-9 flex flex-col items-center gap-3">
                <Link href="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.03]">
                  {c.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <p className="text-xs text-paper/70">{c.ctaNote}</p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Real vs IA — pares uno al lado del otro ──────────────────────── */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 pt-20 sm:pt-28">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.galleryTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-paper-mute sm:text-base">{c.gallerySub}</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PAIRS.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2.5">
              <FigureCard src={p.real} label={c.real} tone="real" />
              <FigureCard src={p.ai} label={c.ai} tone="ai" />
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona — 3 pasos ──────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 pt-20 sm:pt-28">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.howTitle}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {c.steps.map((s, i) => (
            <div key={i} className="group rounded-2xl border border-line bg-card p-6 transition-colors hover:border-brand/30">
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand transition-transform group-hover:scale-105"><s.icon size={20} /></span>
                <span className="font-mono text-sm font-bold text-paper-dim/60">0{i + 1}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-paper">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Gratis ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-20 sm:pt-28">
        <div className="relative overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/[0.10] to-transparent p-8 text-center sm:p-12">
          <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand/15 text-brand"><Gift size={26} /></span>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{c.freeTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-paper-mute sm:text-base">{c.freeSub}</p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-2xl px-5 py-20 text-center sm:py-28">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{c.finalTitle}</h2>
        <p className="mt-3 text-sm text-paper-mute sm:text-base">{c.finalSub}</p>
        <Link href="/signup"
          className="group mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.03]">
          {c.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="mt-10 text-xs text-paper-dim">LetShoot · letshoot.ai</p>
      </section>
    </main>
  );
}

function FigureCard({ src, label, tone }) {
  return (
    <figure className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-2 shadow-lg ring-1 ring-white/[0.04]">
      <div className="aspect-[3/4] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden />
      <figcaption className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${tone === 'ai' ? 'bg-brand/90 text-on-accent' : 'bg-black/55 text-white ring-1 ring-white/15'}`}>
        {label}
      </figcaption>
    </figure>
  );
}

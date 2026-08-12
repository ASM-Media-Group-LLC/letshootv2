'use client';

// /start — landing directa para la modelo: al grano qué hacemos por ella, pares
// de Julia Parker (real vs IA) uno al lado del otro, y la mandamos a registrarse.
// El clon es GRATIS: ella solo sube fotos y da instrucciones.

import Link from 'next/link';
import { ArrowRight, Camera, Upload, MessageSquare, Sparkles, Check, Gift } from 'lucide-react';
import { useLang } from '@/app/providers';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';

// Pares: cada uno es la MISMA modelo — una foto suya (real) y una que hizo su
// clon IA (estudio). Van una al lado de la otra, etiquetadas.
const PAIRS = [
  { real: '/lib/despertar-desayuno.jpg', ai: '/lib/julia-perfil-3.jpg' },
  { real: '/lib/gimnasio-entrenando.jpg', ai: '/lib/julia-body-2.jpg' },
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
    <main className="relative min-h-[100svh] overflow-hidden bg-ink text-paper">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" aria-hidden />

      {/* Header */}
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo size="sm" />
        <div className="flex items-center gap-3">
          <LangToggle />
          <Link href="/login" className="text-sm font-medium text-paper-mute transition-colors hover:text-paper">{c.login}</Link>
        </div>
      </header>

      {/* Hero — al grano */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <Sparkles size={12} /> {c.eyebrow}
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {c.h1a} <span className="text-brand">{c.h1b}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-paper-mute sm:text-lg">{c.sub}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
            {c.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <p className="text-xs text-paper-dim">{c.ctaNote}</p>
        </div>
      </section>

      {/* Real vs IA — pares uno al lado del otro */}
      <section className="relative z-10 mx-auto max-w-5xl px-5 pt-16 sm:pt-24">
        <div className="text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{c.galleryTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-paper-mute">{c.gallerySub}</p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {PAIRS.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <FigureCard src={p.real} label={c.real} tone="real" />
              <FigureCard src={p.ai} label={c.ai} tone="ai" />
            </div>
          ))}
        </div>
      </section>

      {/* Cómo funciona — 3 pasos */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 pt-16 sm:pt-24">
        <h2 className="text-center font-display text-2xl font-semibold sm:text-3xl">{c.howTitle}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {c.steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><s.icon size={19} /></span>
                <span className="font-mono text-xs font-bold text-paper-dim">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-paper">{s.t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-paper-mute">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gratis */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-16 sm:pt-24">
        <div className="rounded-3xl border border-brand/25 bg-gradient-to-br from-brand/[0.08] to-transparent p-7 text-center sm:p-10">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand"><Gift size={24} /></span>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{c.freeTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-paper-mute sm:text-base">{c.freeSub}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-2xl px-5 py-16 text-center sm:py-24">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">{c.finalTitle}</h2>
        <p className="mt-2 text-sm text-paper-mute">{c.finalSub}</p>
        <Link href="/signup"
          className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
          {c.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Link>
        <p className="mt-8 text-xs text-paper-dim">LetShoot · letshoot.ai</p>
      </section>
    </main>
  );
}

function FigureCard({ src, label, tone }) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-line bg-ink-2">
      <div className="aspect-[3/4]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <figcaption className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${tone === 'ai' ? 'bg-brand/85 text-on-accent' : 'bg-ink/70 text-paper'}`}>
        {label}
      </figcaption>
    </figure>
  );
}

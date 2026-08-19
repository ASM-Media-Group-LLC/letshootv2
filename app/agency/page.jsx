'use client';

// Landing pública para agencias de OnlyFans. Mismo lenguaje visual del homepage
// (video Miami de fondo, tipografía editorial, chips glassy) — pero copy y CTAs
// enfocados en agencias: escala, tráfico multi-red, dashboard, y una pieza clara
// para pedir invitación como agencia.
//
// «Register as agency» lleva a mailto con asunto preseteado — la agencia real
// la aprueba el admin desde /admin (invita al dueño de la agencia y luego a
// sus empleados).

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Building2, TrendingUp, LayoutDashboard, Users, Play, Sparkles } from 'lucide-react';
import { useLang } from '@/app/providers';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SocialLogos from '@/components/SocialLogos';

const ease = [0.22, 1, 0.36, 1];

const COPY = {
  en: {
    eyebrow: 'For OnlyFans agencies',
    h1a: 'Scale content for every model',
    h1b: 'on your roster.',
    sub: 'One dashboard. Every creator, every day, every situation. Engage inside OnlyFans, drive traffic from social — for your entire agency at once.',
    ctaPrimary: 'Register as agency',
    ctaSecondary: 'Log in',
    platformsSellOn: 'Engage on',
    platformsTrafficFrom: 'and drive traffic from',
    valueLabel: 'Built for agencies',
    valueTitle: 'What you get when your whole roster runs on LetShoot',
    valueSub: 'Not just content — the operations layer under it. Priced for volume, designed to scale.',
    cards: [
      { icon: Users, title: 'Every creator, daily', body: 'Sell-ready photo and video for each model on your roster — delivered every day, no shoots, no delays.' },
      { icon: TrendingUp, title: 'Traffic-ready assets', body: 'Content designed to post on Instagram, Reddit, TikTok, Telegram and X — engagement that pulls fans into OnlyFans.' },
      { icon: LayoutDashboard, title: 'One dashboard', body: 'See production, sales and requests for every model in one place. Assign employees to specific creators with granular access.' },
      { icon: Building2, title: 'Agency pricing', body: 'One plan for your entire roster. No per-shoot fees. Talk to us — we build the volume plan around your operation.' },
    ],
    finalTitle: 'Ready to run your whole agency from one place?',
    finalSub: 'Tell us about your operation and we\'ll set you up.',
  },
  es: {
    eyebrow: 'Para agencias de OnlyFans',
    h1a: 'Escala el contenido de cada modelo',
    h1b: 'de tu roster.',
    sub: 'Un dashboard. Cada creadora, cada día, cada situación. Engancha dentro de OnlyFans, trae tráfico desde redes — para toda tu agencia a la vez.',
    ctaPrimary: 'Registrar mi agencia',
    ctaSecondary: 'Iniciar sesión',
    platformsSellOn: 'Engancha en',
    platformsTrafficFrom: 'y trae tráfico desde',
    valueLabel: 'Hecho para agencias',
    valueTitle: 'Lo que obtienes cuando todo tu roster corre en LetShoot',
    valueSub: 'No solo contenido — la operación debajo. Precio de volumen, diseño para escalar.',
    cards: [
      { icon: Users, title: 'Cada creadora, todos los días', body: 'Fotos y videos listos para vender para cada modelo del roster — entregados a diario, sin sesiones, sin esperas.' },
      { icon: TrendingUp, title: 'Contenido para tráfico', body: 'Piezas pensadas para postear en Instagram, Reddit, TikTok, Telegram y X — enganche que trae fans a OnlyFans.' },
      { icon: LayoutDashboard, title: 'Un solo dashboard', body: 'Producción, ventas y pedidos de cada modelo en un solo lugar. Asigna empleados a creadoras específicas con acceso granular.' },
      { icon: Building2, title: 'Precio de agencia', body: 'Un plan para todo tu roster. Sin cobros por sesión. Hablamos contigo — armamos el plan de volumen alrededor de tu operación.' },
    ],
    finalTitle: '¿Lista para operar toda tu agencia desde un solo lugar?',
    finalSub: 'Cuéntanos de tu operación y te lo dejamos listo.',
  },
};

export default function AgencyLandingPage() {
  const { lang } = useLang();
  const c = COPY[lang] || COPY.en;
  const mailtoHref = `mailto:hello@letshoot.ai?subject=${encodeURIComponent('Agency partnership — LetShoot')}&body=${encodeURIComponent('Hi LetShoot team,\n\nWe run an OnlyFans agency and would like to know more.\n\nAgency name:\nWebsite / social:\nNumber of creators:\nBest contact:\n\nThanks!')}`;

  return (
    <main className="relative z-10 min-h-screen bg-ink">
      <Nav />

      {/* ── Cinematic hero — mismo lenguaje visual del homepage ─────────────── */}
      <section id="top" className="relative w-full bg-ink">
        <div className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden">
          <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline poster="/hero-miami-poster.jpg" aria-hidden>
            <source src="/hero-miami.mp4" type="video/mp4" />
          </video>
          <div className="pointer-events-none absolute inset-0 bg-black/35" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{ background: 'radial-gradient(ellipse 88% 78% at 50% 42%, transparent 52%, rgb(var(--bg) / 0.55) 100%)' }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease }}
            className="relative z-10 flex w-full flex-1 items-center"
          >
            <div className="mx-auto flex w-full max-w-6xl px-6 pt-24 sm:px-10">
              <div className="max-w-[46rem] text-left">
                <motion.span
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease, delay: 0.25 }}
                  className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-4 pr-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 shadow-[0_2px_20px_rgba(0,0,0,0.3)] backdrop-blur-md sm:text-[12px]"
                >
                  <Building2 size={13} className="text-brand" /> {c.eyebrow}
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.95, ease, delay: 0.36 }}
                  className="headline text-balance text-[clamp(2.1rem,5.2vw,4.1rem)] font-bold leading-[1.04] tracking-[-0.02em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]"
                >
                  {c.h1a} <span className="text-brand">{c.h1b}</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease, delay: 0.5 }}
                  className="mt-5 max-w-[36rem] text-balance text-lg leading-relaxed text-white/85 drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] sm:text-xl"
                >
                  {c.sub}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, ease, delay: 0.58 }}
                >
                  <SocialLogos sellOn={c.platformsSellOn} trafficFrom={c.platformsTrafficFrom} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.75, ease, delay: 0.72 }}
                  className="mt-8 flex flex-wrap items-center gap-3.5"
                >
                  <a
                    href={mailtoHref}
                    className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
                  >
                    <Building2 size={17} /> {c.ctaPrimary}
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
                  </a>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
                  >
                    <Play size={16} /> {c.ctaSecondary}
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Value — cómo ayuda a la agencia ─────────────────────────────────── */}
      <section className="relative bg-ink py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand sm:text-[11px]">
              <Sparkles size={12} /> {c.valueLabel}
            </span>
            <h2 className="font-display text-balance text-[clamp(1.75rem,3.6vw,2.6rem)] font-bold leading-tight text-paper">
              {c.valueTitle}
            </h2>
            <p className="mt-4 text-balance text-base leading-relaxed text-paper-mute sm:text-lg">
              {c.valueSub}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {c.cards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className="group relative overflow-hidden rounded-3xl border border-line bg-card p-6 transition-colors hover:border-brand/40 sm:p-7"
                >
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-transform group-hover:scale-105">
                    <Icon size={19} />
                  </span>
                  <h3 className="font-display text-lg font-semibold text-paper">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper-mute">{card.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="relative bg-ink pb-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/[0.08] to-transparent px-6 py-12 text-center shadow-glow-sm sm:px-10 sm:py-14">
          <h3 className="font-display text-2xl font-bold text-paper sm:text-3xl">{c.finalTitle}</h3>
          <p className="mt-3 text-base text-paper-mute">{c.finalSub}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href={mailtoHref}
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
            >
              <Building2 size={17} /> {c.ctaPrimary}
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-7 py-3.5 text-base font-medium text-paper transition-colors hover:border-brand/40"
            >
              {c.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

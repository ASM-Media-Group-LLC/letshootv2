'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import Particles from './Particles';

// ── Simple hero: CTA left + before/after comparison right ─────────────────────

// Before/After labels per lang
const BA_LABELS = {
  es: { before: 'Contenido real', after: 'Contenido IA' },
  en: { before: 'Real content', after: 'AI content' },
  pt: { before: 'Conteúdo real', after: 'Conteúdo IA' },
  fr: { before: 'Contenu réel', after: 'Contenu IA' },
  de: { before: 'Echter Inhalt', after: 'KI-Inhalt' },
  it: { before: 'Contenuto reale', after: 'Contenuto IA' },
  zh: { before: '真实内容', after: 'AI 内容' },
};

const ease = [0.22, 1, 0.36, 1];

export default function CinematicHero() {
  const { t, lang } = useLang();
  const baLbl = BA_LABELS[lang] || BA_LABELS.es;

  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden">
      {/* Animated gradient backdrop */}
      <AnimatedGradientBg topOffset={20} />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden />
      {/* Floating particles that drift with the cursor */}
      <Particles className="z-[2]" parallax={30} />

      {/* Content — pt accounts for the fixed nav so nothing hugs the topbar */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col-reverse items-center justify-center gap-12 px-5 pb-20 pt-32 sm:pt-36 lg:flex-row lg:gap-16 lg:py-32">

        {/* ── LEFT: CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="flex flex-1 flex-col items-center text-center lg:items-start lg:text-left"
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-brand"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            {t.hero.eyebrow}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease, delay: 0.22 }}
            className="headline text-[clamp(2.6rem,5.5vw,5rem)] leading-[1.05] text-paper [text-wrap:balance]"
          >
            {t.hero.pre}{' '}
            <span className="text-rainbow" style={{ paddingBlock: '0.06em' }}>
              {t.hero.highlight}
            </span>
          </motion.h1>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease, delay: 0.42 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <a
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
            >
              {t.hero.ctaPrimary}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#before-after"
              className="glass-ios inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium text-paper transition-colors hover:text-brand"
            >
              {t.hero.ctaSecondary}
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.52 }}
            className="mt-10 flex items-stretch gap-8"
          >
            {t.hero.stats.map((s, i) => (
              <div key={i} className="text-center lg:text-left">
                <div className="font-display text-3xl font-bold text-brand">{s.n}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-paper-mute">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── RIGHT: Before / After side-by-side (real vs IA) ──────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.3 }}
          className="w-full max-w-sm flex-shrink-0 lg:max-w-xl"
        >
          <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
            {/* Real */}
            <motion.figure
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease, delay: 0.55 }}
              className="relative overflow-hidden rounded-3xl"
              style={{ aspectRatio: '4 / 5', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(var(--overlay)/0.12)' }}
            >
              <img src="/hero-real.jpg" alt={baLbl.before} className="h-full w-full object-cover" style={{ objectPosition: '50% 12%' }} draggable={false} />
              <motion.figcaption
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease, delay: 0.9 }}
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-md"
                style={{ background: 'rgba(7,10,15,0.6)' }}
              >
                {baLbl.before}
              </motion.figcaption>
            </motion.figure>

            {/* AI */}
            <motion.figure
              initial={{ opacity: 0, y: 36, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease, delay: 0.95 }}
              className="relative overflow-hidden rounded-3xl"
              style={{ aspectRatio: '4 / 5', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(var(--overlay)/0.12)' }}
            >
              <img src="/hero-ia.jpg" alt={baLbl.after} className="h-full w-full object-cover" style={{ objectPosition: '50% 12%' }} draggable={false} />
              <motion.figcaption
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease, delay: 1.3 }}
                className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-accent shadow-glow"
              >
                {baLbl.after}
              </motion.figcaption>
            </motion.figure>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 1.45 }}
            className="mt-5 text-center font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            {lang === 'es' ? 'De contenido real a IA en segundos' :
             lang === 'en' ? 'Real content to AI in seconds' :
             lang === 'pt' ? 'De conteúdo real a IA em segundos' :
             lang === 'fr' ? 'Du contenu réel à l’IA en secondes' :
             lang === 'de' ? 'Von echtem Content zu KI in Sekunden' :
             lang === 'it' ? 'Da contenuto reale a IA in secondi' :
             '真实内容秒变 AI'}
          </motion.p>
        </motion.div>

      </div>
    </section>
  );
}

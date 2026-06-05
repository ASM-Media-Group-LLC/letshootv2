'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import BeforeAfter from './BeforeAfter';

// ── Simple hero: CTA left + before/after comparison right ─────────────────────

// Before/After labels per lang
const BA_LABELS = {
  es: { before: 'Foto real', after: 'Foto IA' },
  en: { before: 'Real photo', after: 'AI photo' },
  pt: { before: 'Foto real', after: 'Foto IA' },
  fr: { before: 'Photo réelle', after: 'Photo IA' },
  de: { before: 'Echtes Foto', after: 'KI-Foto' },
  it: { before: 'Foto reale', after: 'Foto IA' },
  zh: { before: '真实照片', after: 'AI 照片' },
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

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-12 px-5 py-24 lg:flex-row lg:gap-16 lg:py-0">

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
            className="headline text-[clamp(2.6rem,5.5vw,5rem)] leading-[1.05] text-paper"
          >
            {t.hero.pre}{' '}
            <span className="text-rainbow inline-block" style={{ paddingBlock: '0.06em' }}>
              {t.hero.highlight}
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.32 }}
            className="mt-6 max-w-lg text-lg leading-relaxed text-paper-mute"
          >
            {t.hero.body}
          </motion.p>

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

        {/* ── RIGHT: Before/After comparison ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 32, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.85, ease, delay: 0.28 }}
          className="w-full max-w-sm flex-shrink-0 lg:max-w-md"
        >
          <BeforeAfter
            before="/ba-before-1.jpg"
            after="/ba-after-1.jpg"
            beforeLabel={baLbl.before}
            afterLabel={baLbl.after}
            alt="Transformación LetShoot"
          />
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            {lang === 'es' ? 'Toca para revelar la transformación' :
             lang === 'en' ? 'Tap to reveal the transformation' :
             lang === 'pt' ? 'Toca para revelar a transformação' :
             lang === 'fr' ? 'Touche pour révéler la transformation' :
             lang === 'de' ? 'Tippe um die Verwandlung zu sehen' :
             lang === 'it' ? 'Tocca per rivelare la trasformazione' :
             '点击查看变化'}
          </p>
        </motion.div>

      </div>
    </section>
  );
}

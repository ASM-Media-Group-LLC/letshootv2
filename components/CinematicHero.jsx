'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import Particles from './Particles';
import CoverflowMarquee from './CoverflowMarquee';

const ease = [0.22, 1, 0.36, 1];

// AI-generated showcase images for the coverflow carousel
const SHOWCASE = [
  '/hero-ia.jpg', '/result-2.jpg', '/card-moda.jpg', '/card-estilista.jpg',
  '/card-localizacion.jpg', '/result-4.jpg', '/result-5.jpg', '/hero-stage-5.jpg',
];

export default function CinematicHero() {
  const { t } = useLang();

  return (
    <section id="hero" className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Animated backdrop */}
      <AnimatedGradientBg topOffset={20} />
      <Particles className="z-[2]" parallax={28} />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden />

      {/* ── Centered text ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pt-28 text-center sm:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-brand"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          {t.hero.eyebrow}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease, delay: 0.18 }}
          className="headline mx-auto max-w-4xl text-[clamp(2.6rem,6.5vw,5.5rem)] leading-[1.02] text-paper [text-wrap:balance]"
        >
          {t.hero.pre}{' '}
          <span className="text-rainbow" style={{ paddingBlock: '0.06em' }}>{t.hero.highlight}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease, delay: 0.3 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-paper-mute [text-wrap:balance]"
        >
          {t.hero.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.42 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
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
      </div>

      {/* ── 3D coverflow carousel ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.5 }}
        className="relative z-[2] mt-6 h-[clamp(240px,40vh,420px)] w-full"
      >
        <CoverflowMarquee images={SHOWCASE} />
      </motion.div>
    </section>
  );
}

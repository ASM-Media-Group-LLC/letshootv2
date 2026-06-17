'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import AnimatedGradientBg from './AnimatedGradientBg';
import Particles from './Particles';
import PanoramaCarousel from './PanoramaCarousel';

const ease = [0.22, 1, 0.36, 1];

// AI-generated showcase images for the coverflow carousel
const SHOWCASE = [
  '/result-2.jpg', '/card-locacion.jpg', '/card-moda.jpg', '/card-estilista.jpg',
  '/result-4.jpg', '/card-hd.jpg', '/result-5.jpg',
];

export default function CinematicHero() {
  const { t } = useLang();

  return (
    <section id="hero" className="relative flex min-h-screen w-full flex-col overflow-hidden">
      {/* Animated backdrop */}
      <AnimatedGradientBg topOffset={20} />
      <Particles className="z-[2]" parallax={28} />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-ink" aria-hidden />

      {/* ── Centered text (minimal) ──────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center px-5 pt-24 text-center sm:pt-28">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease, delay: 0.15 }}
          className="headline mx-auto whitespace-nowrap text-[clamp(1.6rem,5vw,4rem)] leading-[1.05] text-paper"
        >
          {t.hero.pre}{' '}
          <span className="text-rainbow" style={{ paddingBlock: '0.06em' }}>{t.hero.highlight}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.32 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="#pricing"
            className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
          >
            {t.hero.ctaPrimary}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
          <a
            href="#results"
            className="glass-ios inline-flex items-center rounded-full px-7 py-3.5 text-base font-medium text-paper transition-colors hover:text-brand"
          >
            {t.hero.ctaSecondary}
          </a>
        </motion.div>
      </div>

      {/* ── 3D coverflow carousel (the centerpiece) ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.45 }}
        className="relative z-[2] mt-8 flex flex-1 items-center"
      >
        <div className="h-[clamp(320px,56vh,580px)] w-full">
          <PanoramaCarousel images={SHOWCASE} />
        </div>
      </motion.div>
    </section>
  );
}

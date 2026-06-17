'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useLang } from '@/app/providers';
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
    <section id="hero" className="relative w-full bg-ink">
      {/* ── Full-screen cinematic video intro ─────────────────────────────── */}
      <div className="relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden">
        {/* Looping video background */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
          aria-hidden
        >
          <source src="/hero-avatar.mp4" type="video/mp4" />
        </video>

        {/* Cinematic overlays for mood + text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/75 via-transparent to-ink" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: 'radial-gradient(ellipse 72% 60% at 50% 45%, transparent 38%, rgb(var(--bg) / 0.6) 100%)' }}
        />

        {/* ── Intro content (the "wow" reveal) ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease }}
          className="relative z-10 flex flex-col items-center px-5 text-center"
        >
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.25 }}
            className="mb-5 inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur sm:text-[11px]"
          >
            {t.hero.eyebrow}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.95, ease, delay: 0.36 }}
            className="headline mx-auto max-w-[15ch] text-[clamp(2.1rem,7vw,5rem)] leading-[1.02] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.65)] sm:max-w-none sm:whitespace-nowrap"
          >
            {t.hero.pre}{' '}
            <span className="text-rainbow" style={{ paddingBlock: '0.06em' }}>{t.hero.highlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease, delay: 0.55 }}
            className="mx-auto mt-5 max-w-xl text-[clamp(0.95rem,2.2vw,1.15rem)] leading-relaxed text-white/85 drop-shadow-[0_1px_12px_rgba(0,0,0,0.7)]"
          >
            {t.hero.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease, delay: 0.72 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
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
              className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              {t.hero.ctaSecondary}
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease, delay: 1.15 }}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2"
          aria-hidden
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <ChevronDown size={26} className="text-white/55" />
          </motion.div>
        </motion.div>
      </div>

      {/* ── Showcase coverflow band ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease }}
        className="relative z-[2] pb-16 pt-4"
      >
        <div className="h-[clamp(320px,52vh,560px)] w-full">
          <PanoramaCarousel images={SHOWCASE} />
        </div>
      </motion.div>
    </section>
  );
}

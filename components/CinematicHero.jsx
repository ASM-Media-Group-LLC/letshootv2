'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
      <div className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden">
        {/* Looping cinematic video background (Miami / Ocean Drive) */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-miami-poster.jpg"
          aria-hidden
        >
          <source src="/hero-miami.mp4" type="video/mp4" />
        </video>

        {/* Cinematic overlays — light enough to let the footage pop, dark enough to read */}
        <div className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-ink" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: 'radial-gradient(ellipse 88% 78% at 50% 42%, transparent 52%, rgb(var(--bg) / 0.55) 100%)' }}
        />

        {/* ── Intro content — left-aligned editorial layout ───────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease }}
          className="relative z-10 flex w-full flex-1 items-center"
        >
          <div className="mx-auto flex w-full max-w-6xl px-6 sm:px-10">
            <div className="max-w-[44rem] text-left">
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease, delay: 0.25 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85 shadow-[0_2px_20px_rgba(0,0,0,0.3)] backdrop-blur-md sm:text-[11px]"
              >
                {t.hero.eyebrowPre ? (
                  <>
                    {t.hero.eyebrowPre}
                    <img src="/onlyfans-logo.png" alt="OnlyFans" className="inline h-3.5 w-auto sm:h-4" draggable={false} />
                    {t.hero.eyebrowPost}
                  </>
                ) : t.hero.eyebrow}
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 26, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.95, ease, delay: 0.36 }}
                className="headline text-balance text-[clamp(2.1rem,5.2vw,4.1rem)] font-bold leading-[1.04] tracking-[-0.02em] text-white drop-shadow-[0_2px_34px_rgba(0,0,0,0.75)]"
              >
                {(() => {
                  const raw = t.hero.pre.replace(/\s*—\s*$/, '');
                  const parts = raw.split('OnlyFans');
                  if (parts.length === 1) return raw;
                  return (
                    <>
                      {parts[0]}
                      <img
                        src="/onlyfans-logo.png"
                        alt="OnlyFans"
                        className="inline-block h-[0.8em] w-auto translate-y-[0.1em] drop-shadow-[0_2px_20px_rgba(0,175,240,0.4)]"
                        draggable={false}
                      />
                      {parts.slice(1).join('OnlyFans')}
                    </>
                  );
                })()}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, ease, delay: 0.6 }}
                className="mt-9 flex flex-wrap items-center gap-3.5"
              >
                <a
                  href="#por-que"
                  className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
                >
                  {t.hero.ctaPrimary}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
                >
                  {t.hero.ctaSecondary}
                </a>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Value proposition — bottom bar, three columns ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.85 }}
          className="relative z-10 w-full pb-10 sm:pb-12"
        >
          <div className="mx-auto max-w-6xl px-6 sm:px-10">
            <div className="grid grid-cols-3 divide-x divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md">
              {t.hero.highlight.split(',').map((seg, i) => (
                <div key={i} className="px-3 py-4 text-center sm:px-6 sm:py-5">
                  <span className="text-rainbow font-display text-[clamp(0.9rem,2vw,1.5rem)] font-semibold tracking-tight">
                    {seg.trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
        <div className="h-56 w-full sm:h-[clamp(320px,52vh,560px)]">
          <PanoramaCarousel images={SHOWCASE} />
        </div>
      </motion.div>
    </section>
  );
}

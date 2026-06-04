'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

export default function Hero() {
  const { t } = useLang();
  const h = t.hero;

  return (
    <section id="top" className="relative overflow-hidden pb-20 pt-32 sm:pt-40 lg:pb-28">
      {/* Soft brand glow field */}
      <div className="blob left-[-10%] top-[2%] h-[460px] w-[460px] animate-blob bg-brand/20" aria-hidden />
      <div className="blob right-[-8%] top-[10%] h-[420px] w-[420px] animate-blob bg-iris/18" aria-hidden style={{ animationDelay: '-4s' }} />
      <div className="blob left-[30%] top-[44%] h-[380px] w-[380px] animate-blob bg-sky/12" aria-hidden style={{ animationDelay: '-8s' }} />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        {/* Left — copy */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-brand"
          >
            <Sparkles size={13} aria-hidden />
            {h.eyebrow}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
            className="headline text-[clamp(2.75rem,7.5vw,5.5rem)] text-paper"
          >
            <span className="block">{h.pre}</span>
            <span className="text-rainbow mt-1 inline-block">{h.highlight}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.12 }}
            className="mt-7 max-w-xl text-lg leading-relaxed text-paper-mute"
          >
            {h.body}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <a
              href="#pricing"
              className="group inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-ink shadow-glow transition-transform hover:scale-[1.04]"
            >
              {h.ctaPrimary}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#results"
              className="inline-flex items-center gap-2 rounded-full border border-line px-7 py-3.5 text-base font-semibold text-paper transition-colors hover:border-brand hover:text-brand"
            >
              {h.ctaSecondary}
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.28 }}
            className="mt-12 flex max-w-md items-stretch gap-4"
          >
            {h.stats.map((s, i) => (
              <div key={i} className="flex-1">
                <div className="font-display text-3xl font-bold text-brand sm:text-4xl">{s.n}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-paper-dim">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — tilted photo card with stickers */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: 6 }}
          animate={{ opacity: 1, scale: 1, rotate: 3 }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="animate-floatY">
            <div className="overflow-hidden rounded-[2rem] border-2 border-paper/10 shadow-2xl shadow-black/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/result-2.jpg"
                alt="Sesión generada con IA en una playa al atardecer"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>

            {/* Sticker — IA (glass) */}
            <div className="glass absolute -right-3 top-6 rotate-3 rounded-2xl border border-white/15 px-4 py-2 font-display text-sm font-semibold text-brand shadow-soft">
              100% IA
            </div>
            {/* Sticker — location */}
            <div className="absolute -left-4 bottom-10 -rotate-2 rounded-2xl bg-brand px-4 py-2 font-display text-sm font-semibold text-ink shadow-glow-sm">
              Maldivas · 0 km
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

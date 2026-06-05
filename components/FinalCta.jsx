'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

export default function FinalCta() {
  const { t } = useLang();
  const c = t.finalCta;

  return (
    <section className="relative w-full bg-ink py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease }}
        className="card-grad relative overflow-hidden rounded-[2.5rem] border border-brand/25 px-6 py-16 text-center shadow-soft sm:py-24"
      >
        {/* ── Animated background ─────────────────────────────────────────── */}
        {/* Slow rotating conic sheen */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[160%] w-[160%] -translate-x-1/2 -translate-y-1/2 opacity-[0.18]"
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(0,177,246,0.55) 18%, transparent 38%, transparent 62%, rgba(127,224,255,0.45) 80%, transparent 100%)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, ease: 'linear', repeat: Infinity }}
        />
        {/* Drifting aurora orbs */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-[12%] -top-[30%] h-[380px] w-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(0,177,246,0.40), transparent 70%)' }}
          animate={{ x: [0, 70, 0], y: [0, 36, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 13, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-[12%] -bottom-[30%] h-[400px] w-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(127,224,255,0.32), transparent 70%)' }}
          animate={{ x: [0, -60, 0], y: [0, -30, 0], scale: [1.1, 1, 1.1] }}
          transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.30), transparent 70%)' }}
          animate={{ x: [-40, 40, -40], y: [0, 24, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 19, ease: 'easeInOut', repeat: Infinity }}
        />
        {/* Soft inner vignette to keep the copy readable */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 35%, rgb(var(--bg) / 0.55) 100%)' }}
        />

        <div className="relative">
          <h2 className="headline mx-auto max-w-3xl text-[clamp(2.5rem,7vw,5rem)] text-paper">
            {c.titleA} <span className="text-rainbow">{c.highlight}</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-paper-mute">{c.body}</p>
          <a
            href="#pricing"
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-lg font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.04]"
          >
            {c.cta}
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </a>
        </div>
      </motion.div>
      </div>
    </section>
  );
}

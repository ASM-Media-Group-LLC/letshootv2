'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';
import Particles from './Particles';

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
        {/* ── Animated background: floating blue particles ────────────────── */}
        {/* Two soft ambient glows for depth */}
        <div className="pointer-events-none absolute -left-[10%] top-[-20%] h-[340px] w-[340px] rounded-full" aria-hidden
          style={{ background: 'radial-gradient(circle, rgba(0,177,246,0.18), transparent 70%)' }} />
        <div className="pointer-events-none absolute -right-[10%] bottom-[-20%] h-[360px] w-[360px] rounded-full" aria-hidden
          style={{ background: 'radial-gradient(circle, rgba(127,224,255,0.14), transparent 70%)' }} />

        {/* Floating particles (drift with the cursor) */}
        <Particles interactive parallax={18} />

        {/* Soft inner vignette to keep the copy readable */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 45%, rgb(var(--bg) / 0.45) 100%)' }}
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

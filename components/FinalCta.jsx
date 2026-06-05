'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLang } from '@/app/providers';

const ease = [0.22, 1, 0.36, 1];

// Deterministic floating blue particles (no Math.random → SSR-safe)
const BLUES = ['rgba(0,177,246,1)', 'rgba(127,224,255,1)', 'rgba(10,132,255,1)'];
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 36.7) % 100,
  y: (i * 21.3) % 100,
  size: 2 + (i % 4),              // 2–5px
  dur: 9 + (i % 7) * 1.8,         // 9–19.8s
  delay: (i % 9) * 0.7,           // 0–5.6s
  drift: 30 + (i % 5) * 14,       // 30–86px upward
  sway: ((i % 3) - 1) * 18,       // -18 / 0 / 18px
  op: 0.35 + (i % 4) * 0.14,      // 0.35–0.77
  color: BLUES[i % BLUES.length],
}));

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

        {/* Particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {PARTICLES.map((pt, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${pt.x}%`, top: `${pt.y}%`, width: pt.size, height: pt.size,
                background: pt.color,
                boxShadow: `0 0 ${pt.size * 2.5}px ${pt.size * 0.8}px ${pt.color}`,
              }}
              animate={{ y: [0, -pt.drift, 0], x: [0, pt.sway, 0], opacity: [0, pt.op, pt.op, 0] }}
              transition={{ duration: pt.dur, ease: 'easeInOut', repeat: Infinity, delay: pt.delay }}
            />
          ))}
        </div>

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

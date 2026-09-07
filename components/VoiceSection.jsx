'use client';

import { motion } from 'framer-motion';
import { Mic, Sparkles, Lock, MessageCircle } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Case-card icons, matched by index to t.voice.cases.
const CASE_ICONS = [Sparkles, Lock, MessageCircle];

// Deterministic bar peaks so SSR and client render identically (no Math.random
// → no hydration mismatch). A sine walk gives an organic, non-uniform waveform.
const BAR_COUNT = 44;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => 0.32 + Math.abs(Math.sin((i + 1) * 1.7)) * 0.68);

function Waveform() {
  return (
    <div
      className="relative flex h-20 items-center justify-center gap-[2px] sm:h-24 sm:gap-[3px]"
      aria-hidden
    >
      {BARS.map((peak, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-brand-deep to-sky sm:w-1"
          style={{ height: '100%', transformOrigin: 'center' }}
          initial={{ scaleY: 0.35 }}
          animate={{ scaleY: [0.35, peak, 0.5, peak * 0.82, 0.35] }}
          transition={{
            duration: 1.5 + (i % 5) * 0.16,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: (i % 8) * 0.09,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceSection() {
  const { t } = useLang();
  const v = t.voice || {};
  const cases = v.cases || [];

  return (
    <section id="voice" className="relative scroll-mt-24 overflow-hidden bg-ink py-24 sm:py-28">
      {/* ambient depth */}
      <div className="blob left-1/2 top-20 h-[380px] w-[480px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-5xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading
            label={v.label}
            titleA={v.titleA}
            highlight={v.highlight}
            sub={v.sub}
            align="center"
            hue="gradient"
          />
        </div>

        {/* ── Audio-wave visual (no player — copy + visual by design) ───────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.65, ease }}
          className="relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-[2rem] border border-brand/45 bg-gradient-to-b from-brand/[0.14] via-brand/[0.05] to-transparent p-8 shadow-glow sm:p-14"
        >
          <div className="pointer-events-none absolute left-1/2 top-0 h-52 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/20 blur-3xl" aria-hidden />

          <div className="relative flex flex-col items-center">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/20 text-brand ring-1 ring-brand/40 shadow-glow-sm">
              <Mic size={30} aria-hidden strokeWidth={1.75} />
            </div>

            <Waveform />

            {v.badge && (
              <span className="mt-8 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_rgb(var(--brand,0_177_246))]" />
                {v.badge}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Use-case mini-cards ──────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cases.map((c, i) => {
            const Icon = CASE_ICONS[i] || Sparkles;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, ease, delay: i * 0.09 }}
                className="group relative flex flex-col items-start rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/60 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12 text-brand ring-1 ring-brand/25 transition-transform duration-300 group-hover:scale-105">
                  <Icon size={22} aria-hidden strokeWidth={1.75} />
                </div>
                <div className="font-display text-[17px] font-semibold text-paper">{c.t}</div>
                <p className="mt-1.5 text-[13.5px] leading-snug text-paper-mute">{c.d}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Closing reinforcement ────────────────────────────────────────── */}
        {v.note && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="mx-auto mt-10 max-w-2xl rounded-2xl border border-brand/30 bg-brand/[0.06] px-6 py-5 text-center text-[15px] font-medium leading-relaxed text-paper"
          >
            {v.note}
          </motion.p>
        )}
      </div>
    </section>
  );
}

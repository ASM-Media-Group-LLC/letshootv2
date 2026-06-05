'use client';

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

export default function Comparison() {
  const { t } = useLang();
  const c = t.comparison;

  return (
    <section className="relative bg-ink-2 py-24 sm:py-28">
      <div className="mx-auto max-w-5xl px-5">
        <SectionHeading label={c.label} titleA={c.titleA} highlight={c.titleHighlight} align="center" hue="brand" />

        {/* ── Mobile: stacked cards (table doesn't fit 3 cols) ──────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease }}
          className="mt-12 space-y-3 md:hidden"
        >
          {c.rows.map((r, i) => (
            <div key={i} className="rounded-2xl border border-line bg-card p-4">
              <div className="mb-3 text-sm font-semibold text-paper">{r.label}</div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-hair/[0.03] px-3 py-2.5">
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-paper-dim">{c.col1}</div>
                  <div className="text-sm text-paper-dim line-through decoration-paper-dim/60">{r.trad}</div>
                </div>
                <div className="rounded-xl bg-brand/[0.08] px-3 py-2.5">
                  <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-brand">{c.col2}</div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-paper">
                    <Check size={14} className="shrink-0 text-brand" aria-hidden />
                    {r.ls}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Total card */}
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="mb-3 font-display text-base font-semibold text-paper">{c.totalLabel}</div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-hair/[0.03] px-3 py-2.5">
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-paper-dim">{c.col1}</div>
                <div className="flex items-center gap-1.5 font-display text-paper-dim">
                  <X size={15} className="shrink-0 text-paper-dim" aria-hidden />
                  {c.totalTrad}
                </div>
              </div>
              <div className="rounded-xl bg-brand/15 px-3 py-2.5">
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-brand">{c.col2}</div>
                <div className="font-display text-brand">{c.totalLs}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Desktop / tablet: full comparison table ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.55, ease }}
          className="mx-auto mt-14 hidden max-w-3xl overflow-hidden rounded-3xl border border-line md:grid"
        >
          {/* Header row */}
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-card">
            <div className="px-5 py-4" />
            <div className="border-l border-line px-5 py-4 text-center font-display text-lg font-semibold text-paper-mute">
              {c.col1}
            </div>
            <div className="border-l border-line bg-brand/10 px-5 py-4 text-center font-display text-lg font-semibold text-brand">
              {c.col2}
            </div>
          </div>

          {/* Rows */}
          {c.rows.map((r, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.2fr_1fr_1fr] ${i % 2 ? 'bg-hair/[0.02]' : 'bg-transparent'}`}
            >
              <div className="px-5 py-4 text-sm font-medium text-paper">{r.label}</div>
              <div className="border-l border-line px-5 py-4 text-center text-sm text-paper-dim line-through decoration-paper-dim/60">
                {r.trad}
              </div>
              <div className="flex items-center justify-center gap-1.5 border-l border-line bg-brand/[0.06] px-5 py-4 text-center text-sm font-semibold text-paper">
                <Check size={15} className="text-brand" aria-hidden />
                {r.ls}
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-line bg-card">
            <div className="px-5 py-5 font-display text-lg font-semibold text-paper">{c.totalLabel}</div>
            <div className="flex items-center justify-center gap-1.5 border-l border-line px-5 py-5 text-center font-display text-lg text-paper-dim">
              <X size={16} className="text-paper-dim" aria-hidden />
              {c.totalTrad}
            </div>
            <div className="border-l border-line bg-brand/15 px-5 py-5 text-center font-display text-lg text-brand">
              {c.totalLs}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

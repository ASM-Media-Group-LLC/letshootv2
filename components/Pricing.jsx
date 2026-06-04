'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

export default function Pricing() {
  const { t } = useLang();
  const p = t.pricing;
  const [tab, setTab] = useState('creators');
  const plans = p.plans[tab];

  return (
    <section id="pricing" className="relative bg-ink-2 py-24 sm:py-28">
      {/* soft accent glow */}
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading label={p.label} titleA={p.titleA} highlight={p.titleHighlight} sub={p.sub} align="center" hue="gradient" />

        {/* Toggle */}
        <div className="mx-auto mt-10 inline-flex rounded-full border border-line bg-card p-1">
          {[
            { key: 'creators', label: p.toggleCreators },
            { key: 'agencies', label: p.toggleAgencies },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTab(opt.key)}
              className={`rounded-full px-6 py-2 text-sm font-bold transition-colors ${
                tab === opt.key ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className={`mt-12 grid gap-5 ${plans.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {plans.map((plan, i) => (
            <motion.div
              key={`${tab}-${plan.name}`}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease, delay: i * 0.06 }}
              className={`relative flex flex-col rounded-3xl border p-6 ${
                plan.popular ? 'border-brand bg-brand/[0.06]' : 'border-line bg-card'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-on-accent">
                  {p.popular}
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold text-paper">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl text-paper">{plan.price}</span>
                {plan.price.startsWith('$') && plan.price !== '$0' && (
                  <span className="text-sm text-paper-dim">{p.perMonth}</span>
                )}
              </div>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2.5 text-sm text-paper-mute">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className={`mt-7 inline-block rounded-full px-5 py-3 text-center text-sm font-bold transition-transform hover:scale-[1.03] ${
                  plan.popular ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/60'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Credit packs */}
        <div className="mt-16 rounded-3xl border border-line bg-card p-7 sm:p-9">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="font-display text-2xl font-semibold text-paper">{p.packsTitle}</h3>
            <p className="text-sm text-paper-mute">{p.packsSub}</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.packs.map((pack, i) => (
              <div
                key={i}
                className="lift rounded-2xl border border-line bg-ink-2 p-5 text-center hover:border-brand/50"
              >
                <div className="font-display text-3xl text-brand">{pack.c}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-paper-dim">créditos</div>
                <div className="mt-3 text-sm font-semibold text-paper">{pack.p}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Credits table */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-line">
          <div className="bg-card px-6 py-5">
            <h3 className="font-display text-xl font-semibold text-paper">{p.tableTitle}</h3>
            <p className="mt-1 text-sm text-paper-mute">{p.tableSub}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-y border-line bg-hair/[0.02] text-paper-dim">
                  {p.tableCols.map((col, i) => (
                    <th key={i} className="px-6 py-3 font-mono text-[11px] uppercase tracking-wider">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.tableRows.map((row, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-6 py-4 font-semibold text-paper">{row.plan}</td>
                    <td className="px-6 py-4 text-brand">{row.credits}</td>
                    <td className="px-6 py-4 text-paper-mute">{row.photos}</td>
                    <td className="px-6 py-4 text-paper-mute">{row.videos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

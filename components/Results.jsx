'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];
const IMAGES = ['/result-2.jpg', '/result-4.jpg', '/result-5.jpg'];
// All tags use glass-ios for premium consistency
const HUE = {
  accent: 'glass-ios text-brand',
  violet: 'glass-ios text-sky',
  coral:  'glass-ios text-paper',
};

export default function Results() {
  const { t } = useLang();
  const r = t.results;

  return (
    <section id="results" className="relative w-full bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
      <SectionHeading label={r.label} titleA={r.titleA} highlight={r.titleHighlight} sub={r.sub} align="center" hue="gradient" />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {r.cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease, delay: i * 0.15 }}
            whileHover={{ y: -10, transition: { duration: 0.3, ease } }}
            className="group relative overflow-hidden rounded-3xl border border-line"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES[i % IMAGES.length]}
              alt={`${card.t} — ${card.loc}`}
              className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />

            <span className={`absolute right-4 top-4 rotate-3 rounded-xl px-3 py-1 font-display text-sm uppercase shadow-lg ${HUE[card.hue] || HUE.accent}`}>
              IA
            </span>

            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-xl font-semibold text-paper">{card.t}</h3>
              <p className="mt-1 font-mono text-xs uppercase tracking-wider text-paper-mute">{card.loc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

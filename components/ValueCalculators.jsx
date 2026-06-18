'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Matches the real packs (pieces = photos + videos)
const PACKS = [
  { name: 'Test', price: 249, pieces: 21 },
  { name: 'Core', price: 499, pieces: 47 },
  { name: 'Pro',  price: 899, pieces: 94 },
];
const TRAD_PER_PIECE = 120; // ~cost to produce one finished piece the traditional way

const T = {
  en: {
    label: 'CALCULATOR', titleA: 'Run the numbers —', highlight: "it's worth it",
    sub: 'Pick a pack and see what you save versus a traditional shoot — and what you can earn selling the content.',
    pick: 'Choose your pack', youGet: 'You get', pieces: 'content pieces',
    earnPer: 'You earn per piece', traditional: 'Traditional shoot', withLs: 'With LetShoot',
    save: 'You save', earn: 'You earn selling them', roi: 'Return',
    disc: 'Estimate. What you earn depends on how you sell your content.',
  },
  es: {
    label: 'CALCULADORA', titleA: 'Haz números —', highlight: 'te conviene',
    sub: 'Elige un pack y mira cuánto te ahorras vs una sesión tradicional — y cuánto puedes ganar vendiendo el contenido.',
    pick: 'Elige tu pack', youGet: 'Recibes', pieces: 'piezas de contenido',
    earnPer: 'Ganas por pieza', traditional: 'Sesión tradicional', withLs: 'Con LetShoot',
    save: 'Te ahorras', earn: 'Ganas vendiéndolas', roi: 'Retorno',
    disc: 'Estimación. Lo que ganas depende de cómo vendas tu contenido.',
  },
};

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

export default function ValueCalculators() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  const [idx, setIdx] = useState(1); // Core by default
  const [perPiece, setPerPiece] = useState(50);
  const pack = PACKS[idx];

  const trad = pack.pieces * TRAD_PER_PIECE;
  const save = Math.max(0, trad - pack.price);
  const savePct = trad ? Math.round((save / trad) * 100) : 0;
  const revenue = pack.pieces * perPiece;
  const roi = pack.price ? revenue / pack.price : 0;

  return (
    <section id="calculadora" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-3xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mt-12 rounded-3xl border border-line bg-card p-6 sm:p-8"
        >
          {/* Pack selector */}
          <span className="text-sm text-paper-mute">{t.pick}</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PACKS.map((p, i) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setIdx(i)}
                className={`flex flex-col items-center rounded-2xl px-2 py-3 transition-colors ${
                  i === idx ? 'bg-brand text-on-accent' : 'bg-ink-2 text-paper-mute hover:text-paper'
                }`}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider opacity-80">{p.name}</span>
                <span className="font-display text-xl leading-tight">${p.price}</span>
              </button>
            ))}
          </div>
          <div className="mt-2.5 text-center font-mono text-[11px] text-paper-dim">
            {t.youGet}: <span className="text-paper">{pack.pieces} {t.pieces}</span>
          </div>

          {/* Earn per piece */}
          <div className="mt-7">
            <div className="flex items-end justify-between">
              <span className="text-sm text-paper-mute">{t.earnPer}</span>
              <span className="font-display text-lg text-paper">{money(perPiece)}</span>
            </div>
            <input
              type="range" min={20} max={150} step={5} value={perPiece}
              onChange={(e) => setPerPiece(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line"
              style={{ accentColor: 'rgb(var(--brand, 0 177 246))' }}
            />
          </div>

          <div className="my-7 h-px bg-line/70" />

          {/* Results — coherent, all from the same pack */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Savings */}
            <div className="rounded-2xl bg-ink-2 p-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.traditional}</span>
                <span className="font-display text-paper-mute line-through decoration-paper-dim/50">{money(trad)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.withLs}</span>
                <span className="font-display text-paper">{money(pack.price)}</span>
              </div>
              <div className="mt-4 rounded-xl border border-brand/40 bg-brand/[0.06] px-4 py-3 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-mute">{t.save}</div>
                <div className="font-display text-2xl text-brand">{money(save)} <span className="text-sm text-paper-mute">({savePct}%)</span></div>
              </div>
            </div>

            {/* Earnings */}
            <div className="rounded-2xl bg-ink-2 p-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.roi}</span>
                <span className="font-display text-brand">{roi.toFixed(roi >= 10 ? 0 : 1)}x</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{pack.pieces} × {money(perPiece)}</span>
                <span className="font-display text-paper">{money(revenue)}</span>
              </div>
              <div className="mt-4 rounded-xl border border-brand/40 bg-brand/[0.06] px-4 py-3 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-mute">{t.earn}</div>
                <div className="font-display text-2xl text-brand">{money(revenue)}</div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-center font-mono text-[10px] leading-relaxed text-paper-dim">{t.disc}</p>
        </motion.div>
      </div>
    </section>
  );
}

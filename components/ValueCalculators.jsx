'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Quick presets (set the sliders). Real packs.
const PRESETS = [
  { name: 'Test', photos: 20, videos: 1 },
  { name: 'Core', photos: 45, videos: 2 },
  { name: 'Pro',  photos: 90, videos: 4 },
];
const TRAD_PHOTO = 120;  // traditional cost per photo
const TRAD_VIDEO = 300;  // traditional cost per video

// LetShoot cost = the pack that covers the requested volume (coherent with our packs)
const PACK_TIERS = [
  { name: 'Test', maxPieces: 21, price: 249 },
  { name: 'Core', maxPieces: 47, price: 499 },
  { name: 'Pro',  maxPieces: 94, price: 899 },
];
function lsCost(pieces) {
  const tier = PACK_TIERS.find((p) => pieces <= p.maxPieces);
  if (tier) return { price: tier.price, name: tier.name };
  return { price: Math.round(pieces * 9.5), name: 'Agency' }; // beyond Pro → custom/agency estimate
}

const T = {
  en: {
    label: 'CALCULATOR', titleA: 'Run the numbers —', highlight: "it's worth it",
    sub: 'Move the sliders: see what your photos and videos cost with LetShoot — and what you could sell them for on OnlyFans.',
    quick: 'Quick start', photosLabel: 'Photos', videosLabel: 'Videos', earnPer: 'You earn per piece',
    costLabel: 'Cost', earningsLabel: 'Earnings', traditional: 'Traditional shoot', withLs: 'With LetShoot',
    save: 'You save', earn: 'You earn selling them', roi: 'Return', net: 'Net profit',
    disc: 'Estimate. What you earn depends on how you sell your content.',
  },
  es: {
    label: 'CALCULADORA', titleA: 'Haz números —', highlight: 'te conviene',
    sub: 'Mueve los sliders: mira cuánto te cuestan tus fotos y videos en LetShoot — y en cuánto los venderías en OnlyFans.',
    quick: 'Inicio rápido', photosLabel: 'Fotos', videosLabel: 'Videos', earnPer: 'Ganas por pieza',
    costLabel: 'Costo', earningsLabel: 'Ganancias', traditional: 'Sesión tradicional', withLs: 'Con LetShoot',
    save: 'Te ahorras', earn: 'Ganas vendiéndolas', roi: 'Retorno', net: 'Ganancia neta',
    disc: 'Estimación. Lo que ganas depende de cómo vendas tu contenido.',
  },
};

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

function Slider({ label, value, min, max, step = 1, onChange, display }) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <span className="text-sm text-paper-mute">{label}</span>
        <span className="font-display text-lg text-paper">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line"
        style={{ accentColor: 'rgb(var(--brand, 0 177 246))' }}
      />
    </div>
  );
}

export default function ValueCalculators() {
  const { lang } = useLang();
  const t = T[lang] || T.en;

  const [photos, setPhotos] = useState(45);
  const [videos, setVideos] = useState(2);
  const [perPiece, setPerPiece] = useState(40);

  const pieces = photos + videos;
  const trad = photos * TRAD_PHOTO + videos * TRAD_VIDEO;
  const ls = lsCost(pieces);
  const save = Math.max(0, trad - ls.price);
  const savePct = trad ? Math.round((save / trad) * 100) : 0;
  const revenue = pieces * perPiece;
  const net = revenue - ls.price;
  const roi = ls.price ? revenue / ls.price : 0;

  const activePreset = PRESETS.findIndex((p) => p.photos === photos && p.videos === videos);

  return (
    <section id="calculadora" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-2xl px-5">
        <div className="mx-auto text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mt-12 space-y-6 rounded-3xl border border-line bg-card p-6 sm:p-8"
        >
          {/* Quick presets */}
          <div>
            <span className="text-sm text-paper-mute">{t.quick}</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => { setPhotos(p.photos); setVideos(p.videos); }}
                  className={`rounded-xl px-2 py-2 font-display text-sm transition-colors ${
                    activePreset === i ? 'bg-brand text-on-accent' : 'bg-ink-2 text-paper-mute hover:text-paper'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Movable inputs */}
          <Slider label={t.photosLabel} value={photos} min={5} max={150} onChange={setPhotos} display={photos} />
          <Slider label={t.videosLabel} value={videos} min={0} max={10} onChange={setVideos} display={videos} />
          <Slider label={t.earnPer} value={perPiece} min={20} max={150} step={5} onChange={setPerPiece} display={money(perPiece)} />

          {/* Cost / savings */}
          <div>
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-dim">{t.costLabel}</h4>
            <div className="mt-3 rounded-2xl bg-ink-2 p-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.traditional}</span>
                <span className="font-display text-paper-mute line-through decoration-paper-dim/50">{money(trad)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.withLs}</span>
                <span className="font-display text-paper">{money(ls.price)} <span className="ml-1 align-middle rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] text-brand">{ls.name}</span></span>
              </div>
              <div className="mt-4 rounded-xl border border-brand/40 bg-brand/[0.06] px-4 py-3 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-mute">{t.save}</div>
                <div className="font-display text-2xl text-brand">{money(save)} <span className="text-sm text-paper-mute">({savePct}%)</span></div>
              </div>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-dim">{t.earningsLabel}</h4>
            <div className="mt-3 rounded-2xl bg-ink-2 p-5">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{pieces} × {money(perPiece)}</span>
                <span className="font-display text-paper">{money(revenue)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.net}</span>
                <span className="font-display text-paper">{money(net)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between text-sm">
                <span className="text-paper-dim">{t.roi}</span>
                <span className="font-display text-brand">{roi.toFixed(roi >= 10 ? 0 : 1)}x</span>
              </div>
              <div className="mt-4 rounded-xl border border-brand/40 bg-brand/[0.06] px-4 py-3 text-center">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-mute">{t.earn}</div>
                <div className="font-display text-2xl text-brand">{money(revenue)}</div>
              </div>
            </div>
          </div>

          <p className="text-center font-mono text-[10px] leading-relaxed text-paper-dim">{t.disc}</p>
        </motion.div>
      </div>
    </section>
  );
}

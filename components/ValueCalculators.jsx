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
const LS_PHOTO = 10;     // LetShoot cost per photo
const LS_VIDEO = 25;     // LetShoot cost per video

const T = {
  en: {
    label: 'CALCULATOR', titleA: 'Run the numbers —', highlight: "it's worth it",
    sub: 'Drag the sliders to forecast: how much you save versus a traditional shoot, and how much you can earn selling the content.',
    quick: 'Quick start', photosLabel: 'Photos', videosLabel: 'Videos', earnPer: 'You earn per piece',
    costLabel: 'Cost', earningsLabel: 'Earnings', traditional: 'Traditional shoot', withLs: 'With LetShoot',
    save: 'You save', earn: 'You earn selling them', roi: 'Return',
    disc: 'Estimate. What you earn depends on how you sell your content.',
  },
  es: {
    label: 'CALCULADORA', titleA: 'Haz números —', highlight: 'te conviene',
    sub: 'Mueve los sliders para pronosticar: cuánto te ahorras vs una sesión tradicional, y cuánto puedes ganar vendiendo el contenido.',
    quick: 'Inicio rápido', photosLabel: 'Fotos', videosLabel: 'Videos', earnPer: 'Ganas por pieza',
    costLabel: 'Costo', earningsLabel: 'Ganancias', traditional: 'Sesión tradicional', withLs: 'Con LetShoot',
    save: 'Te ahorras', earn: 'Ganas vendiéndolas', roi: 'Retorno',
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
  const ls = photos * LS_PHOTO + videos * LS_VIDEO;
  const save = Math.max(0, trad - ls);
  const savePct = trad ? Math.round((save / trad) * 100) : 0;
  const revenue = pieces * perPiece;
  const roi = ls ? revenue / ls : 0;

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
          <Slider label={t.videosLabel} value={videos} min={0} max={20} onChange={setVideos} display={videos} />
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
                <span className="font-display text-paper">{money(ls)}</span>
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

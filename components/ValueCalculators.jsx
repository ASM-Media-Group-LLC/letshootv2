'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const T = {
  es: {
    label: 'CALCULADORA', titleA: 'Haz números —', highlight: 'te conviene',
    sub: 'Mira cuánto te ahorras y cuánto puedes ganar vendiendo tu contenido exclusivo.',
    sTitle: 'Cuánto te ahorras', sPhotos: 'Fotos al mes',
    sTrad: 'Con fotógrafo', sLs: 'Con LetShoot', sSave: 'Te ahorras', perMonth: '/mes',
    rTitle: 'Cuánto puedes ganar', rPlan: 'Inviertes en LetShoot', rSubs: 'Suscriptores',
    rPrice: 'Precio de suscripción', rRevenue: 'Ganas al mes', rNet: 'Ganancia neta', rRoi: 'Retorno',
    rDisc: 'Estimación. Tus resultados dependen de tu audiencia.',
  },
  en: {
    label: 'CALCULATOR', titleA: 'Run the numbers —', highlight: "it's worth it",
    sub: 'See how much you save and how much you can earn selling your exclusive content.',
    sTitle: 'How much you save', sPhotos: 'Photos per month',
    sTrad: 'With a photographer', sLs: 'With LetShoot', sSave: 'You save', perMonth: '/mo',
    rTitle: 'How much you can earn', rPlan: 'You invest in LetShoot', rSubs: 'Subscribers',
    rPrice: 'Subscription price', rRevenue: 'You earn monthly', rNet: 'Net profit', rRoi: 'Return',
    rDisc: 'Estimate. Your results depend on your audience.',
  },
};

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const PLAN_PRICES = [200, 400, 800, 1000];

// LetShoot monthly price for a given photo count (matches the plan tiers)
function lsCost(photos) {
  if (photos <= 8) return 200;
  if (photos <= 20) return 400;
  if (photos <= 50) return 800;
  return 1000;
}

function Slider({ label, value, min, max, step = 1, onChange, display }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-paper-mute">{label}</span>
        <span className="font-display text-lg text-paper">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand"
        style={{ accentColor: 'rgb(var(--brand, 0 177 246))' }}
      />
    </div>
  );
}

export default function ValueCalculators() {
  const { lang } = useLang();
  const t = T[lang] || T.es;

  // Savings calc
  const [photos, setPhotos] = useState(20);
  const trad = photos * 130; // ~$130/photo all-in for a real shoot
  const ls = lsCost(photos);
  const save = Math.max(0, trad - ls);
  const savePct = trad ? Math.round((save / trad) * 100) : 0;

  // ROI calc
  const [invest, setInvest] = useState(400);
  const [subs, setSubs] = useState(200);
  const [subPrice, setSubPrice] = useState(10);
  const revenue = subs * subPrice;
  const net = revenue - invest;
  const roi = invest ? revenue / invest : 0;

  return (
    <section id="calculadora" className="relative bg-ink py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {/* ── Savings calculator ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease }}
            className="flex flex-col rounded-3xl border border-line bg-card p-6 sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-brand"><Wallet size={18} aria-hidden /></div>
              <h3 className="font-display text-xl text-paper">{t.sTitle}</h3>
            </div>

            <div className="mt-7">
              <Slider label={t.sPhotos} value={photos} min={4} max={80} onChange={setPhotos} display={photos} />
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ink-2 px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">{t.sTrad}</div>
                <div className="mt-1 font-display text-2xl text-paper-mute line-through decoration-paper-dim/50">{money(trad)}</div>
              </div>
              <div className="rounded-2xl bg-brand/[0.08] px-4 py-4 ring-1 ring-brand/30">
                <div className="font-mono text-[10px] uppercase tracking-wider text-brand">{t.sLs}</div>
                <div className="mt-1 font-display text-2xl text-paper">{money(ls)}<span className="text-sm text-paper-dim">{t.perMonth}</span></div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="rounded-2xl border border-brand/40 bg-brand/[0.06] px-5 py-4 text-center">
                <div className="font-mono text-[11px] uppercase tracking-wider text-paper-mute">{t.sSave}</div>
                <div className="mt-1 font-display text-3xl text-brand">{money(save)}<span className="ml-2 align-middle text-base text-paper-mute">({savePct}%)</span></div>
              </div>
            </div>
          </motion.div>

          {/* ── Earnings / ROI calculator ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease, delay: 0.08 }}
            className="flex flex-col rounded-3xl border border-line bg-card p-6 sm:p-8"
          >
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/15 text-brand"><TrendingUp size={18} aria-hidden /></div>
              <h3 className="font-display text-xl text-paper">{t.rTitle}</h3>
            </div>

            {/* Plan selector */}
            <div className="mt-7">
              <span className="text-sm text-paper-mute">{t.rPlan}</span>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {PLAN_PRICES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setInvest(p)}
                    className={`rounded-xl px-2 py-2 font-display text-sm transition-colors ${
                      invest === p ? 'bg-brand text-on-accent' : 'bg-ink-2 text-paper-mute hover:text-paper'
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <Slider label={t.rSubs} value={subs} min={20} max={2000} step={10} onChange={setSubs} display={subs.toLocaleString('en-US')} />
              <Slider label={t.rPrice} value={subPrice} min={5} max={50} onChange={setSubPrice} display={money(subPrice) + t.perMonth} />
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-ink-2 px-4 py-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">{t.rNet}</div>
                <div className="mt-1 font-display text-2xl text-paper">{money(net)}</div>
              </div>
              <div className="rounded-2xl bg-brand/[0.08] px-4 py-4 ring-1 ring-brand/30">
                <div className="font-mono text-[10px] uppercase tracking-wider text-brand">{t.rRoi}</div>
                <div className="mt-1 font-display text-2xl text-brand">{roi.toFixed(roi >= 10 ? 0 : 1)}x</div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <div className="rounded-2xl border border-brand/40 bg-brand/[0.06] px-5 py-4 text-center">
                <div className="font-mono text-[11px] uppercase tracking-wider text-paper-mute">{t.rRevenue}</div>
                <div className="mt-1 font-display text-3xl text-brand">{money(revenue)}<span className="text-base text-paper-mute">{t.perMonth}</span></div>
              </div>
              <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-paper-dim">{t.rDisc}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

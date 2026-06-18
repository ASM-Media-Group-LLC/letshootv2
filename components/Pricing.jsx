'use client';

import { motion } from 'framer-motion';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Packs (language-independent price + structure)
const PACKS = [
  { key: 'test', name: 'Test Pack', price: 249 },
  { key: 'core', name: 'Core Pack', price: 499, popular: true },
  { key: 'pro',  name: 'Pro Pack',  price: 899 },
];

const COPY = {
  en: {
    label: 'PACKAGES', titleA: 'Choose your', highlight: 'sales content pack',
    sub: 'Curated, ready-to-sell photo and video packs — built for PPV, chat sales and custom-style fan requests.',
    oneTime: 'one-time pack', cta: 'Get Started', popular: 'Most popular',
    setupTag: 'Limited time', setupTitle: 'AI clone setup — FREE', setupDetail: '$1,000 value, included with every pack.',
    packs: {
      test: { desc: 'Try the workflow and get your first batch of sellable content.', features: ['20 final photos', '1 short AI video', '5 sales concepts', 'Curated delivery', '1 technical revision only'] },
      core: { desc: 'The sweet spot — a solid content bank for chats and PPV drops.', features: ['45 final photos', '2 short AI videos', '10 sales concepts', 'Curated delivery', '1 technical revision only'] },
      pro:  { desc: 'Maximum variety for creators who sell every day.', features: ['90 final photos', '4 short AI videos', '20 sales concepts', 'Curated delivery', '2 technical revisions only'] },
    },
    agencyTitle: 'Agency Volume', agencyPrice: 'Custom Quote',
    agencyDesc: 'Managing multiple creators? Get a custom pack for higher volume — more models, photos and concepts.',
    agencyCta: 'Contact us',
  },
  es: {
    label: 'PAQUETES', titleA: 'Elige tu', highlight: 'paquete de contenido',
    sub: 'Paquetes curados de fotos y videos listos para vender — hechos para PPV, ventas por chat y pedidos personalizados de fans.',
    oneTime: 'pago único', cta: 'Empezar', popular: 'Más popular',
    setupTag: 'Tiempo limitado', setupTitle: 'Setup de tu clon IA — GRATIS', setupDetail: 'Valor $1,000, incluido con cada paquete.',
    packs: {
      test: { desc: 'Prueba el flujo y recibe tu primer lote de contenido vendible.', features: ['20 fotos finales', '1 video IA corto', '5 conceptos de venta', 'Entrega curada', 'Solo 1 revisión técnica'] },
      core: { desc: 'El punto justo — un buen banco de contenido para chats y PPV.', features: ['45 fotos finales', '2 videos IA cortos', '10 conceptos de venta', 'Entrega curada', 'Solo 1 revisión técnica'] },
      pro:  { desc: 'Máxima variedad para creadoras que venden todos los días.', features: ['90 fotos finales', '4 videos IA cortos', '20 conceptos de venta', 'Entrega curada', 'Solo 2 revisiones técnicas'] },
    },
    agencyTitle: 'Volumen para agencias', agencyPrice: 'Cotización a medida',
    agencyDesc: '¿Manejas varias creadoras? Te armamos un paquete a medida para más volumen — más modelos, fotos y conceptos.',
    agencyCta: 'Contáctanos',
  },
};

export default function Pricing() {
  const { lang } = useLang();
  const c = COPY[lang] || COPY.en;

  return (
    <section id="pricing" className="relative bg-ink-2 py-24 sm:py-28">
      <div className="blob left-1/2 top-10 h-[360px] w-[360px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={c.label} titleA={c.titleA} highlight={c.highlight} sub={c.sub} align="center" hue="gradient" />
        </div>

        {/* Limited-time free AI-clone setup */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-9 max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-r from-brand/50 via-brand/20 to-brand/50 p-px shadow-glow-sm"
        >
          <div className="flex flex-col items-center gap-3.5 rounded-[15px] bg-ink-2/90 px-6 py-4 text-center backdrop-blur sm:flex-row sm:gap-4 sm:text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand/15 ring-1 ring-brand/40">
              <Sparkles size={20} className="text-brand" aria-hidden />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="rounded-full bg-brand px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-on-accent">{c.setupTag}</span>
                <span className="font-display text-base font-semibold text-paper sm:text-lg">{c.setupTitle}</span>
              </div>
              <p className="mt-1 text-[13px] leading-snug text-paper-mute">{c.setupDetail}</p>
            </div>
          </div>
        </motion.div>

        {/* 3 packs */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PACKS.map((pack, i) => {
            const pc = c.packs[pack.key];
            return (
              <motion.div
                key={pack.key}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease, delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                className={`group relative flex flex-col rounded-3xl border p-6 transition-shadow duration-300 ${
                  pack.popular ? 'border-brand bg-brand/[0.07] shadow-glow-sm' : 'border-line bg-card hover:border-paper/20'
                }`}
              >
                {pack.popular && (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 -top-px h-28 rounded-t-3xl bg-gradient-to-b from-brand/20 to-transparent" aria-hidden />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">
                      {c.popular}
                    </div>
                  </>
                )}

                <span className="relative font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{pack.name}</span>

                <div className="relative mt-3 flex items-baseline gap-1.5">
                  <span className={`font-display text-[2.8rem] leading-none ${pack.popular ? 'text-brand' : 'text-paper'}`}>${pack.price}</span>
                  <span className="font-mono text-[11px] text-paper-dim">{c.oneTime}</span>
                </div>

                <p className="relative mt-4 min-h-[2.5rem] text-[13px] leading-relaxed text-paper-mute">{pc.desc}</p>

                <div className="relative my-4 h-px bg-line/70" />

                <ul className="relative flex-1 space-y-2.5">
                  {pc.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-[13px] text-paper-mute">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden />
                      <span className="flex-1">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className={`relative mt-6 inline-flex items-center justify-center rounded-full px-4 py-2.5 text-center text-sm font-bold transition-transform hover:scale-[1.03] ${
                    pack.popular ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/60 hover:text-brand'
                  }`}
                >
                  {c.cta}
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Agency volume — custom quote */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease }}
          className="mx-auto mt-5 flex max-w-5xl flex-col items-center justify-between gap-4 rounded-3xl border border-brand/30 bg-card px-6 py-6 text-center sm:flex-row sm:text-left"
        >
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="font-display text-lg text-paper">{c.agencyTitle}</span>
              <span className="rounded-full bg-brand/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand">{c.agencyPrice}</span>
            </div>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-paper-mute">{c.agencyDesc}</p>
          </div>
          <a href="#" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
            {c.agencyCta} <ArrowRight size={16} aria-hidden />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

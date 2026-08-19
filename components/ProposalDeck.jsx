'use client';

// Lookbook de la propuesta personalizada de una creadora. Reemplaza al PDF
// que se enviaba antes. Renderiza:
//   1) Portada cinemática con «Así se vería tu clon IA» + intro personalizada
//   2) Explicación de las 3 columnas (Inspiración / Foto real / Resultado)
//   3) Un tríptico por slide (con las 3 fotos + caption opcional)
//   4) Pricing (3 packs) con CTA «Elegir pack»
//
// Se usa a pantalla completa dentro de la cuenta de la CC cuando aún no ha
// pagado, y también como preview en el editor del equipo interno.

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, X, Check } from 'lucide-react';
import { PACKS } from '@/lib/packs';
import Logo from '@/components/Logo';

const ease = [0.22, 1, 0.36, 1];

export default function ProposalDeck({ creatorName, intro, slides = [], onClose, onChoosePack, chosenPack, packDisabled }) {
  const orderedSlides = [...(slides || [])].sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink text-paper">
      {/* Header sticky con marca + cerrar */}
      <div className="sticky top-0 z-10 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand sm:inline-block">Propuesta · Clon IA</span>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Portada */}
      <section className="mx-auto max-w-5xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
        <motion.span
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand sm:text-[11px]"
        >
          <Sparkles size={12} /> Simulación de modelo IA
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease, delay: 0.1 }}
          className="mt-5 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em]"
        >
          Así se vería {creatorName ? <span className="text-brand">{creatorName}</span> : 'tu clon IA'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.2 }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-paper-mute sm:text-lg"
        >
          {intro || 'A partir de tus fotos reales construimos un modelo idéntico a ti. Con él generamos cualquier escena que tu audiencia solicite, en minutos y sin producción.'}
        </motion.p>
      </section>

      {/* Explicación 3 columnas */}
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand sm:text-[11px]">Cómo leer las próximas páginas</div>
        <h2 className="font-display text-[clamp(1.5rem,3vw,2.2rem)] font-bold leading-tight">Tres columnas, una entrega</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ExplainCard n={1} label="Inspiración" body="La referencia visual: la escena solicitada o el concepto que se quiere vender." />
          <ExplainCard n={2} label="Foto real" body="Tu material real. La base con la que entrenamos el modelo: rostro, cuerpo, tatuajes y marcas distintivas." />
          <ExplainCard n={3} label="Resultado" body="Generado íntegramente con IA. Listo para monetizar en chat, PPV o pedidos personalizados." highlight />
        </div>
      </section>

      {/* Trípticos */}
      <section className="mx-auto max-w-5xl space-y-14 px-5 pb-16 sm:px-8">
        {orderedSlides.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card/30 p-10 text-center text-sm text-paper-dim">
            Aún no hay trípticos en esta propuesta.
          </div>
        ) : (
          orderedSlides.map((s, i) => (
            <TripticSlide key={s.id || i} slide={s} />
          ))
        )}
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand">Oferta de lanzamiento · hasta -55%</span>
        </div>
        <h2 className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-tight">Elige tu pack de contenido</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PACKS.map((pack) => {
            const isChosen = chosenPack === pack.key;
            const discount = Math.round((1 - pack.m / pack.was) * 100);
            return (
              <div key={pack.key}
                className={`relative flex flex-col rounded-3xl border p-6 transition-colors ${
                  pack.popular ? 'border-brand/50 bg-brand/[0.06]' : 'border-line bg-card'
                } ${isChosen ? 'ring-2 ring-brand' : ''}`}
              >
                {pack.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-on-accent">Más popular</span>
                )}
                <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-paper-mute">{pack.name}</span>
                <div className="mt-3 flex items-center gap-2">
                  <span className="font-mono text-sm text-paper-dim line-through">${pack.was}</span>
                  <span className="rounded bg-brand/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-brand">-{discount}%</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className={`font-display text-[2.6rem] leading-none ${pack.popular ? 'text-brand' : 'text-paper'}`}>${pack.m}</span>
                  <span className="font-mono text-[11px] text-paper-dim">/mes</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-paper-dim">facturado mensual</div>
                <ul className="mt-5 flex-1 space-y-2">
                  <PackLine>{pack.photos} fotos finales</PackLine>
                  <PackLine>{pack.videos} video{pack.videos === 1 ? '' : 's'} corto{pack.videos === 1 ? '' : 's'} IA</PackLine>
                  <PackLine>{pack.key === 'test' ? '5' : pack.key === 'core' ? '10' : '20'} conceptos de venta</PackLine>
                  <PackLine>{pack.key === 'pro' ? '2 revisiones técnicas' : '1 revisión técnica'}</PackLine>
                </ul>
                {onChoosePack && (
                  <button
                    type="button"
                    onClick={() => onChoosePack(pack.key)}
                    disabled={packDisabled}
                    className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${
                      isChosen ? 'bg-brand text-on-accent shadow-glow-sm' : 'border border-line text-paper hover:border-brand/50'
                    }`}
                  >
                    {isChosen ? <><Check size={15} /> Elegido</> : <>Elegir {pack.name} <ArrowRight size={15} /></>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 rounded-2xl border border-brand/25 bg-brand/[0.04] px-4 py-3 text-center text-[13px] text-paper-mute">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand">Modelo IA a medida</span>
          <span className="ml-2">— Incluido sin costo con cualquier pack.</span>
        </p>
      </section>
    </div>
  );
}

function ExplainCard({ n, label, body, highlight }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-brand/50 bg-brand/[0.05]' : 'border-line bg-card'}`}>
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${highlight ? 'bg-brand text-on-accent' : 'bg-hair/10 text-paper-mute'}`}>{n}</span>
      <p className={`mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] ${highlight ? 'text-brand' : 'text-paper-dim'}`}>{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-paper-mute">{body}</p>
    </div>
  );
}

function TripticSlide({ slide }) {
  const cells = [
    { n: 1, label: 'Inspiración', url: slide.inspiration_url },
    { n: 2, label: 'Foto real', url: slide.real_url },
    { n: 3, label: 'Resultado', url: slide.ai_url, ai: true },
  ];
  return (
    <div>
      <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-4">
        {cells.map((c) => (
          <figure key={c.n} className={`relative overflow-hidden rounded-2xl border ${c.ai ? 'border-brand/60' : 'border-white/10'} bg-ink-2`}>
            <div className="flex items-center gap-1.5 px-3 pt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-paper-dim">
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${c.ai ? 'bg-brand text-on-accent' : 'bg-hair/10 text-paper-mute'}`}>{c.n}</span>
              <span className={c.ai ? 'text-brand' : ''}>{c.label}</span>
              {c.ai && <span className="ml-auto rounded bg-brand/15 px-1.5 py-0.5 text-[8px] font-bold text-brand">IA</span>}
            </div>
            <div className="mt-2 aspect-[3/4] w-full overflow-hidden bg-black">
              {c.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.url} alt={c.label} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full w-full place-items-center text-[11px] text-paper-dim">Sin foto</div>
              )}
            </div>
          </figure>
        ))}
      </div>
      {slide.caption && <p className="mt-3 text-center text-[13px] text-paper-mute">{slide.caption}</p>}
    </div>
  );
}

function PackLine({ children }) {
  return (
    <li className="flex items-start gap-2 text-[13px] text-paper-mute">
      <Check size={14} className="mt-0.5 shrink-0 text-brand" /> <span>{children}</span>
    </li>
  );
}

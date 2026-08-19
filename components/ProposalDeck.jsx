'use client';

// Lookbook de la propuesta personalizada. Diseño cinemático premium.
// Renderiza a pantalla completa con secciones en snap-scroll, tipografía
// editorial y transiciones suaves. Se usa tanto en la vista de la CC como
// en el preview del editor.

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, X, Check, Star } from 'lucide-react';
import { PACKS } from '@/lib/packs';
import Logo from '@/components/Logo';

const ease = [0.22, 1, 0.36, 1];

export default function ProposalDeck({ creatorName, intro, slides = [], onClose, onChoosePack, chosenPack, packDisabled }) {
  const orderedSlides = [...(slides || [])].sort((a, b) => a.position - b.position);
  // La primera «Foto real» sirve de retrato en la portada — le pone cara a la
  // propuesta desde el primer scroll. Fallback: la primera IA o inspiración.
  const heroPhoto = orderedSlides[0]?.real_url || orderedSlides[0]?.ai_url || orderedSlides[0]?.inspiration_url || null;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink text-paper">
      {/* Textura de fondo sutil — le da profundidad al negro plano */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,175,240,0.08), transparent 65%), radial-gradient(ellipse 80% 60% at 100% 100%, rgba(0,175,240,0.04), transparent 60%)' }} />

      {/* Header sticky — marca + cerrar */}
      <div className="sticky top-0 z-30 border-b border-white/[0.05] bg-ink/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-3.5">
            <Logo size="sm" />
            <span className="hidden items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand sm:inline-flex">
              <Sparkles size={11} /> Propuesta · Clon IA
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Cerrar"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-paper-mute backdrop-blur transition-all hover:scale-105 hover:border-brand/40 hover:text-paper">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── PORTADA — 2 columnas: intro + retrato de la modelo ─────────────── */}
      <section className="relative z-10 px-6 pb-14 pt-10 sm:px-10 sm:pt-14">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/[0.08] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-brand backdrop-blur"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Simulación de modelo IA
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, ease, delay: 0.1 }}
              className="font-display text-[clamp(2.2rem,6vw,4.4rem)] font-bold leading-[0.98] tracking-[-0.03em]"
            >
              Así se vería
              {creatorName ? <><br /><span className="bg-gradient-to-r from-brand via-brand to-brand/70 bg-clip-text text-transparent">{creatorName}</span></> : ' tu clon IA'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.28 }}
              className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-paper-mute"
            >
              {intro || 'A partir de tus fotos reales construimos un modelo idéntico a ti. Con él generamos cualquier escena que tu audiencia solicite — en minutos, sin producción.'}
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, ease, delay: 0.55 }}
              className="mt-8 flex items-center gap-3 text-xs text-paper-dim"
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent via-brand/60 to-brand" />
              <span className="font-mono uppercase tracking-[0.22em]">Desliza para ver</span>
            </motion.div>
          </div>

          {/* Retrato de la modelo — la primera «Foto real» de sus trípticos */}
          {heroPhoto && (
            <motion.div
              initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] lg:ml-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPhoto} alt={creatorName || 'Portada'} className="h-full w-full object-cover" loading="eager" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent" aria-hidden />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur">
                  <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-white/15 text-[8px] font-bold text-white/80">2</span>
                  Foto real
                </span>
              </div>
              {/* Glow sutil detrás */}
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-brand/10 blur-3xl" aria-hidden />
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Cómo leer ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.05] px-6 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-brand sm:text-[11px]">Cómo leer las próximas páginas</div>
          <h2 className="max-w-3xl font-display text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">Tres columnas, una entrega.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <ExplainCard n={1} label="Inspiración" body="La referencia visual: la escena solicitada o el concepto que se quiere vender." />
            <ExplainCard n={2} label="Foto real" body="Tu material real. La base con la que entrenamos el modelo: rostro, cuerpo, tatuajes y marcas distintivas." />
            <ExplainCard n={3} label="Resultado" body="Generado íntegramente con IA. Listo para monetizar en chat, PPV o pedidos personalizados." highlight />
          </div>
        </div>
      </section>

      {/* ── Trípticos ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.05] px-6 py-14 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-brand sm:text-[11px]">Muestra</div>
          <h2 className="font-display text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em]">Estas son las escenas.</h2>
          <p className="mt-2 max-w-xl text-base text-paper-mute">Cada tríptico muestra la referencia, la foto real base y el resultado que entrega tu clon.</p>

          <div className="mt-10 space-y-14">
            {orderedSlides.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center text-sm text-paper-dim">
                Aún no hay trípticos en esta propuesta.
              </div>
            ) : (
              orderedSlides.map((s, i) => (
                <TripticSlide key={s.id || i} slide={s} index={i} total={orderedSlides.length} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="relative z-10 border-t border-white/[0.05] px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/[0.08] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-brand">
            <Star size={11} /> Oferta de lanzamiento · hasta -55%
          </div>
          <h2 className="font-display text-[clamp(1.9rem,3.8vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em]">Elige tu pack de contenido.</h2>
          <p className="mt-3 max-w-xl text-base text-paper-mute">El clon IA se crea gratis con cualquier plan. Contenido listo para vender cada mes.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
            {PACKS.map((pack) => {
              const isChosen = chosenPack === pack.key;
              const discount = Math.round((1 - pack.m / pack.was) * 100);
              return (
                <div key={pack.key}
                  className={`group relative flex flex-col rounded-3xl border p-7 transition-all ${
                    pack.popular
                      ? 'border-brand/50 bg-gradient-to-br from-brand/[0.08] to-transparent'
                      : 'border-white/10 bg-white/[0.02]'
                  } ${isChosen ? 'shadow-glow ring-2 ring-brand' : 'hover:border-white/25'}`}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-on-accent shadow-glow-sm">Más popular</span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-paper-mute">{pack.name}</span>
                    <span className="rounded-full bg-brand/15 px-2 py-0.5 font-mono text-[10px] font-bold text-brand">-{discount}%</span>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-display text-[3rem] leading-none tracking-tight ${pack.popular || isChosen ? 'text-brand' : 'text-paper'}`}>${pack.m}</span>
                      <span className="font-mono text-xs text-paper-dim">/mes</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-paper-dim">
                      <span className="line-through decoration-paper-dim/50">${pack.was}</span> facturado mensual
                    </div>
                  </div>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    <PackLine strong>{pack.photos} fotos finales</PackLine>
                    <PackLine>{pack.videos} video{pack.videos === 1 ? '' : 's'} corto{pack.videos === 1 ? '' : 's'} IA</PackLine>
                    <PackLine>{pack.key === 'test' ? '5' : pack.key === 'core' ? '10' : '20'} conceptos de venta</PackLine>
                    <PackLine>{pack.key === 'pro' ? '2 revisiones técnicas' : '1 revisión técnica'}</PackLine>
                  </ul>
                  {onChoosePack && (
                    <button
                      type="button"
                      onClick={() => onChoosePack(pack.key)}
                      disabled={packDisabled}
                      className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-all disabled:opacity-60 ${
                        isChosen
                          ? 'bg-brand text-on-accent shadow-glow-sm'
                          : pack.popular
                          ? 'bg-white text-ink hover:bg-white/90'
                          : 'border border-white/15 text-paper hover:border-brand/50 hover:text-brand'
                      }`}
                    >
                      {isChosen ? <><Check size={15} /> Elegido</> : <>Elegir {pack.name} <ArrowRight size={15} /></>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-brand/25 bg-brand/[0.04] p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand"><Sparkles size={16} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brand">Modelo IA a medida</p>
              <p className="mt-0.5 text-[13px] text-paper-mute">Incluido sin costo con cualquier pack. Vive en tu cuenta y solo lo usa nuestro equipo para producir tu contenido.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer sutil */}
      <div className="relative z-10 border-t border-white/[0.05] px-6 py-8 text-center text-[11px] text-paper-dim sm:px-10">
        LetShoot · Tu fotógrafo IA · letshoot.ai
      </div>
    </div>
  );
}

function ExplainCard({ n, label, body, highlight }) {
  return (
    <div className={`group relative flex flex-col gap-4 rounded-2xl border p-6 transition-colors ${
      highlight ? 'border-brand/50 bg-brand/[0.05]' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-9 w-9 place-items-center rounded-full font-mono text-sm font-bold ${
          highlight ? 'bg-brand text-on-accent shadow-glow-sm' : 'bg-white/[0.06] text-paper-mute'
        }`}>{n}</span>
        <p className={`font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${highlight ? 'text-brand' : 'text-paper-dim'}`}>{label}</p>
      </div>
      <p className="text-[15px] leading-relaxed text-paper-mute">{body}</p>
    </div>
  );
}

function TripticSlide({ slide, index, total }) {
  const cells = [
    { n: 1, label: 'Inspiración', url: slide.inspiration_url },
    { n: 2, label: 'Foto real',   url: slide.real_url },
    { n: 3, label: 'Resultado',   url: slide.ai_url, ai: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease }}
    >
      {/* Numeración prominente */}
      <div className="mb-4 flex items-center gap-3">
        <span className="font-display text-2xl font-bold tabular-nums text-brand">{String(index + 1).padStart(2, '0')}</span>
        <div className="h-px flex-1 bg-gradient-to-r from-brand/40 via-white/8 to-transparent" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-paper-dim">/ {String(total).padStart(2, '0')}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {cells.map((c) => (
          <figure key={c.n} className={`relative overflow-hidden rounded-2xl border ${c.ai ? 'border-brand/50 ring-1 ring-brand/20' : 'border-white/10'} bg-ink-2 transition-transform hover:scale-[1.01]`}>
            <div className="aspect-[3/4] w-full overflow-hidden">
              {c.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.url} alt={c.label} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-white/[0.02] text-[11px] text-paper-dim">Sin foto</div>
              )}
            </div>
            {/* Overlay con label */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-black/60 to-transparent px-3 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em]">
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${c.ai ? 'bg-brand text-on-accent' : 'bg-white/12 text-white/80'}`}>{c.n}</span>
              <span className={c.ai ? 'text-brand' : 'text-white/80'}>{c.label}</span>
              {c.ai && <span className="ml-auto rounded bg-brand/25 px-1.5 py-0.5 text-[8px] font-bold text-brand">IA</span>}
            </div>
          </figure>
        ))}
      </div>
      {slide.caption && (
        <p className="mt-5 text-center font-display text-[15px] italic text-paper-mute">« {slide.caption} »</p>
      )}
    </motion.div>
  );
}

function PackLine({ children, strong }) {
  return (
    <li className={`flex items-start gap-2 text-[13px] ${strong ? 'text-paper' : 'text-paper-mute'}`}>
      <Check size={14} className="mt-0.5 shrink-0 text-brand" /> <span>{children}</span>
    </li>
  );
}

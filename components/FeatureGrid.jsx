'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import { ICONS } from './icons';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Cards with image backgrounds — only on Creators (more aspirational).
// Agencies → clean cards (more professional / data-driven).
const CARD_IMAGES = {
  // Order matches t.creators.items: [image, map, shirt, wand]
  // HD realistas · Cualquier locación · Moda virtual · Estilista IA
  // These card-* files are dedicated to FeatureGrid so Results section keeps
  // its own result-*.jpg untouched.
  // Card 0 (Fotos HD) ↔ Card 1 (Cualquier locación): swapped
  creators: ['/card-localizacion.jpg', '/result-2.jpg', '/card-moda.jpg', '/card-estilista.jpg'],
};

const ICON_ACCENT = {
  creators: 'bg-brand/20 text-brand ring-1 ring-brand/30',
  agencies: 'bg-sky/20 text-sky ring-1 ring-sky/30',
};
const HEAD_HUE = { creators: 'brand', agencies: 'sky' };

export default function FeatureGrid({ id, sectionKey }) {
  const { t } = useLang();
  const s = t[sectionKey];
  const iconClass = ICON_ACCENT[sectionKey] || ICON_ACCENT.creators;
  const imgs = CARD_IMAGES[sectionKey]; // undefined for agencies → clean cards

  return (
    <section id={id} className="relative w-full bg-ink py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading label={s.label} titleA={s.titleA} highlight={s.titleHighlight} sub={s.sub} hue={HEAD_HUE[sectionKey] || 'brand'} />

        {/* 2×2 grid — all cards same size, photo gets enough width to show
            the face clearly. */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {s.items.map((item, i) => {
            const Icon = ICONS[item.icon];
            const img = imgs ? imgs[i % imgs.length] : null;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 48, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, ease, delay: i * 0.10 }}
                whileHover={{ y: -8, transition: { duration: 0.3, ease } }}
                className={`group relative overflow-hidden rounded-3xl border border-line transition-colors hover:border-paper/25 ${
                  img ? '' : 'bg-card hover:shadow-glow-sm'
                }`}
                style={img ? { minHeight: '460px' } : undefined}
              >
                {img && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 ease-out group-hover:scale-105"
                      // Face/upper-body framing: anchor higher so the head is visible
                      style={{ objectPosition: '50% 15%' }}
                    />
                    {/* Stronger bottom gradient so text stays legible over the photo */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
                  </>
                )}

                {/* Content — sized for the narrower 4-col layout */}
                <div className={img ? 'relative flex h-full min-h-[inherit] flex-col justify-end p-6' : 'p-6'}>
                  <div className={`grid h-11 w-11 place-items-center rounded-2xl backdrop-blur-md ${iconClass}`}>
                    {Icon && <Icon size={19} strokeWidth={2.2} aria-hidden />}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-paper">{item.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-paper-mute">{item.d}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="glass-ios rounded-full px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-wider text-paper"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hover sparkle */}
                <div className="pointer-events-none absolute right-4 top-4 h-2 w-2 rounded-full bg-brand opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ boxShadow: '0 0 14px 3px rgba(0,177,246,0.6)' }} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

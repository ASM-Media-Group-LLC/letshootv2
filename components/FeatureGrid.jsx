'use client';

import { motion } from 'framer-motion';
import { useLang } from '@/app/providers';
import { ICONS } from './icons';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

// Cards with image backgrounds — only on Creators (more aspirational).
// Agencies → clean cards (more professional / data-driven).
const CARD_IMAGES = {
  creators: ['/result-2.jpg', '/result-4.jpg', '/result-5.jpg', '/hero-stage-5.jpg'],
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

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {s.items.map((item, i) => {
            const Icon = ICONS[item.icon];
            const img = imgs ? imgs[i % imgs.length] : null;
            // Bento layout: first AND last cards span 2 cols when they have images,
            // creating a balanced rhythm (hero · pair · hero) instead of an orphan row.
            const isLast = i === s.items.length - 1;
            const isHero = img && (i === 0 || isLast);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 48, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.65, ease, delay: i * 0.12 }}
                whileHover={{ y: -8, transition: { duration: 0.3, ease } }}
                className={`group relative overflow-hidden rounded-3xl border border-line transition-colors hover:border-paper/25 ${
                  img ? '' : 'bg-card hover:shadow-glow-sm'
                } ${isHero ? 'sm:col-span-2' : ''}`}
                style={img ? { minHeight: isHero ? '380px' : '320px' } : undefined}
              >
                {img && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 ease-out group-hover:scale-105"
                      style={{ objectPosition: '50% 25%' }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/40" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ink/40 via-transparent to-transparent" />
                  </>
                )}

                {/* Content */}
                <div className={img ? 'relative flex h-full min-h-[inherit] flex-col justify-end p-7' : 'p-7'}>
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl backdrop-blur-md ${iconClass}`}>
                    {Icon && <Icon size={22} strokeWidth={2.2} aria-hidden />}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-paper sm:text-2xl">{item.t}</h3>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed text-paper-mute">{item.d}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="glass-ios rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper"
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

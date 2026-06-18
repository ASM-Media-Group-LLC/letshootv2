'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '@/app/providers';
import SectionHeading from './SectionHeading';

const ease = [0.22, 1, 0.36, 1];

const PHOTOS = [
  '/result-2.jpg', '/card-locacion.jpg', '/card-moda.jpg', '/result-4.jpg',
  '/card-estilista.jpg', '/card-hd.jpg', '/result-5.jpg', '/ba-after-1.jpg',
];
const VIDEOS = ['/hero-miami.mp4'];

const T = {
  en: {
    label: 'THE WORK', titleA: 'Photos & videos', highlight: 'that sell',
    sub: 'Curated, sales-ready assets — the kind your fans actually buy in chats, PPV and custom drops.',
    photos: 'Photos', videos: 'Videos',
  },
  es: {
    label: 'EL TRABAJO', titleA: 'Fotos y videos', highlight: 'que venden',
    sub: 'Contenido curado y listo para vender — del que tus fans realmente compran en chats, PPV y pedidos.',
    photos: 'Fotos', videos: 'Videos',
  },
};

export default function Showcase() {
  const { lang } = useLang();
  const t = T[lang] || T.en;
  const [tab, setTab] = useState('photos');

  return (
    <section id="work" className="relative bg-ink py-24 sm:py-28">
      <div className="blob left-1/3 top-16 h-[340px] w-[340px] bg-brand/10" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeading label={t.label} titleA={t.titleA} highlight={t.highlight} sub={t.sub} align="center" hue="gradient" />
        </div>

        {/* Photos / Videos toggle */}
        <div className="mx-auto mt-9 flex w-full max-w-xs items-stretch gap-1 rounded-full border border-line bg-card p-1">
          {[['photos', t.photos], ['videos', t.videos]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                tab === key ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'photos' ? (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease }}
              className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
              {PHOTOS.map((src, i) => (
                <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: '50% 25%' }}
                    draggable={false}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease }}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              {VIDEOS.map((src, i) => (
                <div key={i} className="relative aspect-[9/16] w-[clamp(240px,44vw,320px)] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl">
                  <video
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster="/hero-miami-poster.jpg"
                    aria-hidden
                  >
                    <source src={src} type="video/mp4" />
                  </video>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

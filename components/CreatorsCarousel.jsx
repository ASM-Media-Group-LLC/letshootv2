'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import { useLang } from '@/app/providers';

// Caption meta line (the location names reuse the already-translated marquee list)
const META = {
  es: 'Generado con IA', en: 'AI-generated', pt: 'Gerado com IA', fr: 'Généré par IA',
  de: 'KI-generiert', it: 'Generato con IA', zh: 'AI 生成',
};

// 3D coverflow (panorama-style) carousel — discrete slides, autoplay, dots.
export default function CreatorsCarousel({ images }) {
  const { t, lang } = useLang();
  const locs = t.marquee || [];
  const meta = META[lang] || META.en;

  return (
    <div className="relative w-full">
      {/* Edge fades to black (cards bleed out intentionally) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[22%]" aria-hidden
        style={{ background: 'linear-gradient(90deg, rgb(var(--bg)) 4%, transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[22%]" aria-hidden
        style={{ background: 'linear-gradient(270deg, rgb(var(--bg)) 4%, transparent)' }} />

      <Swiper
        modules={[EffectCoverflow, Autoplay, Pagination]}
        effect="coverflow"
        centeredSlides
        loop
        grabCursor
        slidesPerView={1.5}
        spaceBetween={0}
        speed={600}
        autoplay={{ delay: 3800, disableOnInteraction: false }}
        coverflowEffect={{ rotate: 32, stretch: 0, depth: 160, scale: 0.86, slideShadows: false }}
        pagination={{ clickable: true }}
        breakpoints={{
          640: { slidesPerView: 2.2, coverflowEffect: { rotate: 30, stretch: 0, depth: 160, scale: 0.85, slideShadows: false } },
          1024: { slidesPerView: 3.2, coverflowEffect: { rotate: 28, stretch: 0, depth: 200, scale: 0.85, slideShadows: false } },
          1280: { slidesPerView: 3.6, coverflowEffect: { rotate: 24, stretch: 0, depth: 240, scale: 0.85, slideShadows: false } },
        }}
        style={{
          '--swiper-pagination-color': '#00B1F6',
          '--swiper-pagination-bullet-inactive-color': '#ffffff',
          '--swiper-pagination-bullet-inactive-opacity': '0.35',
          paddingBottom: '46px',
          paddingInline: '12px',
        }}
      >
        {images.map((src, i) => (
          <SwiperSlide key={i} className="!h-auto">
            <figure className="flex flex-col items-center gap-4">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={locs[i % locs.length] || ''} className="h-full w-full object-cover" style={{ objectPosition: '50% 22%' }} draggable={false} />
              </div>
              <figcaption className="text-center">
                <div className="font-display text-xl font-semibold text-paper">{locs[i % locs.length]}</div>
                <div className="mt-0.5 text-[13px] text-paper-dim">{meta}</div>
              </figcaption>
            </figure>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

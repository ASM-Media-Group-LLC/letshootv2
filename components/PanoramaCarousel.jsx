'use client';

import { useEffect, useRef } from 'react';

// Static concave "panorama" arc (Fanvue-style): the CENTER card is the
// smallest/flattest, and the cards grow + angle outward forming an arc.
// No auto-scroll — the layout is fixed (sizes are conserved).
export default function PanoramaCarousel({ images }) {
  const itemsRef = useRef([]);

  useEffect(() => {
    const apply = () => {
      const N = images.length;
      const center = (N - 1) / 2;
      const first = itemsRef.current[0];
      const w = first ? first.offsetWidth : 300;
      // Concave cylinder: cards tile the curved wall (shared edges, no gaps).
      // Center sits deepest (smallest); its height matches the receding inner
      // edge of the neighbours, so the seams align into a continuous arc.
      const stepDeg = 23;                                  // angular gap per card
      const stepRad = (stepDeg * Math.PI) / 180;
      const R = w / (2 * Math.sin(stepRad / 2)) * 0.96;    // radius so chords ≈ card width
      itemsRef.current.forEach((el, i) => {
        if (!el) return;
        const rel = i - center;
        const a = Math.abs(rel);
        const theta = rel * stepDeg;
        el.style.transform = `translate(-50%, -50%) rotateY(${theta}deg) translateZ(${-R}px)`;
        el.style.transformOrigin = '50% 50%';
        el.style.zIndex = String(Math.round(100 - a * 10));
        el.style.opacity = String(a >= 3 ? 0.55 : 1);      // edge cards half-faded
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [images]);

  return (
    <div
      className="relative h-full w-full [perspective:1700px] [transform-style:preserve-3d]"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
      }}
      aria-hidden
    >
      {images.map((src, i) => (
        <div
          key={i}
          ref={(el) => (itemsRef.current[i] = el)}
          className="absolute left-1/2 top-1/2 aspect-[3/4] h-[clamp(300px,52vh,540px)] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 22%' }} draggable={false} />
        </div>
      ))}
    </div>
  );
}

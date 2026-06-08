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
      const w = first ? first.offsetWidth : 260;
      const S = w * 0.96;                       // spacing → cards sit side by side with gaps (no overlap)
      itemsRef.current.forEach((el, i) => {
        if (!el) return;
        const rel = i - center;
        const a = Math.abs(rel);
        const sign = Math.sign(rel);
        // Panorama: equal-size cards on a concave curved wall. Center is flat &
        // front; sides rotate away, recede and fade. No size morphing.
        const x = rel * S;
        const rotY = -sign * Math.min(a, 3) * 34;          // rotation grows outward
        const tz = -a * 130;                                // sides recede (center stays front)
        const scale = a <= 1 ? 1 : Math.max(0.82, 1 - (a - 1) * 0.1);
        const opacity = a <= 1 ? 1 : Math.max(0, 1 - (a - 1) * 0.55);
        el.style.transform = `translate(-50%, -50%) translateX(${x}px) rotateY(${rotY}deg) translateZ(${tz}px) scale(${scale})`;
        el.style.zIndex = String(Math.round(100 - a * 10));
        el.style.opacity = String(opacity);
      });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [images]);

  return (
    <div
      className="relative h-full w-full [perspective:1150px] [transform-style:preserve-3d]"
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

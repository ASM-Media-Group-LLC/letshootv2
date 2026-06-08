'use client';

import { useEffect, useRef } from 'react';

// 3D coverflow marquee: images arranged on a curved arc (center flat, sides
// rotated in 3D), auto-scrolling infinitely. Math-driven (no layout reads).
export default function CoverflowMarquee({ images, speed = 0.0042 }) {
  const itemsRef = useRef([]);
  const posRef = useRef(0);
  const spacingRef = useRef(230);

  useEffect(() => {
    const measure = () => {
      const first = itemsRef.current[0];
      if (first) spacingRef.current = first.offsetWidth * 0.74;
    };
    measure();
    window.addEventListener('resize', measure);

    const N = images.length;
    let raf;
    const tick = () => {
      posRef.current = (posRef.current + speed) % N;
      const S = spacingRef.current;
      const pos = posRef.current;
      for (let i = 0; i < N; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;
        let rel = ((i - pos) % N + N) % N;   // 0..N
        if (rel > N / 2) rel -= N;           // -N/2..N/2
        const norm = rel / (N / 2);          // -1..1
        const x = rel * S;
        const rotY = -norm * 44;             // arc tilt
        const tz = -Math.abs(norm) * 260;    // depth
        const scale = 1 - Math.abs(norm) * 0.28;
        const opacity = Math.max(0, 1 - Math.abs(norm) * 1.08);
        el.style.transform = `translate(-50%, -50%) translateX(${x}px) rotateY(${rotY}deg) translateZ(${tz}px) scale(${scale})`;
        el.style.zIndex = String(Math.round(100 - Math.abs(rel) * 12));
        el.style.opacity = String(opacity);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [images, speed]);

  return (
    <div
      className="relative h-full w-full [perspective:1500px] [transform-style:preserve-3d]"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 13%, black 87%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 13%, black 87%, transparent)',
      }}
      aria-hidden
    >
      {images.map((src, i) => (
        <div
          key={i}
          ref={(el) => (itemsRef.current[i] = el)}
          className="absolute left-1/2 top-1/2 aspect-[3/4] h-[clamp(210px,34vh,360px)] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 will-change-transform"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 25%' }} draggable={false} />
        </div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

// Concave "panorama" carousel: the CENTER card is the smallest/flattest and the
// cards grow toward the sides, angled in 3D, fading at the edges. Auto-scrolls.
export default function PanoramaCarousel({ images, speed = 0.0034 }) {
  const itemsRef = useRef([]);
  const posRef = useRef(0);
  const spacingRef = useRef(260);

  useEffect(() => {
    const measure = () => {
      const first = itemsRef.current[0];
      if (first) spacingRef.current = first.offsetWidth * 0.92;
    };
    measure();
    window.addEventListener('resize', measure);

    const N = images.length;
    let raf;
    const lerp = (x, a, b) => a + (b - a) * x;
    const tick = () => {
      posRef.current = (posRef.current + speed) % N;
      const S = spacingRef.current;
      const pos = posRef.current;
      for (let i = 0; i < N; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;
        let rel = ((i - pos) % N + N) % N;     // 0..N
        if (rel > N / 2) rel -= N;             // -N/2..N/2
        const a = Math.abs(rel);
        const sign = Math.sign(rel);
        // Scale: smallest at center (a=0), peaks at the first neighbours (a≈1),
        // then shrinks toward the edges.
        const scale = a <= 1 ? lerp(a, 0.78, 1.0) : Math.max(0.45, lerp((a - 1) / 2, 1.0, 0.6));
        const x = rel * S;
        const rotY = -sign * Math.min(a, 3) * 22;          // angle grows outward
        const tz = (scale - 0.78) * 260 - a * 70;          // neighbours forward, center back
        const opacity = a <= 1 ? 1 : Math.max(0, 1 - (a - 1) * 0.62);
        el.style.transform = `translate(-50%, -50%) translateX(${x}px) rotateY(${rotY}deg) translateZ(${tz}px) scale(${scale})`;
        el.style.zIndex = String(Math.round(100 - a * 10));
        el.style.opacity = String(opacity);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [images, speed]);

  return (
    <div
      className="relative h-full w-full [perspective:1150px] [transform-style:preserve-3d]"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)',
      }}
      aria-hidden
    >
      {images.map((src, i) => (
        <div
          key={i}
          ref={(el) => (itemsRef.current[i] = el)}
          className="absolute left-1/2 top-1/2 aspect-[3/4] h-[clamp(300px,52vh,540px)] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 will-change-transform"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 22%' }} draggable={false} />
        </div>
      ))}
    </div>
  );
}

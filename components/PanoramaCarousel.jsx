'use client';

import { useEffect, useRef } from 'react';

// Concave cylinder panorama (Fanvue-style). Cards sit on a curved wall with a
// gap between them; side cards recede, darken and fade. Draggable (with inertia
// + snap) and wheel-scrollable, looping — without breaking the arc.
export default function PanoramaCarousel({ images }) {
  const wrapRef = useRef(null);
  const itemsRef = useRef([]);
  const shadeRef = useRef([]);
  const posRef = useRef(0);

  useEffect(() => {
    const N = images.length;
    let R = 900;
    const STEP = 27;                         // angular spacing per card (deg)

    const measure = () => {
      const first = itemsRef.current[0];
      const W = first ? first.offsetWidth : 300;
      const gap = W * 0.2;                    // visible gap between cards
      R = (W + gap) / (2 * Math.sin((STEP * Math.PI / 180) / 2));
    };

    const apply = () => {
      const pos = posRef.current;
      for (let i = 0; i < N; i++) {
        const el = itemsRef.current[i];
        if (!el) continue;
        let rel = ((i - pos) % N + N) % N;
        if (rel > N / 2) rel -= N;
        const a = Math.abs(rel);
        const theta = rel * STEP;
        el.style.transform = `translate(-50%, -50%) rotateY(${theta}deg) translateZ(${-R}px)`;
        el.style.zIndex = String(Math.round(200 - a * 20));
        el.style.opacity = String(Math.max(0, Math.min(1, 1 - (a - 2.4))));  // fade toward wrap edge
        const sh = shadeRef.current[i];
        if (sh) sh.style.opacity = String(Math.min(0.78, a * 0.22));         // edge cards darker
      }
    };

    measure();
    apply();

    // ── Interaction: drag + wheel, with inertia and snap-to-card ──────────────
    let raf = 0;
    let dragging = false;
    let lastX = 0;
    let vel = 0;
    let wheelTimer = 0;
    const sens = () => (itemsRef.current[0]?.offsetWidth || 300) * 0.7;

    const stopRaf = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const settle = () => {
      posRef.current += vel;
      vel *= 0.91;
      const target = Math.round(posRef.current);
      if (Math.abs(vel) < 0.0015) {
        posRef.current += (target - posRef.current) * 0.18;
        if (Math.abs(target - posRef.current) < 0.0008) {
          posRef.current = target;
          apply();
          raf = 0;
          return;
        }
      }
      apply();
      raf = requestAnimationFrame(settle);
    };

    const getX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
    const onDown = (e) => { dragging = true; lastX = getX(e); vel = 0; stopRaf(); };
    const onMove = (e) => {
      if (!dragging) return;
      const x = getX(e);
      const dx = x - lastX;
      lastX = x;
      vel = -dx / sens();
      posRef.current += vel;
      apply();
    };
    const onUp = () => { if (!dragging) return; dragging = false; stopRaf(); raf = requestAnimationFrame(settle); };
    const onWheel = (e) => {
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      posRef.current += d / (sens() * 2.4);
      apply();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { vel = 0; stopRaf(); raf = requestAnimationFrame(settle); }, 120);
    };
    const onResize = () => { measure(); apply(); };

    const node = wrapRef.current;
    node.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    node.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      stopRaf();
      clearTimeout(wheelTimer);
      node.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      node.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  }, [images]);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full cursor-grab touch-pan-y select-none [perspective:1700px] [transform-style:preserve-3d] active:cursor-grabbing"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
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
          {/* depth shade — darkens cards toward the edges */}
          <div ref={(el) => (shadeRef.current[i] = el)} className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 0 }} aria-hidden />
        </div>
      ))}
    </div>
  );
}

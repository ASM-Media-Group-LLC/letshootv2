'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Before/After reveal slider.
// • Initial state: handle near the middle → curtain "semi-open" so it's obvious
//   it's a comparison (both sides + divider visible).
// • Click / tap anywhere on the image → toggles between fully closed (pos=0)
//   and fully open (pos=100), animated.
// • Drag the handle (or anywhere with intent) → manual control.
// Click vs drag is detected by movement threshold during the pointer down→up.
export default function BeforeAfter({ before, after, beforeLabel, afterLabel, alt = '' }) {
  const [pos, setPos] = useState(20);           // ← starts slightly open (peek of AI on the left); first tap → full AI
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef(null);
  const dragMeta = useRef({ startX: 0, moved: 0 }); // for click-vs-drag detection

  const setFromClientX = useCallback((clientX) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  }, []);

  // Global move/up while dragging
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      dragMeta.current.moved += Math.abs(x - dragMeta.current.startX);
      dragMeta.current.startX = x;
      // Only commit drag movement once user has moved enough (avoid jitter)
      if (dragMeta.current.moved > 4) {
        setAnimating(false);
        setFromClientX(x);
      }
    };
    const onUp = (e) => {
      setDragging(false);
      // If user barely moved → treat as a click → toggle
      if (dragMeta.current.moved < 5) {
        setAnimating(true);
        setPos((p) => (p < 50 ? 100 : 0));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, setFromClientX]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft')  { setAnimating(false); setPos((p) => Math.max(0, p - 4)); }
    if (e.key === 'ArrowRight') { setAnimating(false); setPos((p) => Math.min(100, p + 4)); }
    if (e.key === 'Enter' || e.key === ' ') { setAnimating(true); setPos((p) => (p < 50 ? 100 : 0)); }
  };

  const smooth = animating
    ? 'transition-[clip-path,left,opacity] duration-700 ease-out'
    : '';

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[5/6] w-full cursor-pointer select-none overflow-hidden rounded-3xl border border-line"
      onPointerDown={(e) => {
        dragMeta.current = { startX: e.clientX, moved: 0 };
        setDragging(true);
      }}
    >
      {/* BEFORE (base, full) — what you see on first load */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={before} alt={alt ? `${alt} — cámara regular` : 'Cámara regular'} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <span
        className={`pointer-events-none absolute right-4 top-4 rounded-full bg-ink/80 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-paper-mute shadow-lg backdrop-blur-sm ${smooth}`}
        style={{ opacity: pos < 88 ? 1 : 0 }}
      >
        {beforeLabel}
      </span>

      {/* AFTER (revealed from the LEFT as handle moves right) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={after}
        alt={alt ? `${alt} — IA` : 'Resultado IA'}
        className={`absolute inset-0 h-full w-full object-cover ${smooth}`}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <span
        className={`pointer-events-none absolute left-4 top-4 rounded-full bg-brand px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-on-accent shadow-lg ${smooth}`}
        style={{ opacity: pos > 12 ? 1 : 0 }}
      >
        {afterLabel}
      </span>

      {/* Divider + handle */}
      <div
        className={`absolute inset-y-0 z-10 w-[3px] -translate-x-1/2 bg-brand ${smooth}`}
        style={{
          left: `${pos}%`,
          // Hide divider when fully closed (only "antes" showing)
          opacity: pos < 1 ? 0 : 1,
        }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparar antes y después"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragMeta.current = { startX: e.clientX, moved: 999 }; // force drag mode
            setDragging(true);
            setAnimating(false);
          }}
          className="absolute left-1/2 top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border-2 border-brand bg-ink/90 text-brand shadow-xl backdrop-blur transition-transform hover:scale-110 focus-visible:scale-110"
        >
          <div className="flex items-center">
            <ChevronLeft size={15} aria-hidden />
            <ChevronRight size={15} aria-hidden className="-ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}

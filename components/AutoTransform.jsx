'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { Sparkles, Camera } from 'lucide-react';

// ── Auto-looping real → AI transformation with a CAMERA-FLASH reveal ──────────
// The "real" photo shows first. A quick white flash fires (like a camera shutter)
// and at the flash peak the image swaps to the AI version — so it reads as
// "snap → new look generated". Loops automatically. Press & hold to peek at real.

const flashEase = [0.4, 0, 0.2, 1];

export default function AutoTransform({
  before, after, beforeLabel = 'Real', afterLabel = 'IA', badge = '2s', alt = '', showLabel = true, stayOnAI = false,
}) {
  const afterOpacity = useMotionValue(0); // 0 = real shown, 1 = AI shown
  const flash = useMotionValue(0);        // white overlay
  const shutter = useMotionValue(1);      // subtle scale pulse on capture
  const [showAI, setShowAI] = useState(false);
  const peekRef = useRef(false);

  useEffect(() => {
    let active = true;
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const holdForPeek = async () => { while (peekRef.current && active) { await wait(150); } return active; };

    // One camera-flash capture: blink white, swap image at the peak.
    async function capture(toAI) {
      // shutter punch-in
      animate(shutter, 0.97, { duration: 0.1, ease: flashEase });
      await animate(flash, 1, { duration: 0.11, ease: 'easeIn' }).finished;
      if (!active) return;
      // swap underneath the white peak
      afterOpacity.set(toAI ? 1 : 0);
      setShowAI(toAI);
      animate(shutter, 1, { duration: 0.45, ease: flashEase });
      await animate(flash, 0, { duration: 0.42, ease: 'easeOut' }).finished;
    }

    async function loop() {
      // settle on real, then capture → AI
      afterOpacity.set(0); setShowAI(false); flash.set(0);
      await wait(800);
      if (!(await holdForPeek())) return;
      await capture(true);     // → AI
      while (active) {
        if (stayOnAI) {
          // Rest on AI; periodically re-flash through real to keep it alive
          await wait(3400);
          if (!(await holdForPeek())) return;
          await capture(false); // brief real
          await wait(300);
          if (!(await holdForPeek())) return;
          await capture(true);  // back to AI
        } else {
          await wait(2000);     // admire the AI result
          if (!(await holdForPeek())) return;
          await capture(false); // → real
          await wait(1400);
          if (!(await holdForPeek())) return;
          await capture(true);  // → AI
        }
      }
    }
    loop();
    return () => { active = false; };
  }, [afterOpacity, flash, shutter, stayOnAI]);

  const startPeek = () => { peekRef.current = true; afterOpacity.set(0); setShowAI(false); };
  const endPeek = () => { peekRef.current = false; if (stayOnAI) { afterOpacity.set(1); setShowAI(true); } };

  return (
    <motion.div
      className="relative w-full select-none overflow-hidden rounded-3xl"
      style={{
        aspectRatio: '4 / 5', scale: shutter,
        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(var(--overlay)/0.12)',
      }}
      onPointerDown={startPeek}
      onPointerUp={endPeek}
      onPointerLeave={endPeek}
    >
      {/* REAL photo (base) */}
      <img src={before} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 12%' }} draggable={false} />

      {/* AI photo (crossfades in at flash peak) */}
      <motion.img
        src={after} alt="" aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '50% 12%', opacity: afterOpacity }}
        draggable={false}
      />

      {/* Camera flash overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          opacity: flash,
          background: 'radial-gradient(circle at 50% 42%, #ffffff 0%, #ffffff 55%, rgba(127,224,255,0.9) 100%)',
        }}
      />

      {/* Status pill — switches text + style between real / AI */}
      {showLabel && (
      <div className="pointer-events-none absolute left-3 top-3 z-30">
        <AnimatePresence mode="wait" initial={false}>
          {showAI ? (
            <motion.span
              key="ai"
              initial={{ opacity: 0, y: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-accent shadow-glow"
            >
              <Sparkles size={11} aria-hidden /> {afterLabel} · {badge}
            </motion.span>
          ) : (
            <motion.span
              key="real"
              initial={{ opacity: 0, y: -6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-white backdrop-blur-md"
              style={{ background: 'rgba(7,10,15,0.6)' }}
            >
              <Camera size={11} aria-hidden /> {beforeLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      )}
    </motion.div>
  );
}

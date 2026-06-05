'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useMotionTemplate, useTransform, animate } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// ── Auto-looping real → AI transformation ────────────────────────────────────
// The "before" (real) photo is always visible underneath. The "after" (AI) photo
// is revealed top→bottom with a glowing scanline, holds, then resets — on a loop.
// No interaction required: the magic plays automatically. Press-and-hold to peek
// at the original ("real") for comparison.

const ease = [0.4, 0, 0.2, 1];

export default function AutoTransform({
  before, after, beforeLabel = 'Real', afterLabel = 'IA', badge = '2s', alt = '',
}) {
  // reveal: 0 = after fully hidden (only real shows), 1 = after fully shown
  const reveal = useMotionValue(0);
  const afterOpacity = useMotionValue(1);
  const [peeking, setPeeking] = useState(false);
  const peekRef = useRef(false);

  useEffect(() => {
    let active = true;
    async function loop() {
      while (active) {
        // wait out a peek
        while (peekRef.current) { await new Promise(r => setTimeout(r, 120)); if (!active) return; }
        reveal.set(0); afterOpacity.set(1);
        await animate(reveal, 1, { duration: 1.7, ease }).finished;     // scanline sweep
        if (!active) return;
        await new Promise(r => setTimeout(r, 1800));                     // hold AI result
        if (!active) return;
        while (peekRef.current) { await new Promise(r => setTimeout(r, 120)); if (!active) return; }
        await animate(afterOpacity, 0, { duration: 0.55, ease }).finished; // dissolve back to real
        if (!active) return;
        await new Promise(r => setTimeout(r, 900));                      // breathe on real
      }
    }
    loop();
    return () => { active = false; };
  }, [reveal, afterOpacity]);

  // clip the AFTER image from the bottom up as reveal grows
  const bottomInset = useTransform(reveal, [0, 1], [100, 0]);
  const clip = useMotionTemplate`inset(0 0 ${bottomInset}% 0)`;
  const scanY = useMotionTemplate`${useTransform(reveal, [0, 1], [0, 100])}%`;
  const scanOpacity = useTransform(reveal, [0, 0.03, 0.97, 1], [0, 1, 1, 0]);
  const badgeOpacity = useTransform(reveal, [0.72, 1], [0, 1]);
  const badgeScale = useTransform(reveal, [0.72, 1], [0.85, 1]);

  const startPeek = () => { peekRef.current = true; setPeeking(true); animate(afterOpacity, 0, { duration: 0.25 }); };
  const endPeek = () => { peekRef.current = false; setPeeking(false); };

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-3xl"
      style={{ aspectRatio: '4 / 5', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(var(--overlay)/0.12)' }}
      onPointerDown={startPeek}
      onPointerUp={endPeek}
      onPointerLeave={endPeek}
    >
      {/* REAL photo (always underneath) */}
      <img src={before} alt={alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 18%' }} draggable={false} />

      {/* AI photo (revealed top→down) */}
      <motion.img
        src={after} alt="" aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '50% 18%', clipPath: clip, opacity: afterOpacity }}
        draggable={false}
      />

      {/* Glowing scanline */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{
          top: scanY, opacity: scanOpacity, height: '3px', marginTop: '-1.5px',
          background: 'linear-gradient(90deg,transparent 0%,rgba(0,177,246,0.5) 10%,rgba(127,224,255,1) 50%,rgba(0,177,246,0.5) 90%,transparent 100%)',
          boxShadow: '0 0 18px 6px rgba(0,177,246,0.45)',
        }}
      />

      {/* Corner labels */}
      <div className="pointer-events-none absolute left-3 top-3 z-30">
        <span className="glass-ios rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper">{beforeLabel}</span>
      </div>
      <motion.div className="pointer-events-none absolute right-3 top-3 z-30" style={{ opacity: badgeOpacity, scale: badgeScale }}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-on-accent shadow-glow">
          <Sparkles size={11} aria-hidden /> {afterLabel} · {badge}
        </span>
      </motion.div>

      {/* Peek hint */}
      {peeking && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-ink/20">
          <span className="glass-ios rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper">{beforeLabel}</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Balanced palette — mostly soft white/light with a few blue accents
// (so it doesn't read as "all blue").
const COLORS = [
  'rgba(255,255,255,0.95)',
  'rgba(214,230,248,0.9)',
  'rgba(127,224,255,0.85)',
  'rgba(255,255,255,0.9)',
  'rgba(0,177,246,0.8)',
  'rgba(228,236,248,0.9)',
];

// Deterministic particle field (no Math.random → SSR-safe)
const PARTICLES = Array.from({ length: 32 }, (_, i) => ({
  x: (i * 36.7) % 100,
  y: (i * 23.3) % 100,
  size: 2 + (i % 4),              // 2–5px
  dur: 9 + (i % 7) * 1.8,         // 9–19.8s float loop
  delay: (i % 9) * 0.7,
  drift: 28 + (i % 5) * 14,       // upward float distance
  sway: ((i % 3) - 1) * 16,       // -16 / 0 / 16px
  op: 0.3 + (i % 4) * 0.13,       // 0.3–0.69
  color: COLORS[i % COLORS.length],
  depth: 0.5 + (i % 3) * 0.35,    // parallax depth factor
}));

// Floating particle layer. When `interactive`, the field drifts with the cursor
// (parallax). Particle opacity/float still animate on their own.
export default function Particles({ interactive = true, parallax = 28, className = '' }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 22 });
  const sy = useSpring(my, { stiffness: 50, damping: 22 });

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * parallax);
      my.set((e.clientY / window.innerHeight - 0.5) * parallax);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive, parallax, mx, my]);

  return (
    <motion.div
      aria-hidden
      style={{ x: sx, y: sy }}
      className={`pointer-events-none absolute inset-[-6%] overflow-hidden ${className}`}
    >
      {PARTICLES.map((pt, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${pt.x}%`, top: `${pt.y}%`, width: pt.size, height: pt.size,
            background: pt.color,
            boxShadow: `0 0 ${pt.size * 2.5}px ${pt.size * 0.8}px ${pt.color}`,
          }}
          animate={{ y: [0, -pt.drift, 0], x: [0, pt.sway, 0], opacity: [0, pt.op, pt.op, 0] }}
          transition={{ duration: pt.dur, ease: 'easeInOut', repeat: Infinity, delay: pt.delay }}
        />
      ))}
    </motion.div>
  );
}

'use client';

// AnimatedGradientBackground — radial gradient with optional breathing animation.
// Theme-aware: dark cinematic palette for dark mode, soft pastel for light.

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Cinematic dark palette (default)
const DARK_COLORS = [
  '#020308',  // pure dark center
  '#0A1F4A',  // deep navy
  '#1B4FBF',  // electric blue
  '#00B1F6',  // brand cyan (logo)
  '#7B5BFF',  // violet bridge
  '#FF3D7F',  // vivid pink
  '#FF9A5A',  // warm coral
  '#FFD600',  // gold edge
];

// Soft pastel palette for light mode — same family, much lighter values
const LIGHT_COLORS = [
  '#FFFFFF',  // white center
  '#EEF6FF',  // very light blue
  '#D6E9FF',  // soft blue
  '#A8D4FF',  // sky blue
  '#C8C2FF',  // soft violet
  '#FFC2DD',  // soft pink
  '#FFD8B8',  // soft coral
  '#FFEDA8',  // soft gold
];

// Stable ref so React's useEffect deps don't recreate it each render
const DEFAULT_STOPS = [0, 28, 45, 58, 72, 85, 94, 100];

export default function AnimatedGradientBg({
  startingGap     = 125,
  Breathing       = true,
  // gradientColors prop overrides theme detection if provided.
  gradientColors,
  gradientStops   = DEFAULT_STOPS,
  animationSpeed  = 0.02,
  breathingRange  = 6,
  containerStyle  = {},
  topOffset       = 0,
  containerClassName = '',
  interactive     = true,   // radial center drifts toward the cursor
}) {
  // Watch the [data-theme] attribute on <html> so we can swap palettes live.
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute('data-theme') || 'dark');
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  const colors = gradientColors || (theme === 'light' ? LIGHT_COLORS : DARK_COLORS);
  if (colors.length !== gradientStops.length) {
    throw new Error('colors and gradientStops must have the same length');
  }

  const containerRef = useRef(null);
  // Radial-gradient center: target (tx,ty) follows the cursor, current (cx,cy) lerps toward it.
  const centerRef = useRef({ tx: 50, ty: 20, cx: 50, cy: 20 });

  // Cursor tracking — drift the gradient center toward the pointer.
  useEffect(() => {
    if (!interactive) return;
    const onMove = (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;   // -0.5 .. 0.5
      const ny = e.clientY / window.innerHeight - 0.5;
      centerRef.current.tx = 50 + nx * 46;              // ~27% .. 73%
      centerRef.current.ty = 20 + ny * 34;              // ~3% .. 37%
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive]);

  useEffect(() => {
    let raf;
    let width = startingGap;
    let dir = 1;

    const tick = () => {
      if (width >= startingGap + breathingRange) dir = -1;
      if (width <= startingGap - breathingRange) dir = 1;
      if (!Breathing) dir = 0;
      width += dir * animationSpeed;

      // Ease the gradient center toward the cursor target
      const c = centerRef.current;
      c.cx += (c.tx - c.cx) * 0.06;
      c.cy += (c.ty - c.cy) * 0.06;

      const stops = gradientStops.map((s, i) => `${colors[i]} ${s}%`).join(', ');
      const gradient = `radial-gradient(${width}% ${width + topOffset}% at ${c.cx.toFixed(2)}% ${c.cy.toFixed(2)}%, ${stops})`;
      if (containerRef.current) containerRef.current.style.background = gradient;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // colors is recreated each render; depend on `theme` and gradientColors instead.
  }, [startingGap, Breathing, theme, gradientColors, gradientStops, animationSpeed, breathingRange, topOffset]);

  return (
    <motion.div
      key="animated-gradient-bg"
      initial={{ opacity: 0, scale: 1.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { duration: 2, ease: [0.25, 0.1, 0.25, 1] },
      }}
      className={`absolute inset-0 overflow-hidden ${containerClassName}`}
      aria-hidden
    >
      <div ref={containerRef} style={containerStyle} className="absolute inset-0 transition-transform" />
    </motion.div>
  );
}

'use client';

// AnimatedGradientBackground — radial gradient with optional breathing animation.
// Ported from TypeScript to plain JS for this project. Used as the hero backdrop.

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

export default function AnimatedGradientBg({
  startingGap     = 125,
  Breathing       = true,
  // Multi-color radial — the curve of each color band is clearly visible
  // because adjacent stops have contrasting hues.
  gradientColors  = [
    '#020308',  // pure dark center
    '#0A1F4A',  // deep navy
    '#1B4FBF',  // electric blue
    '#00B1F6',  // brand cyan (logo)
    '#7B5BFF',  // violet bridge
    '#FF3D7F',  // vivid pink
    '#FF9A5A',  // warm coral (extra color for visible curve)
    '#FFD600',  // gold edge (final ring, very visible curve)
  ],
  gradientStops   = [0, 28, 45, 58, 72, 85, 94, 100],
  animationSpeed  = 0.02,
  breathingRange  = 6,
  containerStyle  = {},
  topOffset       = 0,
  containerClassName = '',
}) {
  if (gradientColors.length !== gradientStops.length) {
    throw new Error('gradientColors and gradientStops must have the same length');
  }

  const containerRef = useRef(null);

  useEffect(() => {
    let raf;
    let width = startingGap;
    let dir = 1;

    const tick = () => {
      if (width >= startingGap + breathingRange) dir = -1;
      if (width <= startingGap - breathingRange) dir = 1;
      if (!Breathing) dir = 0;
      width += dir * animationSpeed;

      const stops = gradientStops.map((s, i) => `${gradientColors[i]} ${s}%`).join(', ');
      const gradient = `radial-gradient(${width}% ${width + topOffset}% at 50% 20%, ${stops})`;
      if (containerRef.current) containerRef.current.style.background = gradient;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startingGap, Breathing, gradientColors, gradientStops, animationSpeed, breathingRange, topOffset]);

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

'use client';

// MeshGradient WebGL background — vibrant blues + pinks for cinematic feel.
// Uses `fixed inset-0` so it persists through the hero sticky scroll.

import { useEffect, useState } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';

// Vibrant blue + pink palette (saturated tones for that cinematic look)
const COLORS = [
  '#0A1F4A',  // deep navy
  '#1B4FBF',  // electric blue
  '#3D7CFF',  // bright blue
  '#7B5BFF',  // violet bridge
  '#FF3D7F',  // vivid pink
  '#FF7AB6',  // soft pink
];

export default function MeshBg({
  colors     = COLORS,
  distortion = 0.8,
  swirl      = 0.6,
  speed      = 0.42,
  offsetX    = 0.08,
  veil       = 'bg-black/35',
}) {
  const [dim, setDim]       = useState({ width: 1920, height: 1080 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => setDim({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!mounted) return null;

  return (
    // absolute (not fixed) — scoped to the parent sticky hero so it doesn't
    // bleed into the footer / page below.
    <div className="absolute inset-0 z-0 h-full w-full overflow-hidden" aria-hidden>
      <MeshGradient
        width={dim.width}
        height={dim.height}
        colors={colors}
        distortion={distortion}
        swirl={swirl}
        grainMixer={0}
        grainOverlay={0}
        speed={speed}
        offsetX={offsetX}
      />
      {/* Veil for readability */}
      <div className={`absolute inset-0 pointer-events-none ${veil}`} />
    </div>
  );
}

'use client';

// Simple line-art illustrations that show the creator exactly what to capture
// for each clone shot and for each ID document. Stroke uses currentColor so the
// parent controls the tint. No emojis — clean vector diagrams.

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ children }) {
  return <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>{children}</svg>;
}

const ART = {
  // ── Clone shots ──────────────────────────────────────────────────────────
  front: (
    <Svg>
      <circle cx="24" cy="21" r="12" {...S} />
      <circle cx="19.5" cy="19" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="28.5" cy="19" r="1.1" fill="currentColor" stroke="none" />
      <path d="M19 26 q5 4 10 0" {...S} />
      <path d="M12 42 q12 -9 24 0" {...S} />
    </Svg>
  ),
  left: (
    <Svg>
      <path d="M32 9 C 20 9, 14 17, 14 24 C 14 29, 17 31, 18 34 C 19 37, 22 37, 24 37" {...S} />
      <path d="M14 24 q-3 1 -1 4" {...S} />
      <circle cx="20" cy="21" r="1.1" fill="currentColor" stroke="none" />
      <path d="M32 9 C 39 12, 40 30, 34 37 L 24 37" {...S} />
    </Svg>
  ),
  right: (
    <Svg>
      <g transform="translate(48,0) scale(-1,1)">
        <path d="M32 9 C 20 9, 14 17, 14 24 C 14 29, 17 31, 18 34 C 19 37, 22 37, 24 37" {...S} />
        <path d="M14 24 q-3 1 -1 4" {...S} />
        <circle cx="20" cy="21" r="1.1" fill="currentColor" stroke="none" />
        <path d="M32 9 C 39 12, 40 30, 34 37 L 24 37" {...S} />
      </g>
    </Svg>
  ),
  expression: (
    <Svg>
      <circle cx="24" cy="22" r="12" {...S} />
      <path d="M17 17 q2.5 -2 5 0" {...S} />
      <path d="M26 17 q2.5 -2 5 0" {...S} />
      <path d="M17 26 q7 7 14 0" {...S} />
    </Svg>
  ),
  half: (
    <Svg>
      <circle cx="24" cy="14" r="7" {...S} />
      <path d="M11 42 C 11 30, 17 24, 24 24 C 31 24, 37 30, 37 42" {...S} />
    </Svg>
  ),
  body: (
    <Svg>
      <circle cx="24" cy="9" r="5" {...S} />
      <path d="M24 14 L 24 30" {...S} />
      <path d="M24 17 L 16 25 M24 17 L 32 25" {...S} />
      <path d="M24 30 L 18 43 M24 30 L 30 43" {...S} />
    </Svg>
  ),
  // ── ID documents ─────────────────────────────────────────────────────────
  id_front: (
    <Svg>
      <rect x="8" y="14" width="32" height="20" rx="2.5" {...S} />
      <rect x="11.5" y="18" width="8" height="10" rx="1.2" {...S} />
      <path d="M23 19 h13 M23 23 h13 M23 27 h9" {...S} />
    </Svg>
  ),
  id_back: (
    <Svg>
      <rect x="8" y="14" width="32" height="20" rx="2.5" {...S} />
      <rect x="8" y="18" width="32" height="4" fill="currentColor" stroke="none" opacity="0.5" />
      <path d="M12 27 h16 M12 30 h10" {...S} />
    </Svg>
  ),
  selfie_id: (
    <Svg>
      <circle cx="18" cy="19" r="7" {...S} />
      <path d="M8 40 C 8 30, 13 27, 18 27 C 20 27, 22 27.5, 24 28.5" {...S} />
      <rect x="26" y="24" width="15" height="10" rx="1.6" {...S} />
      <rect x="28" y="26.5" width="4" height="5" rx="0.8" {...S} />
      <path d="M34 27 h5 M34 30 h4" {...S} />
    </Svg>
  ),
};

export default function ShotArt({ kind, className = '' }) {
  const art = ART[kind];
  if (!art) return null;
  return <span className={className}>{art}</span>;
}

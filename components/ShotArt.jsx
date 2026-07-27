'use client';

// Premium flat-illustration mockups for the ID-verification step. We can't show
// a real government ID, so these are designed, filled illustrations (layered
// opacities of currentColor for depth) — not thin line-art. The parent sets the
// tint via text color. No emojis.

function Svg({ children }) {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden fill="currentColor">
      {children}
    </svg>
  );
}

const ART = {
  // ── ID front: portrait card with photo, chip and data lines ───────────────
  id_front: (
    <Svg>
      {/* card body */}
      <rect x="6" y="16" width="52" height="34" rx="5" opacity="0.10" />
      <rect x="6" y="16" width="52" height="34" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      {/* photo well */}
      <rect x="11" y="22" width="16" height="20" rx="2.5" opacity="0.22" />
      <circle cx="19" cy="30" r="4.6" opacity="0.6" />
      <path d="M11.5 42 q7.5 -9 15 0 z" opacity="0.6" />
      {/* chip */}
      <rect x="31" y="22" width="7" height="5.5" rx="1.2" opacity="0.5" />
      {/* data lines */}
      <rect x="31" y="31" width="21" height="3" rx="1.5" opacity="0.5" />
      <rect x="31" y="37" width="21" height="3" rx="1.5" opacity="0.32" />
      <rect x="31" y="43" width="13" height="3" rx="1.5" opacity="0.32" />
    </Svg>
  ),
  // ── ID back: magnetic stripe, signature line and code block ───────────────
  id_back: (
    <Svg>
      <rect x="6" y="16" width="52" height="34" rx="5" opacity="0.10" />
      <rect x="6" y="16" width="52" height="34" rx="5" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      {/* magnetic stripe */}
      <rect x="6" y="22" width="52" height="7" opacity="0.5" />
      {/* signature + text */}
      <rect x="12" y="35" width="28" height="3" rx="1.5" opacity="0.42" />
      <rect x="12" y="41" width="20" height="3" rx="1.5" opacity="0.3" />
      {/* code block */}
      <rect x="44" y="35" width="8" height="9" rx="1.2" opacity="0.42" />
    </Svg>
  ),
  // ── Selfie with ID: phone frame, face and a held card ─────────────────────
  selfie_id: (
    <Svg>
      {/* phone */}
      <rect x="17" y="6" width="30" height="52" rx="7" opacity="0.10" />
      <rect x="17" y="6" width="30" height="52" rx="7" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      <rect x="28" y="10" width="8" height="2" rx="1" opacity="0.4" />
      {/* face */}
      <circle cx="30" cy="26" r="6" opacity="0.6" />
      <path d="M21 42 q9 -12 18 0 z" opacity="0.45" />
      {/* held ID card */}
      <rect x="33" y="38" width="15" height="11" rx="2" opacity="0.9" />
      <rect x="35" y="40.5" width="4.5" height="6" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="41" y="41" width="5.5" height="2" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="41" y="45" width="5.5" height="2" rx="1" fill="currentColor" opacity="0.35" />
    </Svg>
  ),
};

export default function ShotArt({ kind, className = '' }) {
  const art = ART[kind];
  if (!art) return null;
  return <span className={className}>{art}</span>;
}

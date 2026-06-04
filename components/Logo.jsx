'use client';

// Official LetShoot wordmark, rebuilt as a crisp, theme-aware component:
// "LetS" extrabold in brand cyan + "hoot" light, with a lightning bolt tucked
// inside the second "o" — matching the logo from the brand deck.

function Bolt({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M14 1.5 L4.5 13.5 H11 L9.2 22.5 L19.5 9.5 H12.5 L14 1.5 Z" />
    </svg>
  );
}

export default function Logo({ size = 'base', className = '' }) {
  const fs = size === 'lg' ? 'text-[30px]' : 'text-[23px]';
  return (
    <span
      className={`inline-flex select-none items-baseline leading-none tracking-[-0.02em] ${fs} ${className}`}
      style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif' }}
      aria-label="LetShoot"
    >
      <span className="font-extrabold text-brand">LetS</span>
      <span className="font-light text-paper">
        ho
        <span className="relative inline-block">
          o
          <Bolt className="absolute left-1/2 top-1/2 h-[0.62em] w-[0.42em] -translate-x-1/2 -translate-y-1/2 text-brand" />
        </span>
        t
      </span>
    </span>
  );
}

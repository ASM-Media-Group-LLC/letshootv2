'use client';

// Logo using the official PNG asset.
// The PNG has a transparent background with:
//   "LetS" in brand cyan (#00B1F6)
//   "hoot" + lightning bolt in white
// In dark mode: white "hoot" shows fine on dark bg.
// In light mode: we apply a drop-shadow to make the white "hoot" legible.
import { useTheme } from '@/app/providers';

export default function Logo({ size = 'base', className = '' }) {
  const { theme } = useTheme();
  const h = size === 'lg' ? 38 : 28;

  return (
    <img
      src="/logo.png"
      alt="LetShoot"
      height={h}
      className={className}
      style={{
        height: `${h}px`,
        width: 'auto',
        display: 'inline-block',
        // The "hoot" part is white — needs dark shadow in light mode to be readable.
        // In dark mode it shows naturally on dark backgrounds.
        filter: theme === 'light'
          ? 'drop-shadow(0 0 2px rgba(7,10,15,0.7)) drop-shadow(0 1px 3px rgba(7,10,15,0.5))'
          : 'none',
      }}
      draggable={false}
    />
  );
}

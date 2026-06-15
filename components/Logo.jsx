'use client';

// Logo using the official PNG assets — theme-aware:
//   • dark mode  → /logo.png       ("LetS" cyan + "hoot" white)
//   • light mode → /logo-light.png ("LetS" cyan + "hoot" black)
import { useTheme } from '@/app/providers';

export default function Logo({ size = 'base', className = '' }) {
  const { theme } = useTheme();
  const h = size === 'lg' ? 38 : size === 'sm' ? 22 : 28;
  const src = theme === 'light' ? '/logo-light.png' : '/logo.png';

  return (
    <img
      src={src}
      alt="LetShoot"
      height={h}
      className={className}
      style={{ height: `${h}px`, width: 'auto', display: 'inline-block' }}
      draggable={false}
    />
  );
}

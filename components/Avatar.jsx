'use client';

// Profile avatar: shows the real photo if there's one, otherwise a clean
// initials chip. Used across creator/team lists so a face shows up everywhere.
import { useState } from 'react';
import { initials } from '@/lib/portal-stats';

const SIZES = { xs: 'h-7 w-7 text-[11px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-lg' };

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false);
  const cls = `${SIZES[size] || SIZES.md} shrink-0 overflow-hidden rounded-full ${className}`;
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name || ''} onError={() => setBroken(true)}
        className={`${cls} object-cover ring-1 ring-hair/20`} />
    );
  }
  return (
    <span className={`${cls} grid place-items-center bg-brand/15 font-semibold text-brand ring-1 ring-brand/20`}>
      {initials(name)}
    </span>
  );
}

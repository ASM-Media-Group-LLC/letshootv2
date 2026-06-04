'use client';

import { useLang } from '@/app/providers';

// Premium: white / stroke / brand blue — no lime or pink
const HUES = ['text-paper', 'text-stroke', 'text-brand', 'text-paper/60', 'text-sky', 'text-stroke', 'text-brand', 'text-paper/40'];

export default function Marquee() {
  const { t } = useLang();
  const items = t.marquee;
  const row = [...items, ...items];

  return (
    <section className="relative border-y border-line bg-ink-2 py-8 sm:py-10">
      <div className="overflow-hidden">
        <div className="marquee-track animate-marquee">
          {row.map((w, i) => (
            <span
              key={`a-${i}`}
              className={`headline mx-6 text-[clamp(2.25rem,6vw,4.5rem)] uppercase ${HUES[i % HUES.length]}`}
            >
              {w}
              <span className="mx-6 align-middle text-brand">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useLang } from '@/app/providers';
import Logo from './Logo';

export default function Footer() {
  const { t } = useLang();
  const f = t.footer;

  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size="lg" />
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-paper-mute sm:mx-0">{f.tagline}</p>
          </div>

          {f.cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[11px] uppercase tracking-wider text-paper-dim">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-paper-mute transition-colors hover:text-brand">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-line pt-6 text-center font-mono text-xs uppercase tracking-wider text-paper-dim">
          {f.copyright}
        </div>
      </div>
    </footer>
  );
}

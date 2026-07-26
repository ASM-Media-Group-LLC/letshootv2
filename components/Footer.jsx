'use client';

import Link from 'next/link';
import { useLang } from '@/app/providers';
import Logo from './Logo';

export default function Footer() {
  const { t, lang } = useLang();
  const f = t.footer;
  const es = lang === 'es';
  // Legal pages — payment processors require these publicly linked.
  const legal = [
    { href: '/terms', label: es ? 'Términos de servicio' : 'Terms of Service' },
    { href: '/privacy', label: es ? 'Privacidad' : 'Privacy Policy' },
    { href: '/usc2257', label: '18 U.S.C. § 2257' },
    { href: '/contacto', label: es ? 'Contacto' : 'Contact' },
  ];

  return (
    <footer className="border-t border-line bg-ink-2">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size="lg" />
            <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-paper-mute sm:mx-0">{f.tagline}</p>
            <div className="mt-5 flex items-center justify-center gap-2 sm:justify-start">
              {f.builtFor && <span className="font-mono text-[10px] uppercase tracking-wider text-paper-dim">{f.builtFor}</span>}
              <img src="/onlyfans-logo.png" alt="OnlyFans" className="h-4 w-auto opacity-90" draggable={false} />
            </div>
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

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-line pt-6">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {legal.map((l) => (
              <Link key={l.href} href={l.href} className="text-xs text-paper-dim transition-colors hover:text-brand">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="text-center font-mono text-xs uppercase tracking-wider text-paper-dim">
            {f.copyright} · 18+
          </div>
        </div>
      </div>
    </footer>
  );
}

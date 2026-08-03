'use client';

import Link from 'next/link';
import { useLang } from '@/app/providers';
import Logo from './Logo';

// Legal link labels — all 7 public site languages, fallback en.
// (18 U.S.C. § 2257 is a statute citation and stays identical everywhere.)
const LEGAL_LABELS = {
  es: { terms: 'Términos de servicio', privacy: 'Privacidad', usc2257: '18 U.S.C. § 2257', use: 'Uso aceptable', dmca: 'DMCA', report: 'Retirar contenido', contact: 'Contacto' },
  en: { terms: 'Terms of Service', privacy: 'Privacy Policy', usc2257: '18 U.S.C. § 2257', use: 'Acceptable Use', dmca: 'DMCA', report: 'Content removal', contact: 'Contact' },
  pt: { terms: 'Termos de serviço', privacy: 'Privacidade', usc2257: '18 U.S.C. § 2257', use: 'Uso aceitável', dmca: 'DMCA', report: 'Remoção de conteúdo', contact: 'Contato' },
  fr: { terms: 'Conditions d’utilisation', privacy: 'Confidentialité', usc2257: '18 U.S.C. § 2257', use: 'Usage acceptable', dmca: 'DMCA', report: 'Retrait de contenu', contact: 'Contact' },
  de: { terms: 'Nutzungsbedingungen', privacy: 'Datenschutz', usc2257: '18 U.S.C. § 2257', use: 'Zulässige Nutzung', dmca: 'DMCA', report: 'Inhalt entfernen', contact: 'Kontakt' },
  it: { terms: 'Termini di servizio', privacy: 'Privacy', usc2257: '18 U.S.C. § 2257', use: 'Uso accettabile', dmca: 'DMCA', report: 'Rimozione contenuti', contact: 'Contatti' },
  zh: { terms: '服务条款', privacy: '隐私政策', usc2257: '18 U.S.C. § 2257', use: '可接受使用', dmca: 'DMCA', report: '内容删除', contact: '联系我们' },
};

export default function Footer() {
  const { t, lang } = useLang();
  const f = t.footer;
  const L = LEGAL_LABELS[lang] || LEGAL_LABELS.en;
  // Legal pages — payment processors require these publicly linked.
  const legal = [
    { href: '/terms', label: L.terms },
    { href: '/privacy', label: L.privacy },
    { href: '/usc2257', label: L.usc2257 },
    { href: '/acceptable-use', label: L.use },
    { href: '/dmca', label: L.dmca },
    { href: '/report', label: L.report },
    { href: '/contacto', label: L.contact },
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

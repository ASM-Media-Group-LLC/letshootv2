'use client';

// Shared layout for legal pages (/terms, /privacy, /usc2257, /contacto).
// Bilingual: Spanish when site language is 'es', English otherwise.
// Payment processors (CCBill/Epoch) require these pages to be publicly linked.

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLang } from '@/app/providers';
import Logo from './Logo';

export const COMPANY = 'ASM Media Group LLC';
export const SITE = 'letshoot.ai';
export const CONTACT_EMAIL = 'soporte@letshoot.ai';
export const LEGAL_UPDATED = '2026-08-02';

export function useLegalLang() {
  const { lang } = useLang();
  return lang === 'es' ? 'es' : 'en';
}

export default function LegalPage({ title, updated = LEGAL_UPDATED, children }) {
  const l = useLegalLang();
  return (
    <main className="min-h-[100svh] bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="LetShoot"><Logo size="sm" /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-paper-mute transition-colors hover:text-brand">
            <ArrowLeft size={15} /> {l === 'es' ? 'Volver al inicio' : 'Back to home'}
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-xs text-paper-dim">
          {l === 'es' ? 'Última actualización' : 'Last updated'}: {updated} · {COMPANY}
        </p>
        <div className="prose-legal mt-8 space-y-7">{children}</div>
      </article>
    </main>
  );
}

export function Section({ h, children }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold text-paper">{h}</h2>
      <div className="space-y-2.5 text-[15px] leading-relaxed text-paper-mute">{children}</div>
    </section>
  );
}

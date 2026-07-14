'use client';

import Link from 'next/link';
import { FileText, ShieldCheck, ArrowUpRight } from 'lucide-react';
import Logo from '@/components/Logo';

const CONTRACTS = [
  {
    href: '/contract/creator',
    icon: ShieldCheck,
    title: 'Contrato de usuario (creadora)',
    desc: 'Autorización de la creadora para recrear su clon IA y producir su contenido. Incluye extensión para autorizar a su agencia como representante.',
  },
  {
    href: '/contract/employees',
    icon: FileText,
    title: 'Contrato de empleado (NDA)',
    desc: 'Acuerdo de confidencialidad para empleados y colaboradores. Versión Colombia / Estados Unidos, con notario y apostilla.',
  },
];

export default function ContractsPage() {
  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo size="sm" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-paper-dim">Contratos</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold">Contratos</h1>
        <p className="mt-2 text-paper-mute">Ábrelos, complétalos, imprímelos o guárdalos como PDF y fírmalos.</p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          {CONTRACTS.map((c) => (
            <Link key={c.href} href={c.href}
              className="group flex flex-col rounded-2xl border border-line bg-gradient-to-b from-card to-ink-2/50 p-6 transition-colors hover:border-brand/40">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/12 text-brand ring-1 ring-brand/25">
                <c.icon size={22} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-paper">{c.title}</h2>
                <ArrowUpRight size={16} className="text-paper-dim opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <code className="mt-1 font-mono text-xs text-brand">{c.href}</code>
              <p className="mt-2 text-[13.5px] leading-relaxed text-paper-mute">{c.desc}</p>
            </Link>
          ))}
        </div>

        <p className="mt-8 rounded-xl border border-line bg-card p-4 text-[12px] leading-relaxed text-paper-dim">
          Documentos modelo con fines informativos. No constituyen asesoría legal — conviene que un abogado los revise y adapte antes de usarlos.
        </p>
      </main>
    </div>
  );
}

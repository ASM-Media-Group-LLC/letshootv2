'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Logo from '@/components/Logo';

const GROUPS = [
  {
    title: 'Sitio público',
    links: [
      { path: '/', label: 'Home', note: 'Página de ventas', status: 'ok' },
      { path: '/#por-que', label: 'El problema real', note: 'Por qué lo necesitas', status: 'ok' },
      { path: '/#concepts', label: 'Conceptos', note: 'Ideas de contenido', status: 'ok' },
      { path: '/#work', label: 'Trabajo / muestras', note: 'Galería', status: 'ok' },
      { path: '/#delivery', label: 'Cómo funciona', note: 'Entrega paso a paso', status: 'ok' },
      { path: '/#pricing', label: 'Paquetes', note: 'Precios y planes', status: 'ok' },
      { path: '/#results', label: 'Resultados', note: 'Prueba social', status: 'ok' },
      { path: '/#policy', label: 'Política de revisiones', note: 'Para quién es', status: 'ok' },
    ],
  },
  {
    title: 'Portal — acceso',
    links: [
      { path: '/login', label: 'Entrar', note: 'Correo + contraseña', status: 'ok' },
    ],
  },
  {
    title: 'Portal — creadora',
    links: [
      { path: '/panel', label: 'Mi contenido', note: 'Ver entregas + feedback', status: 'ok' },
      { path: '/lora', label: 'Mis 80 fotos (clon/LoRA)', note: 'Subida por categorías', status: 'ok' },
    ],
  },
  {
    title: 'Portal — equipo',
    links: [
      { path: '/admin', label: 'Administración', note: 'Usuarios, roles, pedidos, calendario, LoRA', status: 'ok' },
      { path: '/request', label: 'Crear pedido (chatter)', note: 'Elige creadora y pide', status: 'soon' },
      { path: '/producer', label: 'Producción (productor)', note: 'Recibe pedidos y sube', status: 'soon' },
    ],
  },
  {
    title: 'Otros',
    links: [
      { path: '/mapa', label: 'Mapa del portal', note: 'Índice por secciones', status: 'ok' },
      { path: '/all', label: 'Todos los enlaces (esta página)', note: 'Directorio completo', status: 'ok' },
      { path: '/contracts', label: 'Contratos (índice)', note: 'Los dos contratos en un solo lugar', status: 'ok' },
      { path: '/contract/creator', label: 'Contrato de usuaria (creadora)', note: 'Autorización del clon IA + agencia', status: 'ok' },
      { path: '/contract/employees', label: 'NDA de empleados', note: 'Confidencialidad (Colombia / EE.UU.)', status: 'ok' },
    ],
  },
];

export default function AllLinksPage() {
  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo size="sm" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-paper-dim">Todos los enlaces</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-display text-3xl font-semibold">Todos los enlaces</h1>
        <p className="mt-2 text-paper-mute">Directorio completo de la plataforma. Toca cualquiera para abrirlo.</p>

        <div className="mt-9 space-y-8">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-paper-dim">{g.title}</h2>
              <div className="overflow-hidden rounded-2xl border border-line bg-card">
                {g.links.map((l, i) => {
                  const soon = l.status === 'soon';
                  const row = (
                    <div className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${i > 0 ? 'border-t border-line' : ''} ${soon ? 'opacity-60' : 'hover:bg-hair/[0.04]'}`}>
                      <code className="w-40 shrink-0 truncate font-mono text-[13px] text-brand">{l.path}</code>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-paper">{l.label}</div>
                        <div className="truncate text-xs text-paper-dim">{l.note}</div>
                      </div>
                      {soon
                        ? <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold text-paper-dim">Pronto</span>
                        : <ArrowUpRight size={16} className="shrink-0 text-paper-dim" />}
                    </div>
                  );
                  return soon
                    ? <div key={l.path}>{row}</div>
                    : <Link key={l.path} href={l.path}>{row}</Link>;
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────
// Guía de estilo LetShoot 3D — página de referencia viva (sin auth).
// Muestra el PortalHeader nuevo + todas las clases 3D con ejemplos.
// Útil para QA visual y para mantener consistencia al construir.
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import PortalHeader from '@/components/PortalHeader';
import {
  ShieldCheck, UserPlus, Building2, RefreshCw, Sparkles, Heart, ImageIcon,
  ClipboardList, BarChart3, Users,
} from 'lucide-react';

export default function EstiloPreview() {
  const [tab, setTab] = useState('registros');
  const [filtro, setFiltro] = useState('all');

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* PortalHeader con datos demo */}
      <PortalHeader
        section="Administración"
        sectionIcon={ShieldCheck}
        me={{ full_name: 'Alvaro', avatar_url: null }}
        roleLabel="Dueño · Administración"
        switchTo={{ href: '#', label: 'Trabajo' }}
        backHref="/"
      />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-brand">Guía de estilo</div>
        <h1 className="font-display text-3xl font-bold">LetShoot 3D · azul siempre</h1>
        <p className="mt-2 max-w-2xl text-sm text-paper-mute">
          Profundidad estilo juego sin salir de la familia azul: biseles, push-down al click,
          sombras en capas y glow de marca. Abre el menú de la cuenta arriba a la derecha para
          ver idioma + tema + salir en un solo lugar.
        </p>

        {/* Botones */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">Botones</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn3d inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold">
              <UserPlus size={15} /> Alta de creadora
            </button>
            <button className="btn3d inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold">
              <Sparkles size={17} /> CTA grande
            </button>
            <button className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold">
              <Building2 size={15} /> Crear agencia
            </button>
            <button className="btn3d rounded-xl px-4 py-2 text-sm font-bold" disabled>
              Deshabilitado
            </button>
            <button className="btn3d-ghost inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
          <p className="mt-3 text-xs text-paper-dim">Mantené presionado un botón para sentir el push-down 3D.</p>
        </section>

        {/* Tabs */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">Tabs</h2>
          <div className="flex gap-1 overflow-x-auto border-b border-line">
            {[
              { id: 'registros', label: 'Registros', icon: ClipboardList },
              { id: 'metricas', label: 'Métricas', icon: BarChart3 },
              { id: 'reacciones', label: 'Reacciones', icon: Heart },
              { id: 'equipo', label: 'Equipo interno', icon: Users },
            ].map((tb) => (
              <button key={tb.id} onClick={() => setTab(tb.id)}
                className={`relative -mb-px flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${tab === tb.id ? 'tab3d-active' : 'text-paper-mute hover:text-paper'}`}>
                <tb.icon size={15} /> {tb.label}
              </button>
            ))}
          </div>
        </section>

        {/* Cards KPI */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">Cards KPI (click para activar)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { key: 'all', label: 'Registradas', value: 20 },
              { key: 'rev', label: 'Por revisar', value: 1 },
              { key: 'proc', label: 'En proceso', value: 2 },
              { key: 'act', label: 'Activas', value: 12 },
            ].map((s) => {
              const active = filtro === s.key;
              return (
                <button key={s.key} onClick={() => setFiltro(s.key)}
                  className={`rounded-2xl border border-line bg-card p-4 text-left ${active ? 'card3d-active ring-1 ring-brand/60' : 'card3d'}`}>
                  <div className="flex items-start justify-between">
                    <div className="font-display text-3xl font-bold">{s.value}</div>
                    {active && <span className="mt-1 rounded-full bg-brand/20 px-2 py-0.5 text-[9px] font-bold uppercase text-brand">activo</span>}
                  </div>
                  <div className="text-xs text-paper-mute">{s.label}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Card contenido */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold">Card de contenido</h2>
          <div className="card3d max-w-md rounded-3xl border border-line bg-card p-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/12 text-brand"><ImageIcon size={19} /></span>
              <div>
                <div className="font-display text-base font-bold">Presentación editorial</div>
                <div className="text-xs text-paper-mute">12 fotos · vence en 8 días</div>
              </div>
            </div>
            <p className="text-sm text-paper-mute">Las cards levantan al hover con glow azul en el borde. Sombra en capas para profundidad real.</p>
            <button className="btn3d mt-4 w-full rounded-xl py-2.5 text-sm font-bold">Abrir</button>
          </div>
        </section>
      </main>
    </div>
  );
}

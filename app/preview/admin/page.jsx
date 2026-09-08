'use client';

// ─────────────────────────────────────────────────────────────────────────
// Preview del TAB "Presentaciones" dentro de /admin.
// Simula el header con tabs del admin real, con el tab "Presentaciones"
// activo. Contenido: lista/tabla de presentaciones + botón "+ Crear".
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Plus, Search, ExternalLink, Copy, Eye, Heart, X, MessageSquare, Filter,
  MoreHorizontal, Users, ShieldCheck, Clock, ChevronDown, Sparkles,
} from 'lucide-react';

// ── Fake tabs del admin real ──────────────────────────────────────────────
const TABS = [
  { id: 'modelos', label: 'Modelos' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'agencias', label: 'Agencias' },
  { id: 'empleados', label: 'Empleados' },
  { id: 'correos', label: 'Correos' },
  { id: 'presentaciones', label: 'Presentaciones', badge: 'NUEVO' },
];

// ── Fake data de presentaciones ───────────────────────────────────────────
const PRES = [
  {
    id: 'JP-VE26-A31F', modelo: 'Julia Parker', avatar: 'https://picsum.photos/seed/jp/80/80',
    titulo: 'Selección editorial · Verano 2026', imgCount: 12,
    estado: 'activo', creada: '2026-08-20', vence: '2026-09-03',
    thumb: 'https://picsum.photos/seed/lsjp01/300/375',
    stats: { views: 4, likes: 8, rejects: 1, comments: 3 },
  },
  {
    id: 'JP-CAF25-71B', modelo: 'Julia Parker', avatar: 'https://picsum.photos/seed/jp/80/80',
    titulo: 'Café · lifestyle diciembre', imgCount: 8,
    estado: 'vencido', creada: '2026-06-14', vence: '2026-07-14',
    thumb: 'https://picsum.photos/seed/lsjp03/300/375',
    stats: { views: 12, likes: 5, rejects: 2, comments: 6 },
  },
  {
    id: 'JP-STU-04D', modelo: 'Julia Parker', avatar: 'https://picsum.photos/seed/jp/80/80',
    titulo: 'Estudio · fondo neutro', imgCount: 15,
    estado: 'borrador', creada: '2026-08-25', vence: null,
    thumb: 'https://picsum.photos/seed/lsjp08/300/375',
    stats: { views: 0, likes: 0, rejects: 0, comments: 0 },
  },
];

const ESTADO = {
  borrador: { label: 'Borrador', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  activo: { label: 'Activo', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  vencido: { label: 'Vencido', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
};

export default function AdminPresentacionesTab() {
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos');
  const filtered = useMemo(() => PRES.filter((p) => {
    if (estado !== 'todos' && p.estado !== estado) return false;
    if (q && !(`${p.titulo} ${p.modelo} ${p.id}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [q, estado]);

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Fake admin header con tabs */}
      <FakeAdminHeader activeTab="presentaciones" />

      <main className="mx-auto max-w-[1500px] px-8 py-8">
        {/* Título + acciones */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-paper-mute">
              <Sparkles size={11} className="text-brand" /> Presentaciones
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2rem]">
              Presentaciones a clientes
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-paper-mute">
              Armá un paquete de fotos de cualquier modelo con vencimiento, link privado y feedback anónimo.
              Compartilo con el cliente y con la modelo internamente.
            </p>
          </div>
          <Link
            href="/propuestas"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow transition-transform hover:scale-[1.03]"
          >
            <Plus size={17} /> Crear presentación
          </Link>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          <KpiCard label="Activas" value={PRES.filter((p) => p.estado === 'activo').length} icon={<ShieldCheck size={14} />} tone="ok" />
          <KpiCard label="Aperturas totales" value={PRES.reduce((s, p) => s + p.stats.views, 0)} icon={<Eye size={14} />} />
          <KpiCard label="Me gustan" value={PRES.reduce((s, p) => s + p.stats.likes, 0)} icon={<Heart size={14} />} tone="ok" />
          <KpiCard label="Vencen esta semana" value={2} icon={<Clock size={14} />} tone="warn" />
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3">
          <div className="relative min-w-0 flex-1 max-w-md">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por modelo, título, código…"
              className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-10 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
            />
          </div>
          <div className="flex items-center gap-1">
            {['todos', 'activo', 'borrador', 'vencido'].map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  estado === e
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line text-paper-mute hover:border-hair hover:text-paper'
                }`}
              >
                {e === 'todos' ? 'Todas' : ESTADO[e].label}
              </button>
            ))}
          </div>
          <button className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-paper-mute hover:border-brand/40 hover:text-paper">
            <Filter size={12} /> Filtros avanzados
          </button>
        </div>

        {/* Grid de presentaciones */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-line bg-card p-16 text-center">
            <Sparkles size={28} className="mx-auto mb-3 text-paper-dim" />
            <div className="font-display text-lg font-bold">Ninguna presentación con esos filtros</div>
            <div className="mt-1 text-sm text-paper-mute">Probá con otro estado o borrá el buscador.</div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => <PresCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function FakeAdminHeader({ activeTab }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-8 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 22 22" className="text-brand">
            <circle cx="11" cy="11" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="11" cy="11" r="3.2" fill="currentColor" />
          </svg>
          <span className="font-display text-base font-bold tracking-tight">
            Let<span className="text-brand">Shoot</span>
          </span>
          <span className="ml-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
            Admin
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute hover:border-brand/40 hover:text-paper">
            <Users size={16} />
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-2 text-sm text-paper-mute hover:border-brand/40 hover:text-paper">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-brand/20 text-brand text-xs font-bold">P</div>
            Pepe
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1500px] items-center gap-1 overflow-x-auto px-6 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-card text-paper'
                : 'text-paper-mute hover:text-paper'
            }`}
          >
            {tab.label}
            {tab.badge && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-on-accent">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 bg-brand" />
            )}
          </button>
        ))}
      </div>
    </header>
  );
}

function KpiCard({ label, value, icon, tone }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-paper';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-[0.22em] text-paper-mute">
        {icon} {label}
      </div>
      <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function PresCard({ p }) {
  const st = ESTADO[p.estado];
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-line bg-card transition-all hover:border-hair">
      {/* Thumb con overlay */}
      <div className="relative h-48 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${st.cls}`}>
          ● {st.label}
        </span>
        <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur">
          {p.id}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.avatar} alt={p.modelo} className="h-10 w-10 rounded-full border-2 border-white/30 object-cover" />
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 font-display font-semibold text-white">{p.titulo}</div>
            <div className="text-[11px] text-white/70">{p.modelo} · {p.imgCount} fotos</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x divide-line">
        <MiniStat icon={<Eye size={12} />} value={p.stats.views} label="views" />
        <MiniStat icon={<Heart size={12} />} value={p.stats.likes} label="likes" tone="ok" />
        <MiniStat icon={<X size={12} />} value={p.stats.rejects} label="rej." tone="bad" />
        <MiniStat icon={<MessageSquare size={12} />} value={p.stats.comments} label="com." />
      </div>

      {/* Footer con fechas + acciones */}
      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <div className="text-[11px] text-paper-mute">
          Creada {p.creada.slice(5)}
          {p.vence && <> · Vence {p.vence.slice(5)}</>}
        </div>
        <div className="flex items-center gap-1">
          {p.estado !== 'borrador' && (
            <button title="Copiar link" className="grid h-8 w-8 place-items-center rounded-lg text-paper-mute hover:bg-hair/10 hover:text-paper">
              <Copy size={14} />
            </button>
          )}
          <Link href="/p/demo" title="Ver como receptor" className="grid h-8 w-8 place-items-center rounded-lg text-paper-mute hover:bg-hair/10 hover:text-paper">
            <ExternalLink size={14} />
          </Link>
          <button title="Más" className="grid h-8 w-8 place-items-center rounded-lg text-paper-mute hover:bg-hair/10 hover:text-paper">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, value, label, tone }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-paper';
  return (
    <div className="px-2 py-2.5 text-center">
      <div className={`flex items-center justify-center gap-1 font-mono text-sm font-bold tabular-nums ${color}`}>
        {icon}{value}
      </div>
      <div className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-paper-dim">{label}</div>
    </div>
  );
}

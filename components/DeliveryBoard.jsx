'use client';

// ─────────────────────────────────────────────────────────────────────────
// DeliveryBoard — tablero de ENTREGABLES por PRIORIDAD (urgencia). Ordena por
// qué toca hacer primero: ATRASADO (rojo, con presión) → HOY → ESTA SEMANA.
// El ritmo (Diario/2-3sem/…) va como etiqueta en cada fila, NO como sección.
// La próxima entrega se recalcula sola al entrar un asset nuevo.
//
// Props:
//   creators / lastDeliv / title
//   action(creator, nd) → botón de la fila (Subir, Pedir…)
//   emptyHint / canSetCadence / onSetCadence (selector de ritmo por fila, admin)
// ─────────────────────────────────────────────────────────────────────────

import { Clock, AlertTriangle } from 'lucide-react';
import StatusDot from '@/components/StatusDot';
import { nextDelivery, cadenceLabel, CADENCIAS } from '@/lib/cadence';

const BUCKETS = [
  { id: 'atrasado', label: 'Atrasado', tone: 'bad' },
  { id: 'hoy', label: 'Hoy', tone: 'warn' },
  { id: 'semana', label: 'Esta semana', tone: 'ok' },
];
const DOT = { bad: 'bg-rose-500', warn: 'bg-amber-400', ok: 'bg-emerald-400' };

export default function DeliveryBoard({ creators = [], lastDeliv = {}, title = 'Entregables', action, emptyHint, canSetCadence = false, onSetCadence }) {
  const rows = creators
    .filter((c) => c.delivery_cadence)
    .map((c) => ({ c, nd: nextDelivery(c.delivery_cadence, lastDeliv[c.id]) }))
    .filter((x) => x.nd)
    .sort((a, b) => a.nd.dueDay.getTime() - b.nd.dueDay.getTime());

  const groups = { atrasado: [], hoy: [], semana: [], lejos: [] };
  rows.forEach((x) => { (groups[x.nd.bucket] || groups.lejos).push(x); });
  const behind = groups.atrasado.length;
  const soon = groups.hoy.length + groups.semana.length;

  if (rows.length === 0) {
    return emptyHint
      ? <div className="rounded-2xl border border-dashed border-line bg-card/40 px-4 py-4 text-sm text-paper-mute">{emptyHint}</div>
      : null;
  }

  const Row = ({ c, nd }) => {
    const sub = nd.first ? 'aún sin entregas'
      : nd.bucket === 'atrasado' ? 'toca ya'
      : nd.bucket === 'hoy' ? 'hoy'
      : nd.dueAt.toLocaleDateString('es-US', { day: 'numeric', month: 'short' });
    return (
      <div className={`flex flex-col gap-2.5 rounded-xl border px-3.5 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 ${
        nd.bucket === 'atrasado' ? 'border-rose-500/40 bg-rose-500/[0.07]'
        : nd.bucket === 'hoy' ? 'border-amber-500/25 bg-amber-500/[0.04]'
        : 'border-line bg-ink-2/50'}`}>
        <span className="min-w-0 sm:flex-1">
          <span className="block truncate font-medium text-paper">{c.stage_name || c.full_name || c.email}</span>
          <span className="block truncate text-[11px] text-paper-dim">
            {c.handle ? `@${c.handle}` : c.email}{!canSetCadence && cadenceLabel(c.delivery_cadence) ? ` · ${cadenceLabel(c.delivery_cadence)}` : ''}
          </span>
        </span>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <span className="flex flex-col items-start sm:items-end">
            <StatusDot tone={nd.tone}>{nd.label}</StatusDot>
            <span className="mt-0.5 text-[10.5px] text-paper-dim">{sub}</span>
          </span>
          {canSetCadence && onSetCadence && (
            <select
              value={c.delivery_cadence || ''}
              onChange={(e) => onSetCadence(c.id, e.target.value || null)}
              onClick={(e) => e.stopPropagation()}
              title="Cambiar el ritmo de entrega"
              className="shrink-0 rounded-lg border border-line bg-ink-2 px-2 py-1 text-[11px] font-semibold text-paper-mute outline-none focus:border-brand/60">
              {CADENCIAS.map((cad) => <option key={cad.id} value={cad.id} className="bg-ink">{cad.short}</option>)}
              <option value="" className="bg-ink">— quitar</option>
            </select>
          )}
          {action ? action(c, nd) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-paper">
          <Clock size={15} className="text-brand" /> {title}
        </h3>
        <span className="text-[12px] font-semibold text-paper-dim">
          {behind > 0
            ? <><span className="text-rose-300">{behind} atrasada{behind === 1 ? '' : 's'}</span>{soon > 0 && <span className="font-normal"> · {soon} por entregar</span>}</>
            : soon > 0
              ? <span className="text-amber-300/90">{soon} por entregar</span>
              : <span className="text-emerald-300/80">Todas al día</span>}
        </span>
      </div>

      <div className="space-y-4">
        {BUCKETS.map((b) => {
          const items = groups[b.id];
          if (!items || items.length === 0) return null;
          const pressure = b.id === 'atrasado';
          return (
            <div key={b.id}>
              {pressure ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5">
                  <AlertTriangle size={14} className="shrink-0 text-rose-300" />
                  <span className="text-[12.5px] font-bold text-rose-200">Atrasado · {items.length}</span>
                  <span className="ml-auto text-[11px] font-semibold text-rose-300/90">toca ponerse al día</span>
                </div>
              ) : (
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT[b.tone]}`} />
                  <span className="text-[12px] font-semibold text-paper">{b.label}</span>
                  <span className="text-[11px] text-paper-dim">{items.length}</span>
                </div>
              )}
              <div className="space-y-2">{items.map((x) => <Row key={x.c.id} c={x.c} nd={x.nd} />)}</div>
            </div>
          );
        })}
        {groups.lejos.length > 0 && (
          <p className="pt-1 text-[11px] text-paper-dim">+ {groups.lejos.length} al día · próxima entrega más adelante</p>
        )}
      </div>
    </div>
  );
}

'use client';

// Manual Sales — the company's hand-kept sales ledger (until a payment
// processor is wired). Lives on its own page (/sales); the team dashboard
// only links here. ALL money math happens in integer cents (lib/money.js)
// so totals are accounting-exact. No demo data ever ships in this table.

import { useCallback, useEffect, useState } from 'react';
import {
  DollarSign, ShoppingBag, Clock, Search, Plus, X, Loader2, Trash2,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import { centsOf, sumCents, moneyCents } from '@/lib/money';
import { PACKS } from '@/lib/packs';

const nf = (n) => Number(n || 0).toLocaleString('en-US');
const ymLabelEs = (ym) => {
  if (!ym) return '—';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('es-US', { month: 'long', year: 'numeric' });
};
const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const daysUntil = (d) => (d ? Math.round((new Date(d + 'T00:00:00') - new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')) / 86400000) : null);

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand"><Icon size={17} /></span>
      <div className="mt-3 font-display text-2xl font-semibold leading-none text-paper">{value}</div>
      <div className="mt-1.5 text-sm font-medium text-paper">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-paper-dim">{sub}</div>}
    </div>
  );
}

export default function ManualSalesLedger({ creators = [], me, flash, onChange }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [fMonth, setFMonth] = useState('all');
  const todayISO = new Date().toISOString().slice(0, 10);
  const thisMonth = todayISO.slice(0, 7);
  // The sale date IS the payment date (money in). The month it covers is derived
  // from that date — no redundant fields.
  const blank = { model_name: '', instagram: '', package_key: '', amount: '', sold_on: todayISO, rebill_on: '', images: '', videos: '', concept: '' };
  const [form, setForm] = useState(blank);

  // Picking a package prefills its price + how many images/videos it closes with.
  function onPackage(key) {
    const p = PACKS.find((x) => x.key === key);
    if (!p) { setForm((f) => ({ ...f, package_key: '' })); return; }
    setForm((f) => ({
      ...f, package_key: key,
      amount: String(p.m),
      images: String(p.photos),
      videos: String(p.videos),
      concept: f.concept || `${p.name} · ${p.photos} fotos · ${p.videos} videos`,
    }));
  }

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('manual_sales')
      .select('*').order('sold_on', { ascending: false }).order('created_at', { ascending: false });
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Typing a name that matches a model in the system auto-fills her IG + link.
  function onModelName(v) {
    const match = creators.find((c) => (c.full_name || '').toLowerCase() === v.trim().toLowerCase());
    setForm((f) => ({ ...f, model_name: v, ...(match ? { instagram: match.handle ? `@${match.handle}` : f.instagram, creator_id: match.id } : {}) }));
  }

  async function save(e) {
    e.preventDefault();
    setErr('');
    const amountCents = centsOf(form.amount);
    if (!form.model_name.trim()) { setErr('Falta el nombre de la modelo.'); return; }
    if (!form.amount || amountCents <= 0) { setErr('Pon un monto válido (mayor que cero).'); return; }
    setSaving(true);
    const soldOn = form.sold_on || todayISO;
    const pack = PACKS.find((p) => p.key === form.package_key);
    const images = Math.max(0, Math.round(Number(form.images) || 0));
    const videos = Math.max(0, Math.round(Number(form.videos) || 0));
    const { error } = await getSupabase().from('manual_sales').insert({
      creator_id: form.creator_id || null,
      model_name: form.model_name.trim(),
      instagram: form.instagram.trim() || null,
      sold_on: soldOn,
      paid_on: soldOn,                       // sale day = payment day
      amount: amountCents / 100,             // exact 2-decimal value into numeric(12,2)
      period_month: soldOn.slice(0, 7),      // derived from the sale date
      images,
      videos,
      pieces: images + videos,
      package_key: pack?.key || null,
      package_name: pack?.name || null,
      concept: form.concept.trim() || null,
      rebill_on: form.rebill_on || null,
      created_by: me.id,
    });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setForm(blank); setOpen(false);
    flash?.('Venta registrada');
    await load();
    onChange?.();
  }

  async function remove(r) {
    if (!window.confirm(`¿Borrar esta venta?\n\n${r.model_name} · ${moneyCents(centsOf(r.amount))} · ${fmtDate(r.sold_on)}\n\nEsto la quita del libro y reajusta los totales. No se puede deshacer.`)) return;
    const { error } = await getSupabase().from('manual_sales').delete().eq('id', r.id);
    if (error) { flash?.('No se pudo borrar: ' + error.message); return; }
    flash?.('Venta borrada');
    await load();
    onChange?.();
  }

  if (rows === null) return <p className="mt-6 text-sm text-paper-dim">Cargando…</p>;

  // Filters
  const t = q.trim().toLowerCase();
  const view = rows.filter((r) => {
    if (fMonth !== 'all' && r.period_month !== fMonth) return false;
    if (t && !(`${r.model_name} ${r.instagram || ''} ${r.concept || ''}`.toLowerCase().includes(t))) return false;
    return true;
  });

  // Exact accounting — integer cents everywhere.
  const totalC = sumCents(view, (r) => r.amount);
  const imgs = view.reduce((s, r) => s + (Number(r.images) || 0), 0);
  const vids = view.reduce((s, r) => s + (Number(r.videos) || 0), 0);
  const monthC = sumCents(rows.filter((r) => r.period_month === thisMonth), (r) => r.amount);
  const upcoming = rows.filter((r) => r.rebill_on && daysUntil(r.rebill_on) !== null && daysUntil(r.rebill_on) <= 14 && daysUntil(r.rebill_on) >= -30)
    .sort((a, b) => a.rebill_on.localeCompare(b.rebill_on));
  const months = [...new Set(rows.map((r) => r.period_month).filter(Boolean))].sort().reverse();

  // Group by the month each sale covers.
  const groups = {};
  view.forEach((r) => { const k = r.period_month || 'sin-mes'; (groups[k] = groups[k] || []).push(r); });
  const groupKeys = Object.keys(groups).sort().reverse();

  return (
    <div className="mt-6 space-y-6">
      {/* Resumen */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Resumen del libro</p>
          <button onClick={() => { setForm(blank); setErr(''); setOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03]">
            <Plus size={15} /> New entry
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={DollarSign} label="Vendido" value={moneyCents(totalC)} sub={`${view.length} ventas`} />
          <Stat icon={DollarSign} label="Este mes" value={moneyCents(monthC)} sub={ymLabelEs(thisMonth)} />
          <Stat icon={ShoppingBag} label="Contenido" value={`${nf(imgs)} + ${nf(vids)}`} sub="fotos + videos vendidos" />
          <Stat icon={Clock} label="Por volver a cobrar" value={nf(upcoming.length)} sub="en 14 días o vencidos" />
        </div>
      </section>

      {/* Por volver a cobrar */}
      {upcoming.length > 0 && (
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">Por volver a cobrar</p>
          <div className="space-y-2">
            {upcoming.map((r) => {
              const d = daysUntil(r.rebill_on);
              const late = d < 0;
              return (
                <div key={r.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${late ? 'border-rose-500/30 bg-rose-500/[0.05]' : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-paper">{r.model_name}</span>
                    {r.instagram && <span className="ml-2 text-[11px] text-paper-dim">{r.instagram}</span>}
                    {r.concept && <span className="ml-2 text-[11px] text-paper-dim">· {r.concept}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-paper">{moneyCents(centsOf(r.amount))}</span>
                    <span className={late ? 'text-rose-300' : 'text-amber-300'}>{late ? `vencido hace ${Math.abs(d)}d` : d === 0 ? 'hoy' : `en ${d}d`} · {fmtDate(r.rebill_on)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Buscador + libro por mes */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por modelo, IG o concepto…"
              className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          </div>
          <select value={fMonth} onChange={(e) => setFMonth(e.target.value)}
            className="rounded-full border border-line bg-card px-3.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
            <option value="all">Todos los meses</option>
            {months.map((m) => <option key={m} value={m}>{ymLabelEs(m)}</option>)}
          </select>
        </div>

        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line bg-card/50 p-10 text-center">
            <DollarSign size={24} className="mx-auto mb-2 text-paper-dim" />
            <p className="text-sm text-paper-mute">El libro está en cero. Toca <span className="font-semibold text-paper">New entry</span> para registrar la primera venta real.</p>
          </div>
        )}
        {rows.length > 0 && view.length === 0 && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">Ninguna venta coincide con tu búsqueda.</p>}

        {groupKeys.map((k) => {
          const gRows = groups[k];
          const gTotalC = sumCents(gRows, (r) => r.amount);
          const gImgs = gRows.reduce((s, r) => s + (Number(r.images) || 0), 0);
          const gVids = gRows.reduce((s, r) => s + (Number(r.videos) || 0), 0);
          return (
            <div key={k} className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold capitalize text-paper">{k === 'sin-mes' ? 'Sin mes asignado' : ymLabelEs(k)}</span>
                <span className="text-xs text-paper-dim">{gRows.length} ventas · {nf(gImgs)} fotos · {nf(gVids)} videos · <span className="font-semibold text-brand">{moneyCents(gTotalC)}</span></span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                {gRows.map((r, i) => (
                  <div key={r.id} className={`flex flex-wrap items-center gap-3 bg-card p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-paper">{r.model_name}</span>
                        {r.instagram && <span className="truncate text-[11px] text-paper-dim">{r.instagram}</span>}
                        {r.package_name && <span className="shrink-0 rounded-full bg-brand/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brand">{r.package_name}</span>}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-paper-dim">
                        {(Number(r.images) || 0)} fotos · {(Number(r.videos) || 0)} videos · {fmtDate(r.sold_on)}
                        {r.rebill_on && <> · recobrar {fmtDate(r.rebill_on)}</>}
                        {r.concept ? ` · ${r.concept}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 font-display text-base font-semibold text-paper">{moneyCents(centsOf(r.amount))}</div>
                    <button onClick={() => remove(r)} title="Borrar venta"
                      className="shrink-0 grid h-8 w-8 place-items-center rounded-lg border border-line text-paper-dim transition-colors hover:border-rose-500/50 hover:text-rose-300">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* New entry — modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-5 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save}
            className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-card p-6 shadow-glow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-paper">Nueva venta manual</h3>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:text-paper"><X size={16} /></button>
            </div>
            <p className="mb-4 text-xs text-paper-dim">Regístrala a mano. Todo se suma exacto y se agrupa por el mes que cubre.</p>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Modelo</span>
                <input list="ms-models" value={form.model_name} onChange={(e) => onModelName(e.target.value)} placeholder="Ej. Valentina"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <datalist id="ms-models">{creators.map((c) => <option key={c.id} value={c.full_name || ''} />)}</datalist>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Instagram</span>
                <input value={form.instagram} onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))} placeholder="@usuaria"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>

              {/* Paquete → preselecciona precio, fotos y videos */}
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Paquete vendido</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {PACKS.map((p) => (
                    <button type="button" key={p.key} onClick={() => onPackage(p.key)}
                      className={`flex-1 min-w-[140px] rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        form.package_key === p.key ? 'border-brand/60 bg-brand/10' : 'border-line bg-ink-2 hover:border-brand/40'}`}>
                      <span className={`block text-sm font-semibold ${form.package_key === p.key ? 'text-brand' : 'text-paper'}`}>{p.name} · ${p.m}</span>
                      <span className="block text-[11px] text-paper-dim">{p.photos} fotos · {p.videos} videos</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setForm((f) => ({ ...f, package_key: '' }))}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                      form.package_key === '' ? 'border-brand/60 bg-brand/10 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:text-paper'}`}>
                    Personalizado
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Monto vendido (USD)</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Fecha <span className="normal-case text-paper-dim/80">— día que se vendió y pagó</span></span>
                <input type="date" value={form.sold_on} onChange={(e) => setForm((f) => ({ ...f, sold_on: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Fotos</span>
                <input type="number" min="0" step="1" value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} placeholder="0"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Videos</span>
                <input type="number" min="0" step="1" value={form.videos} onChange={(e) => setForm((f) => ({ ...f, videos: e.target.value }))} placeholder="0"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Volver a cobrar el <span className="normal-case text-paper-dim/80">— próximo cobro</span></span>
                <input type="date" value={form.rebill_on} onChange={(e) => setForm((f) => ({ ...f, rebill_on: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-paper-dim">Concepto <span className="normal-case text-paper-dim/80">— opcional</span></span>
                <input value={form.concept} onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))} placeholder="Ej. Renovación · pack PPV de bienvenida"
                  className="mt-1 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </label>
            </div>

            {err && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
            <button type="submit" disabled={saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Registrar venta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

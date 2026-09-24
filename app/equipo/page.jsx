'use client';

// /equipo — "Equipo y roles" (solo admin). El dueño ve CADA persona del equipo,
// le pone su ROL (qué PUEDE hacer) y le asigna sus MODELOS (sobre QUIÉN trabaja).
// Modelo: rol + modelos asignadas (tabla staff_assignments, mig 0111).
// Los candados por rol/página se aplican en Fase 2; acá está el control.
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { ArrowLeft, Users, Search, X, Plus, Check, ShieldCheck, Loader2 } from 'lucide-react';

// Roles de STAFF que se pueden asignar acá (creator/agency se manejan aparte).
// Valor real en la DB → etiqueta que ve el dueño. supervisor se muestra como "PR", producer como "Editor / QA".
const ROLES = [
  { v: 'admin', label: 'Admin', desc: 'Todo el sistema', models: false, tone: 'text-brand border-brand/40' },
  { v: 'supervisor', label: 'PR', desc: 'Maneja sus modelos asignadas', models: true, tone: 'text-emerald-300 border-emerald-500/40' },
  { v: 'producer', label: 'Editor / QA', desc: 'Solo /kitchen de sus modelos', models: true, tone: 'text-sky-300 border-sky-500/40' },
  { v: 'chatter', label: 'Chatter', desc: 'Baúl, ficha, precios y registra ventas', models: true, tone: 'text-fuchsia-300 border-fuchsia-500/40' },
  { v: 'finance', label: 'Finanzas', desc: 'Solo números (ventas, gastos, cuentas)', models: false, tone: 'text-amber-300 border-amber-500/40' },
  { v: 'agent', label: 'Agente', desc: 'Rol antiguo', models: false, tone: 'text-paper-mute border-line' },
];
const roleMeta = (v) => ROLES.find((r) => r.v === v) || null;
const STAFF_ROLES = ROLES.map((r) => r.v);

export default function EquipoPage() {
  const [access, setAccess] = useState('loading');
  const [meId, setMeId] = useState(null);
  const [people, setPeople] = useState([]);      // todos los perfiles
  const [assign, setAssign] = useState([]);       // staff_assignments
  const [msg, setMsg] = useState(null);
  const [openId, setOpenId] = useState(null);     // fila con el selector de modelos abierto
  const [q, setQ] = useState('');                 // buscador de modelos dentro del selector
  const sb = getSupabase();

  useEffect(() => { (async () => {
    try { const up = await getUserProfile(); const p = up?.profile; setMeId(p?.id || null); setAccess(p?.role === 'admin' ? 'ok' : 'denied'); }
    catch { setAccess('denied'); }
  })(); }, []);

  const load = useCallback(async () => {
    const { data: pr } = await sb.from('profiles').select('id, full_name, email, role, avatar_url, staff_status').order('full_name', { ascending: true });
    setPeople(Array.isArray(pr) ? pr : []);
    const { data: as } = await sb.from('staff_assignments').select('staff_id, creator_id');
    setAssign(Array.isArray(as) ? as : []);
  }, [sb]);
  useEffect(() => { if (access === 'ok') load(); }, [access, load]);

  const staff = useMemo(() => people.filter((p) => STAFF_ROLES.includes(p.role)), [people]);
  const models = useMemo(() => people.filter((p) => p.role === 'creator' && p.full_name), [people]);
  const assignedTo = useCallback((staffId) => assign.filter((a) => a.staff_id === staffId).map((a) => a.creator_id), [assign]);

  const setRole = async (id, role) => {
    setPeople((v) => v.map((p) => (p.id === id ? { ...p, role } : p)));
    const { error } = await sb.from('profiles').update({ role }).eq('id', id);
    if (error) { setMsg({ kind: 'err', text: `No se pudo cambiar el rol: ${error.message}` }); load(); return; }
    setMsg({ kind: 'ok', text: `Rol actualizado a ${roleMeta(role)?.label || role}.` });
  };
  const toggleModel = async (staffId, creatorId) => {
    const has = assignedTo(staffId).includes(creatorId);
    if (has) {
      setAssign((v) => v.filter((a) => !(a.staff_id === staffId && a.creator_id === creatorId)));
      await sb.from('staff_assignments').delete().eq('staff_id', staffId).eq('creator_id', creatorId);
    } else {
      setAssign((v) => [...v, { staff_id: staffId, creator_id: creatorId }]);
      const { error } = await sb.from('staff_assignments').insert({ staff_id: staffId, creator_id: creatorId, created_by: meId });
      if (error) { setMsg({ kind: 'err', text: `No se pudo asignar: ${error.message}` }); load(); }
    }
  };

  const initials = (p) => (p.full_name || p.email || '?').slice(0, 2).toUpperCase();
  const modelName = (id) => models.find((m) => m.id === id)?.full_name || '—';

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') return (
    <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
      <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
        <h1 className="font-display text-xl font-bold">Solo admin</h1>
        <Link href="/admin" className="btn3d-ghost mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"><ArrowLeft size={15} /> Volver</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 lg:px-6">
          <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute hover:text-paper" title="Volver al admin"><ArrowLeft size={17} /></Link>
          <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute"><Users size={13} className="text-brand" /> Equipo y roles</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
        {msg && (
          <div className={`mb-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${msg.kind === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
            <span className="min-w-0 flex-1 break-words">{msg.text}</span>
            <button type="button" onClick={() => setMsg(null)} className="shrink-0 opacity-70 hover:opacity-100"><X size={14} /></button>
          </div>
        )}

        <div className="mb-5">
          <h1 className="font-display text-2xl font-bold tracking-tight">Equipo y roles</h1>
          <p className="mt-1 text-sm text-paper-mute">Cada persona tiene un <b className="text-paper">rol</b> (qué puede hacer) y sus <b className="text-paper">modelos asignadas</b> (sobre quién). {staff.length} en el equipo · {models.length} modelos.</p>
        </div>

        {/* Leyenda de roles */}
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLES.filter((r) => r.v !== 'agent').map((r) => (
            <div key={r.v} className={`rounded-xl border bg-card px-3 py-2 ${r.tone}`}>
              <div className="text-sm font-bold">{r.label}</div>
              <div className="text-[11px] text-paper-dim">{r.desc}</div>
            </div>
          ))}
        </div>

        {/* Lista del equipo */}
        <div className="space-y-2.5">
          {staff.map((p) => {
            const meta = roleMeta(p.role);
            const mine = assignedTo(p.id);
            const isMe = p.id === meId;
            return (
              <div key={p.id} className="rounded-2xl border border-line bg-card p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-xs font-bold text-brand">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(p)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate text-sm font-bold text-paper">{p.full_name || p.email}{isMe && <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">vos</span>}</div>
                    <div className="truncate text-[11px] text-paper-dim">{p.email}</div>
                  </div>
                  {/* Rol */}
                  <select value={p.role} disabled={isMe} onChange={(e) => setRole(p.id, e.target.value)}
                    className={`shrink-0 rounded-full border bg-ink-2 px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${meta?.tone || 'border-line text-paper'}`} title={isMe ? 'No podés cambiar tu propio rol' : 'Cambiar rol'}>
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
                  </select>
                </div>

                {/* Modelos asignadas (solo roles que trabajan por modelo) */}
                {meta?.models && (
                  <div className="mt-2.5 rounded-xl border border-line/60 bg-ink-2/40 p-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper-mute"><ShieldCheck size={12} className="text-brand" /> Modelos asignadas · {mine.length}</span>
                      <button type="button" onClick={() => { setOpenId(openId === p.id ? null : p.id); setQ(''); }} className="inline-flex items-center gap-1 rounded-full border border-brand/40 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/10">
                        <Plus size={12} /> {openId === p.id ? 'Cerrar' : 'Asignar'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {mine.length === 0 && <span className="text-[11px] text-paper-dim">Sin modelos — no ve ninguna todavía.</span>}
                      {mine.map((cid) => (
                        <span key={cid} className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                          {modelName(cid)}
                          <button type="button" onClick={() => toggleModel(p.id, cid)} className="opacity-70 hover:opacity-100"><X size={11} /></button>
                        </span>
                      ))}
                    </div>
                    {openId === p.id && (
                      <div className="mt-2 rounded-xl border border-line bg-card p-2">
                        <div className="relative mb-2">
                          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo…" className="w-full rounded-full border border-line bg-ink-2 py-1.5 pl-9 pr-3 text-xs text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                        </div>
                        <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
                          {models.filter((m) => m.full_name.toLowerCase().includes(q.trim().toLowerCase())).map((m) => {
                            const on = mine.includes(m.id);
                            return (
                              <button key={m.id} type="button" onClick={() => toggleModel(p.id, m.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${on ? 'border-brand bg-brand/15 text-brand' : 'border-line text-paper-mute hover:text-paper'}`}>
                                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? 'border-brand bg-brand text-on-accent' : 'border-line'}`}>{on && <Check size={10} />}</span>
                                <span className="truncate">{m.full_name}</span>
                              </button>
                            );
                          })}
                          {models.length === 0 && <span className="col-span-full p-2 text-[11px] text-paper-dim">No hay modelos activas.</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {staff.length === 0 && <p className="rounded-xl border border-dashed border-line bg-card/40 p-8 text-center text-sm text-paper-dim">No hay personas de equipo.</p>}
        </div>

        <p className="mt-6 rounded-xl border border-line bg-card/40 p-3 text-[11px] text-paper-dim">
          <b className="text-paper-mute">Nota:</b> acá definís rol + modelos. Los candados por rol en cada página (qué ve el chatter, el editor solo /kitchen, finanzas solo números) se activan en la Fase 2 — te aviso cuando arranco esa.
        </p>
      </main>
    </div>
  );
}

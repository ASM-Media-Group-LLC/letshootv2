'use client';

// /equipo — "Equipo y roles" (solo admin).
// (1) "Que ve cada rol": matriz simple con lo que PUEDE / NO puede cada rol.
// (2) Equipo agrupado por rol; "Mover a" cambia el rol.
// (3) "Sacar del equipo" archiva (active=false, reversible, mig 0113) sin borrar la fila.
// Modelo: rol + modelos asignadas (staff_assignments, mig 0111). Candados reales = Fase 2.
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { ArrowLeft, Users, Search, X, Plus, Check, ShieldCheck, UserMinus, RotateCcw } from 'lucide-react';

// Roles de STAFF. Valor DB -> etiqueta UI. supervisor="PR", producer="Editor", chatter="Manager".
// caps = lo recomendable que ve cada uno (para la matriz de arriba).
const ROLES = [
  { v: 'admin', label: 'Admin', desc: 'Ve y hace TODO. Sin restricción.', models: false,
    tone: 'text-brand', ring: 'border-brand/40', dot: 'bg-brand', soft: 'bg-brand/[0.06]',
    caps: [{ t: 'Todo el sistema, sin límites', ok: true }] },
  { v: 'supervisor', label: 'PR', desc: 'Maneja SUS modelos. (Hoy ve todas; luego solo las asignadas.)', models: true,
    tone: 'text-emerald-300', ring: 'border-emerald-500/40', dot: 'bg-emerald-400', soft: 'bg-emerald-500/[0.06]',
    caps: [
      { t: 'Sus modelos: fichas, pedidos y entregas', ok: true },
      { t: 'Baúl de fotos aprobadas', ok: true },
      { t: 'Hacer fotos (/kitchen)', ok: true },
      { t: 'Números / ventas', ok: false },
      { t: 'Gestionar equipo', ok: false },
    ] },
  { v: 'producer', label: 'Editor', desc: 'Hace las fotos de TODAS las modelos y las entrega.', models: false,
    tone: 'text-sky-300', ring: 'border-sky-500/40', dot: 'bg-sky-400', soft: 'bg-sky-500/[0.06]',
    caps: [
      { t: 'Hacer fotos en /kitchen — todas las modelos', ok: true },
      { t: 'Subir y entregar el contenido', ok: true },
      { t: 'Precios, ventas y números', ok: false },
      { t: 'Verificar IDs / gestionar equipo', ok: false },
    ] },
  { v: 'chatter', label: 'Manager', desc: 'Manager de la modelo: pedidos, baúl, ficha y precios. Por modelo.', models: true,
    tone: 'text-fuchsia-300', ring: 'border-fuchsia-500/40', dot: 'bg-fuchsia-400', soft: 'bg-fuchsia-500/[0.06]',
    caps: [
      { t: 'Sus modelos asignadas', ok: true },
      { t: 'Pedidos (requests)', ok: true },
      { t: 'Baúl de fotos aprobadas', ok: true },
      { t: 'Ficha + precios', ok: true },
      { t: 'Registrar ventas', ok: false },
      { t: 'Números de la empresa', ok: false },
    ] },
  { v: 'finance', label: 'Finanzas', desc: 'Solo los números: ventas, gastos y cuentas.', models: false,
    tone: 'text-amber-300', ring: 'border-amber-500/40', dot: 'bg-amber-400', soft: 'bg-amber-500/[0.06]',
    caps: [
      { t: 'Ver números: ventas, gastos, cuentas', ok: true },
      { t: 'Modelos, fotos y pedidos', ok: false },
      { t: 'Cobros / suscripciones', ok: false },
    ] },
];
const AGENT = { v: 'agent', label: 'Agente (antiguo)', desc: 'Rol viejo — mové estas personas a un rol nuevo.', models: false, tone: 'text-paper-mute', ring: 'border-line', dot: 'bg-paper-mute', soft: 'bg-ink-2/30', caps: [] };
const ALL_ROLES = [...ROLES, AGENT];
const roleMeta = (v) => ALL_ROLES.find((r) => r.v === v) || null;
const STAFF_ROLES = ALL_ROLES.map((r) => r.v);

export default function EquipoPage() {
  const [access, setAccess] = useState('loading');
  const [meId, setMeId] = useState(null);
  const [people, setPeople] = useState([]);
  const [assign, setAssign] = useState([]);
  const [msg, setMsg] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const sb = getSupabase();

  useEffect(() => { (async () => {
    try { const up = await getUserProfile(); const p = up?.profile; setMeId(p?.id || null); setAccess(p?.role === 'admin' ? 'ok' : 'denied'); }
    catch { setAccess('denied'); }
  })(); }, []);

  const load = useCallback(async () => {
    const { data: pr } = await sb.from('profiles').select('id, full_name, email, role, avatar_url, staff_status, active').order('full_name', { ascending: true });
    setPeople(Array.isArray(pr) ? pr : []);
    const { data: as } = await sb.from('staff_assignments').select('staff_id, creator_id');
    setAssign(Array.isArray(as) ? as : []);
  }, [sb]);
  useEffect(() => { if (access === 'ok') load(); }, [access, load]);

  const isActive = (p) => p.active !== false;
  const staff = useMemo(() => people.filter((p) => STAFF_ROLES.includes(p.role) && isActive(p)), [people]);
  const archived = useMemo(() => people.filter((p) => STAFF_ROLES.includes(p.role) && !isActive(p)), [people]);
  const models = useMemo(() => people.filter((p) => p.role === 'creator' && p.full_name && isActive(p)), [people]);
  const assignedTo = useCallback((staffId) => assign.filter((a) => a.staff_id === staffId).map((a) => a.creator_id), [assign]);
  const countByRole = (v) => staff.filter((p) => p.role === v).length;

  const setRole = async (id, role) => {
    setPeople((v) => v.map((p) => (p.id === id ? { ...p, role } : p)));
    const { error } = await sb.from('profiles').update({ role }).eq('id', id);
    if (error) { setMsg({ kind: 'err', text: `No se pudo cambiar el rol: ${error.message}` }); load(); return; }
    setMsg({ kind: 'ok', text: `Rol actualizado a ${roleMeta(role)?.label || role}.` });
  };
  const setActive = async (id, val, name) => {
    if (!val && !confirm(`¿Sacar a ${name} del equipo? Queda archivada y la podés reactivar cuando quieras.`)) return;
    setPeople((v) => v.map((p) => (p.id === id ? { ...p, active: val } : p)));
    const { error } = await sb.from('profiles').update({ active: val }).eq('id', id);
    if (error) { setMsg({ kind: 'err', text: `No se pudo: ${error.message}` }); load(); return; }
    setMsg({ kind: 'ok', text: val ? `${name} reactivada.` : `${name} sacada del equipo (archivada).` });
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

  const PersonRow = ({ p }) => {
    const meta = roleMeta(p.role);
    const mine = assignedTo(p.id);
    const isMe = p.id === meId;
    return (
      <div className="px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand/15 text-[11px] font-bold text-brand">
            {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(p)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 truncate text-sm font-semibold text-paper">{p.full_name || p.email}{isMe && <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">vos</span>}</div>
            <div className="truncate text-[11px] text-paper-dim">{p.email}</div>
          </div>
          <label className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-paper-dim">
            <span className="mr-1.5 hidden sm:inline">Mover a</span>
            <select value={p.role} disabled={isMe} onChange={(e) => setRole(p.id, e.target.value)}
              className={`rounded-full border bg-ink-2 px-2.5 py-1.5 text-xs font-bold outline-none disabled:opacity-50 ${meta?.tone || 'text-paper'} ${meta?.ring || 'border-line'}`} title={isMe ? 'No podés cambiar tu propio rol' : 'Cambiar de rol'}>
              {ALL_ROLES.map((r) => <option key={r.v} value={r.v} className="bg-ink text-paper">{r.label}</option>)}
            </select>
          </label>
          {!isMe && (
            <button type="button" onClick={() => setActive(p.id, false, p.full_name || p.email)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1.5 text-[11px] font-semibold text-paper-dim hover:border-rose-500/50 hover:text-rose-300" title="Sacar del equipo (archivar, reversible)">
              <UserMinus size={12} /> Sacar
            </button>
          )}
        </div>

        {meta?.models && (
          <div className="mt-2.5 rounded-xl border border-line/60 bg-ink-2/40 p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper-mute"><ShieldCheck size={12} className="text-brand" /> Modelos asignadas · {mine.length}</span>
              <button type="button" onClick={() => { setOpenId(openId === p.id ? null : p.id); setQ(''); }} className="inline-flex items-center gap-1 rounded-full border border-brand/40 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/10">
                <Plus size={12} /> {openId === p.id ? 'Cerrar' : 'Asignar'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mine.length === 0 && <span className="text-[11px] text-paper-dim">Sin modelos asignadas — por ahora ve todas.</span>}
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
  };

  const groups = [...ROLES, ...(staff.some((p) => p.role === 'agent') ? [AGENT] : [])];

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
          <p className="mt-1 text-sm text-paper-mute">Arriba, <b className="text-paper">qué ve cada rol</b>. Abajo, <b className="text-paper">quién es quién</b> — cambiá su rol con “Mover a” o sacalo del equipo. {staff.length} en el equipo · {models.length} modelos.</p>
        </div>

        {/* (1) Qué ve cada rol — la matriz fácil */}
        <section className="mb-7">
          <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute"><ShieldCheck size={13} className="text-brand" /> Qué ve cada rol</div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {ROLES.map((role) => (
              <div key={role.v} className={`rounded-2xl border ${role.ring} ${role.soft} p-3.5 ${role.v === 'admin' ? 'sm:col-span-2' : ''}`}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${role.dot}`} />
                  <span className={`text-sm font-bold ${role.tone}`}>{role.label}</span>
                  <span className="text-[11px] text-paper-dim">· {countByRole(role.v)} {countByRole(role.v) === 1 ? 'persona' : 'personas'}</span>
                </div>
                <p className="mb-2 text-[12px] text-paper-mute">{role.desc}</p>
                <ul className={`gap-x-4 gap-y-1 ${role.v === 'admin' ? '' : 'sm:columns-1'} space-y-1`}>
                  {role.caps.map((c, i) => (
                    <li key={i} className={`flex items-start gap-1.5 text-[12px] ${c.ok ? 'text-paper' : 'text-paper-dim'}`}>
                      {c.ok
                        ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                        : <X size={14} className="mt-0.5 shrink-0 text-paper-dim/70" />}
                      <span>{c.t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-paper-dim">Así queda la <b className="text-paper-mute">propuesta</b>. Los candados de verdad (que cada uno solo entre a lo suyo) los activo en la <b className="text-paper-mute">Fase 2</b>.</p>
        </section>

        {/* (2) Equipo agrupado por rol */}
        <div className="space-y-3">
          {groups.map((role) => {
            const members = staff.filter((p) => p.role === role.v);
            return (
              <section key={role.v} className={`overflow-hidden rounded-2xl border ${role.ring} ${role.soft}`}>
                <div className="flex items-start gap-3 border-b border-line/50 bg-ink/30 px-4 py-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${role.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-bold ${role.tone}`}>{role.label} <span className="font-normal text-paper-dim">· {members.length}</span></div>
                    <div className="text-[12px] text-paper-mute">{role.desc}</div>
                  </div>
                </div>
                <div className="divide-y divide-line/40 bg-card">
                  {members.length === 0
                    ? <div className="px-4 py-3 text-[12px] text-paper-dim">Nadie con este rol todavía.</div>
                    : members.map((p) => <PersonRow key={p.id} p={p} />)}
                </div>
              </section>
            );
          })}
        </div>

        {/* (3) Archivados */}
        {archived.length > 0 && (
          <div className="mt-4">
            <button type="button" onClick={() => setShowArchived((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-[12px] font-semibold text-paper-mute hover:text-paper">
              <RotateCcw size={13} /> Archivados · {archived.length} {showArchived ? '(ocultar)' : '(ver)'}
            </button>
            {showArchived && (
              <div className="mt-2 divide-y divide-line/40 overflow-hidden rounded-2xl border border-line bg-card/60">
                {archived.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-2 text-[10px] font-bold text-paper-dim">{initials(p)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-paper-mute">{p.full_name || p.email}</div>
                      <div className="truncate text-[11px] text-paper-dim">{p.email} · {roleMeta(p.role)?.label || p.role}</div>
                    </div>
                    <button type="button" onClick={() => setActive(p.id, true, p.full_name || p.email)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10">
                      <RotateCcw size={12} /> Reactivar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-6 rounded-xl border border-line bg-card/40 p-3 text-[11px] text-paper-dim">
          <b className="text-paper-mute">Nota:</b> acá definís rol + modelos y sacás gente. Los candados de verdad en cada página (que el Manager solo vea sus pedidos, el Editor solo /kitchen, Finanzas solo números, PR solo sus modelos) se activan en la <b className="text-paper-mute">Fase 2</b>.
        </p>
      </main>
    </div>
  );
}

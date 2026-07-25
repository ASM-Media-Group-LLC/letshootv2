'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, Link2, ShieldCheck, Check, Plus, X, RefreshCw, IdCard, Clock, UserPlus, ClipboardList } from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

const ROLES = [
  { v: 'admin', l: 'Admin' },
  { v: 'chatter', l: 'Chatter' },
  { v: 'producer', l: 'Productor' },
  { v: 'creator', l: 'Creadora' },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.v, r.l]));

// Creator onboarding status → human label + tone
const OB = {
  registered:  { label: 'Solo registrada',       tone: 'zinc' },
  info:        { label: 'Datos listos · falta ID', tone: 'zinc' },
  id_pending:  { label: 'Por revisar',            tone: 'amber' },
  id_rejected: { label: 'ID rechazado',           tone: 'rose' },
  id_approved: { label: 'Aprobada · falta pago',  tone: 'sky' },
  paid:        { label: 'Pagó · falta LoRA',      tone: 'sky' },
  active:      { label: 'Activa',                 tone: 'brand' },
};
const TONE = {
  zinc:  'border-line bg-hair/5 text-paper-mute',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  rose:  'border-rose-500/40 bg-rose-500/10 text-rose-300',
  sky:   'border-sky-500/40 bg-sky-500/10 text-sky-300',
  brand: 'border-brand/40 bg-brand/10 text-brand',
};

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('registros');
  const [profiles, setProfiles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [kyc, setKyc] = useState([]); // pending verifications w/ signed doc urls
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');
  const [nu, setNu] = useState({ full_name: '', email: '', password: '', role: 'admin' });
  const [creating, setCreating] = useState(false);
  const [nuError, setNuError] = useState('');

  const loadKyc = useCallback(async () => {
    const supabase = getSupabase();
    const { data: pend } = await supabase.from('profiles')
      .select('id, full_name, email, legal_first_name, legal_last_name, date_of_birth, country, stage_name, created_at')
      .eq('onboarding_status', 'id_pending')
      .order('created_at');
    const list = [];
    for (const p of pend || []) {
      const { data: docs } = await supabase.from('kyc_documents').select('doc_type, storage_path').eq('user_id', p.id);
      const signed = {};
      for (const d of docs || []) {
        const { data: s } = await supabase.storage.from('kyc').createSignedUrl(d.storage_path, 600);
        if (s?.signedUrl) signed[d.doc_type] = s.signedUrl;
      }
      list.push({ ...p, docs: signed });
    }
    setKyc(list);
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    setLoading(true);
    const [{ data: profs }, { data: asg }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, onboarding_status, created_at').order('role'),
      supabase.from('chatter_assignments').select('chatter_id, creator_id'),
    ]);
    setProfiles(profs || []);
    setAssignments(asg || []);
    await loadKyc();
    setLoading(false);
  }, [loadKyc]);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role !== 'admin') { setMe(up.profile); return; } // non-admin staff: limited view
      setMe(up.profile);
      load();
    })();
  }, [router, load]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function changeRole(id, role) {
    setSavingId(id);
    const { error } = await getSupabase().from('profiles').update({ role }).eq('id', id);
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return; }
    setProfiles((p) => p.map((u) => (u.id === id ? { ...u, role } : u)));
    flash('Rol actualizado');
  }

  async function createUser(e) {
    e.preventDefault();
    setNuError('');
    if (!nu.email || !nu.password || !nu.role) { setNuError('Completa correo, contraseña y rol.'); return; }
    if (nu.password.length < 8) { setNuError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setCreating(true);
    const { data: { session } } = await getSupabase().auth.getSession();
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify(nu),
    });
    const out = await res.json().catch(() => ({}));
    setCreating(false);
    if (!res.ok) { setNuError(out.error || 'No se pudo crear el usuario.'); return; }
    setNu({ full_name: '', email: '', password: '', role: 'admin' });
    flash('Usuario creado');
    load();
  }

  async function reviewKyc(userId, approve) {
    let reason = null;
    if (!approve) {
      reason = window.prompt('Motivo del rechazo (lo verá la creadora):', '');
      if (reason === null) return; // cancelled
    }
    setSavingId(userId);
    const { error } = await getSupabase().from('profiles').update({
      onboarding_status: approve ? 'id_approved' : 'id_rejected',
      id_rejection_reason: approve ? null : reason,
      id_reviewed_by: me.id,
      id_reviewed_at: new Date().toISOString(),
    }).eq('id', userId);
    setSavingId(null);
    if (error) { flash('Error: ' + error.message); return; }
    setKyc((k) => k.filter((u) => u.id !== userId));
    flash(approve ? 'Verificación aprobada' : 'Verificación rechazada');
  }

  async function toggleAssignment(chatterId, creatorId, on) {
    const supabase = getSupabase();
    if (on) {
      const { error } = await supabase.from('chatter_assignments').insert({ chatter_id: chatterId, creator_id: creatorId });
      if (error) return flash('Error: ' + error.message);
      setAssignments((a) => [...a, { chatter_id: chatterId, creator_id: creatorId }]);
    } else {
      const { error } = await supabase.from('chatter_assignments').delete().eq('chatter_id', chatterId).eq('creator_id', creatorId);
      if (error) return flash('Error: ' + error.message);
      setAssignments((a) => a.filter((x) => !(x.chatter_id === chatterId && x.creator_id === creatorId)));
    }
    flash('Asignación actualizada');
  }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  // Non-admin staff (chatter/producer) — limited placeholder
  if (me?.role !== 'admin') {
    return (
      <div className="min-h-[100svh] bg-ink text-paper">
        <Header me={me} router={router} />
        <main className="mx-auto max-w-3xl px-5 py-16 text-center">
          <div className="rounded-2xl border border-line bg-card p-10">
            <ShieldCheck className="mx-auto mb-3 text-brand" />
            <h1 className="font-display text-xl font-semibold">Panel de {ROLE_LABEL[me?.role] || 'equipo'}</h1>
            <p className="mt-2 text-paper-mute">Tu área de trabajo (pedidos y producción) está en construcción. Muy pronto.</p>
          </div>
        </main>
      </div>
    );
  }

  const creators = profiles.filter((p) => p.role === 'creator');
  const chatters = profiles.filter((p) => p.role === 'chatter');
  const has = (c, cr) => assignments.some((a) => a.chatter_id === c && a.creator_id === cr);

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <Header me={me} router={router} />

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Administración</h1>
            <p className="mt-1 text-sm text-paper-mute">Gestiona usuarios, roles y asignaciones — todo desde aquí.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm text-paper-mute hover:text-paper">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-line">
          {[
            { id: 'registros', label: 'Registros', icon: ClipboardList },
            { id: 'verificaciones', label: 'Verificaciones', icon: IdCard, badge: kyc.length },
            { id: 'equipo', label: 'Equipo & roles', icon: Users },
            { id: 'asignaciones', label: 'Asignaciones', icon: Link2 },
          ].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`relative -mb-px flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${tab === tb.id ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}>
              <tb.icon size={15} /> {tb.label}
              {tb.badge ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-accent">{tb.badge}</span> : null}
              {tab === tb.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-paper-dim">Cargando datos…</p>
        ) : tab === 'registros' ? (
          <div className="mt-6">
            {(() => {
              const cr = profiles.filter((p) => p.role === 'creator');
              const n = (s) => cr.filter((p) => (p.onboarding_status || 'registered') === s).length;
              const stats = [
                { label: 'Registradas', value: cr.length, tone: 'zinc' },
                { label: 'Por revisar', value: n('id_pending'), tone: 'amber' },
                { label: 'En proceso', value: cr.filter((p) => ['info','id_rejected','id_approved','paid'].includes(p.onboarding_status)).length, tone: 'sky' },
                { label: 'Activas', value: n('active'), tone: 'brand' },
              ];
              return (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((s) => (
                      <div key={s.label} className={`rounded-2xl border p-4 ${TONE[s.tone]}`}>
                        <div className="font-display text-3xl font-bold">{s.value}</div>
                        <div className="text-xs opacity-80">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-line">
                    <div className="grid grid-cols-[1.3fr_1.2fr_1fr_auto] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                      <span>Creadora</span><span>Correo</span><span>Estado</span><span></span>
                    </div>
                    {cr.length === 0 && <p className="px-5 py-6 text-paper-dim">Nadie se ha registrado todavía.</p>}
                    {cr.map((u) => {
                      const st = OB[u.onboarding_status] || OB.registered;
                      return (
                        <div key={u.id} className="grid grid-cols-[1.3fr_1.2fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-sm last:border-0">
                          <span className="truncate font-medium text-paper">{u.full_name || '—'}</span>
                          <span className="truncate text-paper-mute">{u.email}</span>
                          <span><span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE[st.tone]}`}>{st.label}</span></span>
                          <span className="text-right">
                            {u.onboarding_status === 'id_pending' && (
                              <button onClick={() => setTab('verificaciones')} className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/25">Revisar →</button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        ) : tab === 'verificaciones' ? (
          <div className="mt-6 space-y-4">
            {kyc.length === 0 && (
              <div className="rounded-2xl border border-line bg-card p-10 text-center">
                <Clock className="mx-auto mb-3 text-paper-dim" />
                <p className="text-paper-mute">No hay verificaciones pendientes.</p>
              </div>
            )}
            {kyc.map((u) => (
              <div key={u.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-display font-semibold text-paper">
                      {u.legal_first_name} {u.legal_last_name}
                      {u.stage_name && <span className="ml-2 text-xs font-normal text-paper-dim">· "{u.stage_name}"</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-paper-dim">
                      {u.email} · {u.country || '—'} · Nac. {u.date_of_birth || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => reviewKyc(u.id, false)} disabled={savingId === u.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50">
                      <X size={15} /> Rechazar
                    </button>
                    <button onClick={() => reviewKyc(u.id, true)} disabled={savingId === u.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-50">
                      {savingId === u.id ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />} Aprobar
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[{ k: 'id_front', l: 'ID frente' }, { k: 'id_back', l: 'ID reverso' }, { k: 'selfie_id', l: 'Selfie con ID' }].map((d) => (
                    <div key={d.k}>
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-paper-dim">{d.l}</p>
                      {u.docs[d.k] ? (
                        <a href={u.docs[d.k]} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden rounded-xl border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u.docs[d.k]} alt={d.l} className="h-full w-full object-cover transition-transform hover:scale-105" />
                        </a>
                      ) : (
                        <div className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-line text-xs text-paper-dim">Falta</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'equipo' ? (
          <div className="mt-6 space-y-6">
            <form onSubmit={createUser} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
              <div className="mb-3 flex items-center gap-2 font-display font-semibold text-paper">
                <UserPlus size={18} className="text-brand" /> Crear usuario
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input value={nu.full_name} onChange={(e) => setNu((v) => ({ ...v, full_name: e.target.value }))} placeholder="Nombre"
                  className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <input type="email" value={nu.email} onChange={(e) => setNu((v) => ({ ...v, email: e.target.value }))} placeholder="correo@ejemplo.com"
                  className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <input type="text" value={nu.password} onChange={(e) => setNu((v) => ({ ...v, password: e.target.value }))} placeholder="Contraseña (mín. 8)"
                  className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
                <div className="flex gap-2">
                  <select value={nu.role} onChange={(e) => setNu((v) => ({ ...v, role: e.target.value }))}
                    className="flex-1 rounded-xl border border-line bg-ink-2 px-2.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                  <button type="submit" disabled={creating}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.03] disabled:opacity-60">
                    {creating ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={15} />} Crear
                  </button>
                </div>
              </div>
              {nuError && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{nuError}</p>}
              <p className="mt-3 text-xs text-paper-dim">La cuenta queda lista para entrar (correo confirmado). El equipo (admin/chatter/productor) omite el registro de creadora.</p>
            </form>

            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 border-b border-line bg-card px-5 py-3 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                <span>Usuario</span><span>Correo</span><span>Rol</span>
              </div>
            {profiles.map((u) => (
              <div key={u.id} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-3 border-b border-line px-5 py-3 text-sm last:border-0">
                <span className="truncate font-medium text-paper">{u.full_name || '—'}</span>
                <span className="truncate text-paper-mute">{u.email}</span>
                <div className="flex items-center gap-2">
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} disabled={u.id === me.id}
                    className="rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                  {savingId === u.id && <RefreshCw size={14} className="animate-spin text-brand" />}
                </div>
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-paper-mute">Marca qué chatters pueden pedir contenido para cada creadora.</p>
            {creators.length === 0 && <p className="text-paper-dim">No hay creadoras todavía.</p>}
            {creators.map((cr) => (
              <div key={cr.id} className="rounded-2xl border border-line bg-card p-5">
                <div className="mb-3 font-display font-semibold text-paper">{cr.full_name} <span className="text-xs font-normal text-paper-dim">· {cr.email}</span></div>
                <div className="flex flex-wrap gap-2">
                  {chatters.length === 0 && <span className="text-sm text-paper-dim">No hay chatters. Asigna el rol "Chatter" a alguien primero.</span>}
                  {chatters.map((c) => {
                    const on = has(c.id, cr.id);
                    return (
                      <button key={c.id} onClick={() => toggleAssignment(c.id, cr.id, !on)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-ink-2 text-paper-mute hover:text-paper'}`}>
                        {on ? <Check size={14} /> : <Plus size={14} />} {c.full_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({ me, router }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-paper-mute sm:inline">{me?.full_name}</span>
          <button onClick={async () => { await signOut(); router.replace('/login'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    </header>
  );
}

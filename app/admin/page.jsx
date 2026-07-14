'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Users, Link2, ShieldCheck, Check, Plus, X, RefreshCw } from 'lucide-react';
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

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('usuarios');
  const [profiles, setProfiles] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const supabase = getSupabase();
    setLoading(true);
    const [{ data: profs }, { data: asg }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, created_at').order('role'),
      supabase.from('chatter_assignments').select('chatter_id, creator_id'),
    ]);
    setProfiles(profs || []);
    setAssignments(asg || []);
    setLoading(false);
  }, []);

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

        <div className="mt-8 flex gap-2 border-b border-line">
          {[{ id: 'usuarios', label: 'Usuarios & roles', icon: Users }, { id: 'asignaciones', label: 'Asignaciones', icon: Link2 }].map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`relative -mb-px flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${tab === tb.id ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}>
              <tb.icon size={15} /> {tb.label}
              {tab === tb.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-8 text-paper-dim">Cargando datos…</p>
        ) : tab === 'usuarios' ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
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

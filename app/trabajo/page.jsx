'use client';

// Staff workspace (internal — Spanish).
// Roles: admin/supervisor → Creadoras (subir entregas + ver LoRA) · Pedidos · Feedback.
//        chatter → Pedidos only (creates requests for assigned creators).
// Privacy: staff only ever sees stage names via the team_creators() RPC.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Users, Inbox, MessageSquare, Folder, FolderPlus, Upload, Loader2,
  Check, RefreshCw, Sparkles, ChevronRight, Plus, ShieldCheck, X,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/notify';
import Logo from '@/components/Logo';

const ROLE_LABEL = { admin: 'Dueño', supervisor: 'Supervisor', producer: 'Supervisor', chatter: 'Servicio al cliente' };
const REQ_STATUS = {
  pending: { l: 'Pendiente', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  in_progress: { l: 'En producción', cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  delivered: { l: 'Entregado', cls: 'border-brand/40 bg-brand/10 text-brand' },
};
const OB_LABEL = {
  registered: 'Registrada', info: 'Falta ID', id_pending: 'ID en revisión',
  id_rejected: 'ID rechazado', id_approved: 'Falta pago', authorized: 'Falta pago',
  paid: 'Activa', active: 'Activa',
};

export default function TrabajoPage() {
  const router = useRouter();
  const [me, setMe] = useState(undefined);
  const [tab, setTab] = useState('pedidos');
  const [creators, setCreators] = useState([]);
  const [staff, setStaff] = useState([]);
  const [toast, setToast] = useState('');

  const isManager = me && ['admin', 'supervisor', 'producer'].includes(me.role);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const [{ data: cr }, { data: st }] = await Promise.all([
      supabase.rpc('team_creators'),
      supabase.rpc('team_staff'),
    ]);
    setCreators(cr || []);
    setStaff(st || []);
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      const role = up.profile?.role;
      if (!['admin', 'supervisor', 'producer', 'chatter'].includes(role)) { router.replace('/panel'); return; }
      setMe(up.profile);
      setTab(['admin', 'supervisor', 'producer'].includes(role) ? 'creadoras' : 'pedidos');
      load();
    })();
  }, [router, load]);

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  if (me === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  const TABS = [
    ...(isManager ? [{ id: 'creadoras', label: 'Creadoras', icon: Users }] : []),
    { id: 'pedidos', label: 'Pedidos', icon: Inbox },
    ...(isManager ? [{ id: 'feedback', label: 'Feedback', icon: MessageSquare }] : []),
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Trabajo</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-paper-mute sm:inline">{me?.full_name} · {ROLE_LABEL[me?.role]}</span>
            {me?.role === 'admin' && (
              <Link href="/admin" className="rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
                Admin
              </Link>
            )}
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Espacio de trabajo</h1>
        <p className="mt-1 text-sm text-paper-mute">
          {isManager ? 'Sube entregas, gestiona pedidos y responde feedback.' : 'Pide el contenido que tus creadoras necesitan.'}
        </p>

        <div className="mt-6 flex gap-2 border-b border-line">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setTab(tb.id)}
              className={`relative -mb-px flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${tab === tb.id ? 'text-brand' : 'text-paper-mute hover:text-paper'}`}>
              <tb.icon size={15} /> {tb.label}
              {tab === tb.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {tab === 'creadoras' && isManager && <CreadorasTab creators={creators} me={me} flash={flash} />}
        {tab === 'pedidos' && <PedidosTab creators={creators} staff={staff} me={me} flash={flash} isManager={isManager} />}
        {tab === 'feedback' && isManager && <FeedbackTab creators={creators} flash={flash} />}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Creadoras: folders + deliveries upload + LoRA view ─────────────────── */
function CreadorasTab({ creators, me, flash }) {
  const [sel, setSel] = useState(null);
  const active = creators.filter((c) => ['active', 'paid'].includes(c.onboarding_status));
  const others = creators.filter((c) => !['active', 'paid'].includes(c.onboarding_status));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        {[...active, ...others].map((c) => (
          <button key={c.id} onClick={() => setSel(c)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              sel?.id === c.id ? 'border-brand/50 bg-brand/10 text-paper' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
            <span className="truncate font-medium">{c.full_name || '—'}</span>
            <span className="ml-2 shrink-0 rounded-full bg-hair/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-paper-dim">
              {OB_LABEL[c.onboarding_status] || c.onboarding_status}
            </span>
          </button>
        ))}
        {creators.length === 0 && <p className="text-sm text-paper-dim">No hay creadoras todavía.</p>}
      </aside>
      {sel ? <CreatorDetail key={sel.id} creator={sel} me={me} flash={flash} /> : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line p-16 text-paper-dim">
          <span className="flex items-center gap-2 text-sm"><ChevronRight size={16} /> Elige una creadora</span>
        </div>
      )}
    </div>
  );
}

function CreatorDetail({ creator, me, flash }) {
  const [folders, setFolders] = useState(null);
  const [folderSel, setFolderSel] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState('');
  const [lora, setLora] = useState(null); // {count, urls[]}
  const [showLora, setShowLora] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('folders')
      .select('id, name, kind, assets(id)')
      .eq('creator_id', creator.id).order('created_at');
    setFolders(data || []);
  }, [creator.id]);

  useEffect(() => { load(); }, [load]);

  async function createFolder(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await getSupabase().from('folders').insert({ creator_id: creator.id, name: newName.trim(), kind: 'photo' });
    setCreating(false);
    if (error) { flash('Error: ' + error.message); return; }
    setNewName(''); load(); flash('Carpeta creada');
  }

  async function uploadFiles(list) {
    if (!folderSel) { flash('Elige primero una carpeta.'); return; }
    const files = Array.from(list).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!files.length) return;
    const supabase = getSupabase();
    try {
      for (let i = 0; i < files.length; i++) {
        setUploading(`${i + 1}/${files.length}`);
        const file = files[i];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${creator.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('deliveries').upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { error: dbErr } = await supabase.from('assets').insert({
          creator_id: creator.id, folder_id: folderSel, storage_path: path,
          type: file.type.startsWith('video/') ? 'video' : 'photo', uploaded_by: me.id,
        });
        if (dbErr) throw dbErr;
      }
      const folderName = (folders || []).find((f) => f.id === folderSel)?.name || '';
      sendEmail('delivery', creator.id, folderName);
      await supabase.from('notifications').insert({ user_id: creator.id, kind: 'delivery', meta: { folder: folderName } });
      flash('Entrega subida');
      load();
    } catch (err) {
      flash('Error: ' + err.message);
    } finally {
      setUploading('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function toggleLora() {
    if (showLora) { setShowLora(false); return; }
    if (!lora) {
      const supabase = getSupabase();
      const { data: rows } = await supabase.from('lora_photos')
        .select('storage_path').eq('user_id', creator.id).order('created_at');
      const paths = (rows || []).map((r) => r.storage_path);
      let urls = [];
      if (paths.length) {
        const { data: signed } = await supabase.storage.from('lora').createSignedUrls(paths, 3600);
        urls = (signed || []).map((s) => s.signedUrl).filter(Boolean);
      }
      setLora({ count: paths.length, urls });
    }
    setShowLora(true);
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{creator.full_name}</h2>
        <button onClick={toggleLora}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
          <Sparkles size={14} /> Fotos LoRA {showLora ? '▴' : '▾'}
        </button>
      </div>

      {showLora && (
        <div className="mt-3 rounded-2xl border border-line bg-card p-4">
          {!lora ? <p className="text-sm text-paper-dim">Cargando…</p> : lora.count === 0 ? (
            <p className="text-sm text-paper-dim">Aún no ha subido fotos para su clon.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-paper-mute">{lora.count} fotos del set de clonación — clic para abrir/descargar.</p>
              <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
                {lora.urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-full w-full object-cover transition-transform hover:scale-105" />
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-5">
        <form onSubmit={createFolder} className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nueva carpeta (ej. Semana 1 — Venta)"
            className="flex-1 rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          <button type="submit" disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60">
            <FolderPlus size={15} /> Crear
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {(folders || []).map((f) => (
            <button key={f.id} onClick={() => setFolderSel(f.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                folderSel === f.id ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line bg-card text-paper-mute hover:text-paper'}`}>
              <Folder size={14} /> {f.name}
              <span className="font-mono text-[10px] text-paper-dim">{f.assets?.length || 0}</span>
            </button>
          ))}
          {folders && folders.length === 0 && <span className="text-sm text-paper-dim">Sin carpetas — crea la primera.</span>}
        </div>

        <button type="button" onClick={() => fileRef.current?.click()} disabled={!!uploading || !folderSel}
          className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-ink-2 py-8 transition-colors hover:border-brand/40 disabled:opacity-50">
          {uploading ? (
            <span className="flex items-center gap-2 text-sm text-paper"><Loader2 size={17} className="animate-spin" /> Subiendo {uploading}…</span>
          ) : (
            <>
              <Upload size={24} className="text-paper-dim" />
              <span className="text-sm font-medium text-paper">{folderSel ? 'Subir fotos o videos a la carpeta' : 'Elige una carpeta para subir'}</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
      </div>
    </section>
  );
}

/* ── Pedidos: chatter creates · manager takes/delivers ──────────────────── */
function PedidosTab({ creators, staff, me, flash, isManager }) {
  const [requests, setRequests] = useState(null);
  const [assignedIds, setAssignedIds] = useState(null);
  const [form, setForm] = useState({ creator_id: '', title: '', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);
  const nameOf = (id) => creators.find((c) => c.id === id)?.full_name
    || staff.find((s) => s.id === id)?.full_name || '—';

  const load = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.from('requests')
      .select('id, creator_id, chatter_id, producer_id, title, description, status, due_date, created_at')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    if (me.role === 'chatter') {
      const { data: asg } = await supabase.from('chatter_assignments').select('creator_id').eq('chatter_id', me.id);
      setAssignedIds((asg || []).map((a) => a.creator_id));
    }
  }, [me.id, me.role]);

  useEffect(() => { load(); }, [load]);

  const creatable = me.role === 'chatter'
    ? creators.filter((c) => (assignedIds || []).includes(c.id))
    : creators;

  async function createRequest(e) {
    e.preventDefault();
    if (!form.creator_id || !form.title.trim()) { flash('Elige creadora y escribe el pedido.'); return; }
    setSaving(true);
    const { error } = await getSupabase().from('requests').insert({
      creator_id: form.creator_id, chatter_id: me.id, title: form.title.trim(),
      description: form.description.trim() || null, due_date: form.due_date || null,
    });
    setSaving(false);
    if (error) { flash('Error: ' + error.message); return; }
    setForm({ creator_id: '', title: '', description: '', due_date: '' });
    flash('Pedido creado'); load();
  }

  async function setStatus(req, status) {
    const patch = { status };
    if (status === 'in_progress' && !req.producer_id) patch.producer_id = me.id;
    if (status === 'delivered') patch.delivered_at = new Date().toISOString();
    const { error } = await getSupabase().from('requests').update(patch).eq('id', req.id);
    if (error) { flash('Error: ' + error.message); return; }
    load();
  }

  return (
    <div className="mt-6 space-y-6">
      {(me.role === 'chatter' || isManager) && (
        <form onSubmit={createRequest} className="rounded-2xl border border-brand/25 bg-brand/[0.04] p-5">
          <div className="mb-3 flex items-center gap-2 font-display font-semibold"><Plus size={17} className="text-brand" /> Nuevo pedido</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select value={form.creator_id} onChange={(e) => setForm((f) => ({ ...f, creator_id: e.target.value }))}
              className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper outline-none focus:border-brand/60">
              <option value="">Creadora…</option>
              {creatable.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Qué necesita (ej. 4 fotos gym)"
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none focus:border-brand/60 [color-scheme:dark]" />
            <button type="submit" disabled={saving}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
              {saving ? 'Creando…' : 'Crear pedido'}
            </button>
          </div>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
            placeholder="Detalles: escena, outfit, tono, contexto del fan…"
            className="mt-3 w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
          {me.role === 'chatter' && creatable.length === 0 && (
            <p className="mt-2 text-xs text-amber-300">No tienes creadoras asignadas — pídele al admin que te asigne.</p>
          )}
        </form>
      )}

      <div className="space-y-3">
        {requests === null && <p className="text-paper-dim">Cargando…</p>}
        {requests?.length === 0 && <p className="rounded-2xl border border-line bg-card p-8 text-center text-paper-dim">No hay pedidos todavía.</p>}
        {(requests || []).map((r) => {
          const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
          return (
            <div key={r.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-paper">{r.title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.l}</span>
                  </div>
                  <div className="mt-1 text-xs text-paper-dim">
                    Para <span className="text-paper-mute">{nameOf(r.creator_id)}</span> · pidió {nameOf(r.chatter_id)}
                    {r.due_date && <> · entrega {r.due_date}</>}
                  </div>
                  {r.description && <p className="mt-1.5 text-sm text-paper-mute">{r.description}</p>}
                </div>
                {isManager && r.status !== 'delivered' && (
                  <div className="flex shrink-0 gap-2">
                    {r.status === 'pending' && (
                      <button onClick={() => setStatus(r, 'in_progress')}
                        className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20">
                        Tomar pedido
                      </button>
                    )}
                    <button onClick={() => setStatus(r, 'delivered')}
                      className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-on-accent shadow-glow-sm hover:scale-[1.03]">
                      <Check size={13} /> Entregado
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Feedback de creadoras ──────────────────────────────────────────────── */
function FeedbackTab({ creators, flash }) {
  const [items, setItems] = useState(null);
  const nameOf = (id) => creators.find((c) => c.id === id)?.full_name || '—';

  const load = useCallback(async () => {
    const { data } = await getSupabase().from('feedback')
      .select('id, creator_id, kind, message, resolved, created_at, asset_id')
      .order('created_at', { ascending: false });
    setItems(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggle(f) {
    const supabase = getSupabase();
    const { error } = await supabase.from('feedback').update({ resolved: !f.resolved }).eq('id', f.id);
    if (error) { flash('Error: ' + error.message); return; }
    if (!f.resolved) {
      await supabase.from('notifications').insert({ user_id: f.creator_id, kind: 'feedback_resolved', meta: {} });
    }
    load();
  }

  return (
    <div className="mt-6 space-y-3">
      {items === null && <p className="text-paper-dim">Cargando…</p>}
      {items?.length === 0 && <p className="rounded-2xl border border-line bg-card p-8 text-center text-paper-dim">Sin feedback todavía.</p>}
      {(items || []).map((f) => (
        <div key={f.id} className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${f.resolved ? 'border-line bg-card/50 opacity-70' : 'border-line bg-card'}`}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-paper">{nameOf(f.creator_id)}</span>
              {f.kind === 'love' ? (
                <span className="rounded-full border border-brand/40 bg-brand/10 px-2 py-0.5 text-[11px] text-brand">Le encantó</span>
              ) : (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">Pide cambio</span>
              )}
            </div>
            {f.message && <p className="mt-1.5 text-sm text-paper-mute">{f.message}</p>}
          </div>
          <button onClick={() => toggle(f)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              f.resolved ? 'border-line text-paper-dim hover:text-paper' : 'border-brand/40 bg-brand/10 text-brand hover:bg-brand/20'}`}>
            {f.resolved ? 'Reabrir' : 'Resuelto'}
          </button>
        </div>
      ))}
    </div>
  );
}

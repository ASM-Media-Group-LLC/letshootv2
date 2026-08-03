'use client';

// Agency / manager workspace. An agency manages a set of creators:
//  · sees the content the team delivered to each model (with its purpose)
//  · records what each piece sold — the platform keeps the agency's books
//  · makes content requests for its models
// Sales live HERE (attributed to the agency), not on the creator's own panel.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Users, ImageIcon, ShoppingBag, DollarSign, Building2, Target, Film,
  Sparkles, X, TrendingUp, TrendingDown, Plus, Clock, Loader2, ChevronRight,
  ChevronLeft, Send, CheckCircle2, NotebookPen,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { ymOf, ymLabel, shiftYm, aggregate, pct, initials } from '@/lib/portal-stats';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';

function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

const REQ_STATUS = {
  pending: { label: 'Pendiente', cls: 'text-amber-300 border-amber-400/30 bg-amber-400/10' },
  in_progress: { label: 'En proceso', cls: 'text-sky border-sky/30 bg-sky/10' },
  delivered: { label: 'Entregado', cls: 'text-brand border-brand/30 bg-brand/10' },
};

export default function AgenciaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [models, setModels] = useState([]);       // [{id, name, status, assets:[...]}]
  const [folders, setFolders] = useState({});     // folderId -> name
  const [requests, setRequests] = useState([]);
  const [urls, setUrls] = useState({});
  const [sel, setSel] = useState(null);           // selected creator id
  const [month, setMonth] = useState(null);       // 'YYYY-MM' for the selected model
  const [mtab, setMtab] = useState('content');    // content | pedidos
  const [detail, setDetail] = useState(null);     // asset being edited
  const [toast, setToast] = useState('');
  const [reqOpen, setReqOpen] = useState(false);

  // Select a model and jump to its latest delivery month.
  function pickModel(m) {
    setSel(m.id); setReqOpen(false); setMtab('content');
    const latest = (m.assets || []).reduce((mx, a) => (a.deliver_date && a.deliver_date > mx ? a.deliver_date : mx), '');
    setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
  }

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const load = useCallback(async (agencyId) => {
    const supabase = getSupabase();
    const { data: links } = await supabase.from('agency_creators')
      .select('creator_id').eq('agency_id', agencyId);
    const ids = (links || []).map((l) => l.creator_id);
    if (!ids.length) { setModels([]); setRequests([]); return; }

    const [{ data: profs }, { data: assets }, { data: fols }, { data: reqs }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, stage_name, onboarding_status, handle, avatar_url').in('id', ids),
      supabase.from('assets')
        .select('id, creator_id, folder_id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, reach, interactions')
        .in('creator_id', ids),
      supabase.from('folders').select('id, name').in('creator_id', ids),
      supabase.from('requests')
        .select('id, creator_id, title, description, status, due_date, created_at')
        .eq('chatter_id', agencyId).order('created_at', { ascending: false }),
    ]);

    const folderMap = {};
    (fols || []).forEach((f) => { folderMap[f.id] = f.name; });

    const list = (profs || []).map((p) => ({
      id: p.id,
      name: p.stage_name || p.full_name || 'Modelo',
      handle: p.handle,
      avatar_url: p.avatar_url,
      status: p.onboarding_status,
      assets: (assets || []).filter((a) => a.creator_id === p.id),
    }));

    // Sign any private-bucket paths (demo uses /public, so usually none).
    const toSign = (assets || []).filter((a) => !isDirect(a.storage_path));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries')
        .createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; });
      setUrls(map);
    }
    setFolders(folderMap);
    setModels(list);
    setRequests(reqs || []);
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role !== 'agency') { router.replace('/login'); return; }
      await load(up.user.id);
      setMe(up.profile);
      setLoading(false);
    })();
  }, [router, load]);

  const refresh = useCallback(async () => { if (me?.id) await load(me.id); }, [me?.id, load]);

  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));

  // Agency-wide books.
  const books = useMemo(() => {
    const all = models.flatMap((m) => m.assets);
    return {
      models: models.length,
      delivered: all.length,
      sales: all.reduce((s, a) => s + (a.sales_count || 0), 0),
      revenue: all.reduce((s, a) => s + Number(a.revenue || 0), 0),
      reach: all.reduce((s, a) => s + (a.reach || 0), 0),
    };
  }, [models]);

  if (loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  const model = models.find((m) => m.id === sel) || null;
  const monthAssets = model ? model.assets.filter((a) => ymOf(a.deliver_date) === month) : [];
  const prevAssets = model ? model.assets.filter((a) => ymOf(a.deliver_date) === shiftYm(month || '2026-01', -1)) : [];
  const cur = aggregate(monthAssets);
  const prev = aggregate(prevAssets);
  const curPhotos = monthAssets.filter((a) => a.type !== 'video').length;
  const curVideos = monthAssets.filter((a) => a.type === 'video').length;
  const prevPhotos = prevAssets.filter((a) => a.type !== 'video').length;
  const prevVideos = prevAssets.filter((a) => a.type === 'video').length;
  const modelRequests = model ? requests.filter((r) => r.creator_id === model.id) : requests;

  const BOOK_KPIS = [
    { icon: Users, label: 'Modelos', value: nf(books.models) },
    { icon: ImageIcon, label: 'Entregadas', value: nf(books.delivered) },
    { icon: ShoppingBag, label: 'Ventas', value: nf(books.sales) },
    { icon: DollarSign, label: 'Ingresos', value: money(books.revenue) },
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Logo size="sm" />
            <span className="hidden items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand sm:inline-flex">
              <Building2 size={12} /> Agencia · Manager
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-full border border-line bg-card py-1 pl-1 pr-3">
              <Avatar src={me?.avatar_url} name={me?.full_name} size="xs" />
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-semibold text-paper">{me?.full_name}</span>
                <span className="block text-[10px] text-paper-dim">Administra a tus modelos</span>
              </span>
            </div>
            <button onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <LogOut size={15} /> <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Tus cuentas</h1>
        <p className="mt-1 text-sm text-paper-mute">Gestiona a tus modelos, revisa el contenido entregado, registra ventas y haz pedidos.</p>

        {/* Agency books */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BOOK_KPIS.map((k) => (
            <div key={k.label} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center gap-2 text-paper-dim">
                <k.icon size={15} className="text-brand" />
                <span className="text-xs font-medium">{k.label}</span>
              </div>
              <div className="mt-1.5 font-display text-2xl font-semibold text-paper sm:text-3xl">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]">
          {/* Models list */}
          <aside className="space-y-1.5">
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-paper-dim">Tus modelos</div>
            {models.length === 0 && <p className="rounded-xl border border-line bg-card p-4 text-sm text-paper-dim">Aún no tienes modelos asignadas. El administrador las vincula a tu agencia.</p>}
            {models.map((m) => {
              const sales = m.assets.reduce((s, a) => s + (a.sales_count || 0), 0);
              const rev = m.assets.reduce((s, a) => s + Number(a.revenue || 0), 0);
              const activeSel = sel === m.id;
              return (
                <button key={m.id} onClick={() => pickModel(m)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    activeSel ? 'border-brand/50 bg-brand/10' : 'border-line bg-card hover:border-brand/30'}`}>
                  <Avatar src={m.avatar_url} name={m.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-paper">{m.name}</span>
                      {m.status === 'active'
                        ? <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand">Activa</span>
                        : <span className="rounded-full bg-hair/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-paper-dim">Onboarding</span>}
                    </div>
                    {m.handle && <div className="truncate text-[11px] text-paper-dim">@{m.handle}</div>}
                    <div className="mt-0.5 text-[11px] text-paper-dim">{m.assets.length} entregadas · {nf(sales)} ventas · {money(rev)}</div>
                  </div>
                  <ChevronRight size={16} className={activeSel ? 'text-brand' : 'text-paper-dim'} />
                </button>
              );
            })}
          </aside>

          {/* Selected model */}
          <section className="min-w-0">
            {!model ? (
              <div className="grid h-full min-h-[240px] place-items-center rounded-2xl border border-dashed border-line bg-card p-8 text-center text-sm text-paper-dim">
                Elige una modelo para ver su contenido, registrar ventas y hacer pedidos.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold">{model.name}</h2>
                  <button onClick={() => { setMtab('pedidos'); setReqOpen(true); }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20">
                    <Plus size={15} /> Pedir contenido
                  </button>
                </div>

                {/* Month accounting — this month vs last month */}
                <div className="mt-4 flex items-center justify-between">
                  <button onClick={() => setMonth(shiftYm(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronLeft size={17} /></button>
                  <div className="text-center">
                    <div className="font-display text-lg font-semibold">{ymLabel(month, 'es-US')}</div>
                    <div className="text-[11px] text-paper-dim">vs. {ymLabel(shiftYm(month || '2026-01', -1), 'es-US')}</div>
                  </div>
                  <button onClick={() => setMonth(shiftYm(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronRight size={17} /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard icon={ImageIcon} label="Fotos este mes" value={nf(curPhotos)} d={pct(curPhotos, prevPhotos)} />
                  <StatCard icon={Film} label="Videos este mes" value={nf(curVideos)} d={pct(curVideos, prevVideos)} />
                  <StatCard icon={ShoppingBag} label="Vendidas" value={nf(cur.sales)} d={pct(cur.sales, prev.sales)} />
                  <StatCard icon={DollarSign} label="Ingresos" value={money(cur.revenue)} d={pct(cur.revenue, prev.revenue)} />
                </div>

                {/* Per-model sub-nav: content vs orders */}
                <div className="mt-6 inline-flex rounded-full border border-line bg-card p-1">
                  {[{ id: 'content', l: 'Contenido', Ic: ImageIcon }, { id: 'pedidos', l: 'Pedidos', Ic: Clock }].map((tb) => (
                    <button key={tb.id} onClick={() => setMtab(tb.id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${mtab === tb.id ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
                      <tb.Ic size={15} /> {tb.l}
                      {tb.id === 'pedidos' && modelRequests.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${mtab === tb.id ? 'bg-on-accent/20' : 'bg-brand/15 text-brand'}`}>{modelRequests.length}</span>}
                    </button>
                  ))}
                </div>

                {mtab === 'pedidos' && (
                  <div className="mt-4">
                    {reqOpen && <NewRequest creatorId={model.id} agencyId={me.id} onDone={async () => { setReqOpen(false); await refresh(); flash('Pedido enviado al equipo'); }} />}
                    <div className="mt-3 space-y-2">
                      {modelRequests.length === 0 && !reqOpen && <p className="rounded-xl border border-dashed border-line bg-card/50 p-6 text-center text-sm text-paper-dim">Sin pedidos. Usa «Pedir contenido» para crear uno.</p>}
                      {modelRequests.map((r) => {
                        const st = REQ_STATUS[r.status] || REQ_STATUS.pending;
                        return (
                          <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-card px-4 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-paper">{r.title}</p>
                              {r.description && <p className="mt-0.5 text-xs text-paper-dim">{r.description}</p>}
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${st.cls}`}>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Delivered content this month — team uploads, agency records sales/price */}
                {mtab === 'content' && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-paper-dim"><ImageIcon size={12} /> Contenido de {ymLabel(month, 'es-US')} · toca para poner precio y ventas</div>
                  {monthAssets.length === 0 ? (
                    <p className="rounded-xl border border-line bg-card p-5 text-sm text-paper-dim">No hay contenido entregado en este mes.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {[...monthAssets].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || '')).map((a) => (
                        <button key={a.id} onClick={() => setDetail(a)}
                          className="group relative overflow-hidden rounded-xl border border-line bg-card text-left">
                          {a.type === 'video'
                            ? <video src={srcFor(a)} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
                            // eslint-disable-next-line @next/next/no-img-element
                            : <img src={srcFor(a)} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
                          <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
                            {a.sales_count > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur">
                                <ShoppingBag size={10} className="text-brand" /> {nf(a.sales_count)}
                              </span>
                            )}
                            {Number(a.revenue) > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur">
                                <DollarSign size={10} className="text-brand" /> {money(a.revenue)}
                              </span>
                            )}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
                            {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
                            {a.folder_id && <p className="mt-0.5 truncate text-[11px] text-paper-mute">{folders[a.folder_id]}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      {detail && (
        <RecordSale
          asset={detail} src={srcFor(detail)} folderName={folders[detail.folder_id]}
          agencyId={me.id} agencyName={me.full_name} agencyHandle={me.handle} agencyEmail={me.email}
          onClose={() => setDetail(null)}
          onSaved={async (patch) => { flash('Guardado'); setDetail((d) => (d ? { ...d, ...patch } : d)); await refresh(); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

// KPI card with a month-over-month delta chip.
function StatCard({ icon: Icon, label, value, d }) {
  const chip = d === null
    ? { txt: 'nuevo', cls: 'text-brand', Ic: TrendingUp }
    : d > 0 ? { txt: `+${d}%`, cls: 'text-brand', Ic: TrendingUp }
    : d < 0 ? { txt: `${d}%`, cls: 'text-rose-300', Ic: TrendingDown }
    : { txt: '0%', cls: 'text-paper-dim', Ic: TrendingUp };
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between text-paper-dim">
        <span className="flex items-center gap-1.5"><Icon size={14} className="text-brand" /><span className="text-[11px] font-medium">{label}</span></span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${chip.cls}`}><chip.Ic size={12} /> {chip.txt}</span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold text-paper sm:text-3xl">{value}</div>
    </div>
  );
}

// New content request from the agency to the team.
function NewRequest({ creatorId, agencyId, onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await getSupabase().from('requests').insert({
      creator_id: creatorId, chatter_id: agencyId, title: title.trim(),
      description: description.trim() || null, status: 'pending', due_date: due || null,
    });
    setSaving(false);
    if (error) { console.error(error); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-line bg-card p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué necesitas? (ej. Set de lencería para PPV)"
        className="w-full rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Detalles del pedido…"
        className="mt-2 w-full resize-none rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="text-xs text-paper-dim">Para el:</label>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60" />
        <button type="submit" disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><Send size={14} /> Enviar pedido</>}
        </button>
      </div>
    </form>
  );
}

// Agency records what a piece sold + keeps a day-by-day notes journal.
function RecordSale({ asset, src, folderName, agencyId, agencyName, agencyHandle, agencyEmail, onClose, onSaved }) {
  const [sales, setSales] = useState(asset.sales_count || 0);
  const [revenue, setRevenue] = useState(asset.revenue || 0);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const loadNotes = useCallback(async () => {
    const { data } = await getSupabase().from('asset_notes')
      .select('id, note, note_date, author_name, author_handle').eq('asset_id', asset.id)
      .order('note_date', { ascending: false }).order('created_at', { ascending: false });
    setNotes(data || []);
  }, [asset.id]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  async function save() {
    setSaving(true);
    const p_sales = Math.max(0, parseInt(sales, 10) || 0);
    const p_revenue = Math.max(0, parseFloat(revenue) || 0);
    const { error } = await getSupabase().rpc('agency_set_stats', {
      aid: asset.id, p_sales, p_revenue,
      p_reach: asset.reach || 0, p_interactions: asset.interactions || 0,
    });
    setSaving(false);
    if (error) { console.error(error); return; }
    onSaved({ sales_count: p_sales, revenue: p_revenue });
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    const { error } = await getSupabase().from('asset_notes').insert({
      asset_id: asset.id, author_id: agencyId, author_name: agencyName, author_handle: agencyHandle || null, author_email: agencyEmail || null, note: newNote.trim(),
    });
    setAddingNote(false);
    if (error) { console.error(error); return; }
    setNewNote(''); loadNotes();
  }

  const STAT = (label, val, set, step = '1') => (
    <label className="block">
      <span className="text-[11px] font-medium text-paper-dim">{label}</span>
      <input type="number" min="0" step={step} value={val} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/50" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand">
          <X size={18} />
        </button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="bg-ink">
            {asset.type === 'video'
              ? <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" controls autoPlay loop playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={src} alt={asset.title || ''} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" />}
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[85vh]">
            <div>
              {asset.deliver_date && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 text-[11px] font-medium text-paper-dim">
                  <Sparkles size={11} className="text-brand" /> {folderName || 'Entrega'} · {fmtDate(asset.deliver_date)}
                </span>
              )}
              {asset.title && <h3 className="mt-2 font-display text-xl font-semibold text-paper">{asset.title}</h3>}
            </div>
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} /> Por qué se hizo</div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || 'Sin propósito asignado'}</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-paper">Registrar venta</div>
              <p className="mt-0.5 text-xs text-paper-dim">Conteo manual — la foto llega en cero y tú vas sumando lo que se venda.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {STAT('Ventas (unidades)', sales, setSales)}
                {STAT('Ingresos ($)', revenue, setRevenue, '0.01')}
              </div>
              <button onClick={save} disabled={saving}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.01] disabled:opacity-60">
                {saving ? 'Guardando…' : <><TrendingUp size={15} /> Guardar en mis cuentas</>}
              </button>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-paper-dim"><CheckCircle2 size={12} className="text-brand" /> Se atribuye a tu agencia y la modelo lo ve.</p>
            </div>

            {/* Day-by-day notes journal */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-paper"><NotebookPen size={15} className="text-brand" /> Bitácora de notas</div>
              <div className="flex gap-2">
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                  placeholder="Escribe una nota de hoy…"
                  className="flex-1 rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
                <button onClick={addNote} disabled={addingNote || !newNote.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.03] disabled:opacity-50">
                  {addingNote ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {notes.length === 0 && <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-paper-dim">Aún no hay notas. Empieza tu bitácora del día.</p>}
                {notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-line bg-ink-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{initials(n.author_name)}</span>
                      <span className="truncate text-xs font-semibold text-paper">{n.author_name || 'Equipo'}{n.author_handle ? <span className="font-normal text-paper-dim"> · @{n.author_handle}</span> : null}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-paper-dim">{fmtDate(n.note_date)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-snug text-paper">{n.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

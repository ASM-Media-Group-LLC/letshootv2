'use client';

// Creator panel — simple and calm for the creator (OnlyFans model).
// Three clean sections: Calendario (mira lo que se entregó cada día) ·
// Galería (sus carpetas) · Pedidos (pide contenido). She can SEE all the
// numbers (price / sales / reach) but everything is READ-ONLY — a mirror of
// what her agency/manager sets. Nothing here moves or edits those numbers.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Image as ImageIcon, Film, Download, Folder, Heart, MessageSquarePlus,
  User, Bell, FolderPlus, Pencil, Trash2, FolderInput, X, Sparkles, Target,
  CalendarDays, Building2, Inbox, Plus, Send, ChevronLeft, ChevronRight,
  ShoppingBag, DollarSign, Eye, ArrowLeft, Images,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { ymOf, ymLabel, shiftYm, aggregate } from '@/lib/portal-stats';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import LoraUploader from '@/components/LoraUploader';

function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }
const ASSET_COLS = 'id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, reach, interactions';
const nf = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

function notifText(t, n) {
  const m = n.meta || {};
  switch (n.kind) {
    case 'delivery': return t.panel.notifDelivery(m.folder || '');
    case 'approved': return t.panel.notifApproved;
    case 'rejected': return t.panel.notifRejected(m.reason || '');
    case 'feedback_resolved': return t.panel.notifFeedback;
    default: return m.text || t.panel.notifGeneric;
  }
}

export default function PanelPage() {
  const { t, lang } = usePortal();
  const router = useRouter();
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  const [state, setState] = useState({ loading: true, profile: null, folders: [] });
  const [urls, setUrls] = useState({});
  const [toast, setToast] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [agency, setAgency] = useState('');
  const [requests, setRequests] = useState([]);
  const [reqOpen, setReqOpen] = useState(false);
  const [view, setView] = useState('calendar');   // calendar | gallery | requests
  const [month, setMonth] = useState(null);        // 'YYYY-MM'
  const [selDay, setSelDay] = useState(null);      // 'YYYY-MM-DD'
  const [openFolder, setOpenFolder] = useState(null); // folder id in gallery

  const load = useCallback(async (userId) => {
    const supabase = getSupabase();
    const [{ data: folders }, { data: nots }, { data: reqs }] = await Promise.all([
      supabase.from('folders').select(`id, name, kind, assets(${ASSET_COLS})`).eq('creator_id', userId).order('created_at', { ascending: true }),
      supabase.from('notifications').select('id, kind, meta, read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('requests').select('id, title, description, status, created_at').eq('creator_id', userId).order('created_at', { ascending: false }),
    ]);
    const list = folders || [];
    const toSign = list.flatMap((f) => (f.assets || []).filter((a) => !isDirect(a.storage_path)));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries').createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; });
      setUrls(map);
    }
    setNotifs(nots || []);
    setRequests(reqs || []);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role === 'creator' && up.profile?.onboarding_status !== 'active') { router.replace('/onboarding'); return; }
      const list = await load(up.user.id);
      const all = list.flatMap((f) => f.assets || []);
      const latest = all.reduce((m, a) => (a.deliver_date && a.deliver_date > m ? a.deliver_date : m), '');
      setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
      setState({ loading: false, profile: up.profile, folders: list });
      if (list.length) setOpenFolder(null);
      const { data: ag } = await getSupabase().rpc('my_agency');
      if (ag) setAgency(ag);
    })();
  }, [router, load]);

  const refresh = useCallback(async () => {
    if (!state.profile?.id) return;
    const list = await load(state.profile.id);
    setState((s) => ({ ...s, folders: list }));
    return list;
  }, [state.profile?.id, load]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));
  const allAssets = state.folders.flatMap((f) => f.assets || []);
  const unread = notifs.filter((n) => !n.read).length;
  const fmtDay = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : '');

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function openBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unread > 0) {
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      await getSupabase().from('notifications').update({ read: true }).eq('user_id', state.profile.id).eq('read', false);
    }
  }
  async function sendFeedback(asset, kind) {
    let message = null;
    if (kind === 'change') { message = window.prompt(t.panel.changePrompt, ''); if (message === null) return; }
    const { error } = await getSupabase().from('feedback').insert({ asset_id: asset.id, creator_id: state.profile.id, kind, message });
    if (!error) flash(t.panel.thanks);
  }
  async function createRequest(title, description) {
    if (!title.trim()) return false;
    const { error } = await getSupabase().from('requests').insert({
      creator_id: state.profile.id, chatter_id: state.profile.id, title: title.trim(), description: description.trim() || null, status: 'pending',
    });
    if (error) { console.error(error); flash(t.common.error); return false; }
    setReqOpen(false); flash(t.panel.reqSent); await refresh(); return true;
  }
  async function createFolder() {
    const name = window.prompt(t.panel.newFolderPrompt, ''); if (!name || !name.trim()) return;
    const { data, error } = await getSupabase().from('folders').insert({ creator_id: state.profile.id, name: name.trim(), kind: 'photo' }).select('id').single();
    if (error) { console.error(error); flash(t.common.error); return; }
    await refresh(); if (data?.id) setOpenFolder(data.id); flash(t.panel.folderCreated);
  }
  async function renameFolder(folder) {
    const name = window.prompt(t.panel.renamePrompt, folder.name); if (!name || !name.trim() || name.trim() === folder.name) return;
    const { error } = await getSupabase().from('folders').update({ name: name.trim() }).eq('id', folder.id);
    if (error) { console.error(error); flash(t.common.error); return; } await refresh(); flash(t.panel.folderRenamed);
  }
  async function deleteFolder(folder) {
    if ((folder.assets || []).length > 0) { flash(t.panel.folderNotEmpty); return; }
    const { error } = await getSupabase().rpc('delete_own_folder', { fid: folder.id });
    if (error) { console.error(error); flash(t.common.error); return; } setOpenFolder(null); await refresh(); flash(t.panel.folderDeleted);
  }
  async function moveAsset(assetId, folderId) {
    const { error } = await getSupabase().rpc('move_own_asset', { aid: assetId, fid: folderId });
    if (error) { console.error(error); flash(t.common.error); return; } await refresh(); flash(t.panel.moved);
  }
  function downloadMany(items) {
    items.forEach((a, i) => { const src = srcFor(a); if (!src) return; setTimeout(() => { const el = document.createElement('a'); el.href = src; el.download = ''; document.body.appendChild(el); el.click(); el.remove(); }, i * 350); });
  }

  const NAV = [
    { id: 'calendar', label: t.panel.navCalendar, icon: CalendarDays },
    { id: 'gallery', label: t.panel.navGallery, icon: Images },
    { id: 'requests', label: t.panel.navRequests, icon: Inbox },
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3"><Logo size="sm" /><span className="hidden text-sm text-paper-dim sm:inline">· Portal</span></div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-paper-mute md:inline">{t.panel.hello} {state.profile?.full_name || t.panel.creator}</span>
            <LangToggle />
            <div className="relative">
              <button onClick={openBell} aria-label={t.panel.notifications} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                <Bell size={16} />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-accent">{unread}</span>}
              </button>
              {bellOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setBellOpen(false)} aria-hidden />
                  <div className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-card shadow-glow-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)]">
                    <div className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper-dim">{t.panel.notifications}</div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 && <p className="px-4 py-6 text-center text-sm text-paper-dim">{t.panel.notifEmpty}</p>}
                      {notifs.map((n) => (
                        <div key={n.id} className="border-b border-line px-4 py-3 text-sm last:border-0">
                          <p className="text-paper">{notifText(t, n)}</p>
                          <p className="mt-0.5 text-[11px] text-paper-dim">{new Date(n.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <Link href="/cuenta" aria-label={t.panel.myAccount} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><User size={16} /></Link>
            <button onClick={async () => { await signOut(); router.replace('/login'); }} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><LogOut size={15} /> <span className="hidden sm:inline">{t.common.exit}</span></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.panel.title}</h1>
            {agency && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-paper-dim">
                <Building2 size={12} className="text-brand" /> {t.panel.managedBy} <span className="font-medium text-paper-mute">{agency}</span>
              </p>
            )}
          </div>
        </div>

        {/* Section nav — clean segmented control */}
        <div className="mt-5 inline-flex rounded-full border border-line bg-card p-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setView(n.id); setOpenFolder(null); }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${view === n.id ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
              <n.icon size={15} /> {n.label}
              {n.id === 'requests' && requests.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${view === n.id ? 'bg-on-accent/20' : 'bg-brand/15 text-brand'}`}>{requests.length}</span>}
            </button>
          ))}
        </div>

        {view === 'calendar' && (
          <CalendarView
            allAssets={allAssets} month={month} setMonth={setMonth} selDay={selDay} setSelDay={setSelDay}
            locale={locale} t={t} srcFor={srcFor} onOpen={setDetail} fmtDay={fmtDay} lang={lang}
          />
        )}

        {view === 'gallery' && (
          <GalleryView
            folders={state.folders} openFolder={openFolder} setOpenFolder={setOpenFolder}
            srcFor={srcFor} onOpen={setDetail} t={t}
            onNewFolder={createFolder} onRename={renameFolder} onDelete={deleteFolder} onDownload={downloadMany}
            profileId={state.profile?.id}
          />
        )}

        {view === 'requests' && (
          <RequestsView requests={requests} reqOpen={reqOpen} setReqOpen={setReqOpen} onSubmit={createRequest} t={t} />
        )}
      </main>

      {detail && (
        <AssetDetail asset={detail} src={srcFor(detail)} t={t} locale={locale} folders={state.folders}
          onClose={() => setDetail(null)} onFeedback={sendFeedback}
          onMove={async (fid) => { await moveAsset(detail.id, fid); setDetail(null); }} />
      )}

      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">{toast}</div>}
    </div>
  );
}

// ── Calendar section ────────────────────────────────────────────────────────
function CalendarView({ allAssets, month, setMonth, selDay, setSelDay, locale, t, srcFor, onOpen, fmtDay, lang }) {
  const byDate = {};
  allAssets.forEach((a) => { if (!a.deliver_date) return; (byDate[a.deliver_date] = byDate[a.deliver_date] || []).push(a); });

  const monthAssets = allAssets.filter((a) => ymOf(a.deliver_date) === month);
  const agg = aggregate(monthAssets);

  const [y, m] = (month || '2026-01').split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const WD = lang === 'es' ? ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const dayStr = (d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const KPIS = [
    { icon: ImageIcon, label: t.panel.kpiDelivered, value: nf(agg.delivered) },
    { icon: ShoppingBag, label: t.panel.kpiSales, value: nf(agg.sales) },
    { icon: DollarSign, label: t.panel.kpiRevenue, value: money(agg.revenue) },
    { icon: Eye, label: t.panel.kpiReach, value: nf(agg.reach) },
  ];
  const selItems = selDay ? (byDate[selDay] || []) : [];

  return (
    <div className="mt-6">
      {/* Month switcher */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setMonth(shiftYm(month, -1)); setSelDay(null); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronLeft size={17} /></button>
        <div className="font-display text-lg font-semibold">{ymLabel(month, locale)}</div>
        <button onClick={() => { setMonth(shiftYm(month, 1)); setSelDay(null); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronRight size={17} /></button>
      </div>

      {/* Month summary (read-only mirror of the agency's numbers) */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-card p-3.5">
            <div className="flex items-center gap-1.5 text-paper-dim"><k.icon size={13} className="text-brand" /><span className="text-[11px] font-medium">{k.label}</span></div>
            <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{k.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-paper-dim">{t.panel.statsNote}</p>

      {/* Calendar grid */}
      <div className="mt-4 rounded-3xl border border-line bg-card p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-paper-dim">
          {WD.map((d, i) => <div key={i} className="py-1">{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const ds = dayStr(d);
            const items = byDate[ds] || [];
            const has = items.length > 0;
            const isSel = selDay === ds;
            return (
              <button key={i} onClick={() => has && setSelDay(isSel ? null : ds)} disabled={!has}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors ${
                  isSel ? 'bg-brand font-bold text-on-accent'
                  : has ? 'bg-brand/10 font-semibold text-brand hover:bg-brand/20'
                  : 'text-paper-dim'}`}>
                {d}
                {has && !isSel && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day's deliveries */}
      {selItems.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-paper">
            <Sparkles size={15} className="text-brand" /> {fmtDay(selDay)} · {selItems.length} {t.panel.photos}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {selItems.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} onOpen={onOpen} />)}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.pickDay}</p>
      )}
    </div>
  );
}

// ── Gallery section ─────────────────────────────────────────────────────────
function GalleryView({ folders, openFolder, setOpenFolder, srcFor, onOpen, t, onNewFolder, onRename, onDelete, onDownload, profileId }) {
  const folder = folders.find((f) => f.id === openFolder);
  if (folder) {
    const items = [...(folder.assets || [])].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || ''));
    return (
      <div className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => setOpenFolder(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-paper-mute transition-colors hover:text-brand"><ArrowLeft size={15} /> {t.panel.back}</button>
          <div className="flex items-center gap-1.5">
            {items.length > 0 && <button onClick={() => onDownload(items)} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20"><Download size={13} /> {t.panel.downloadAll}</button>}
            <button onClick={() => onRename(folder)} title={t.panel.renameFolder} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-dim transition-colors hover:border-brand/40 hover:text-paper"><Pencil size={13} /></button>
            <button onClick={() => onDelete(folder)} title={t.panel.deleteFolder} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-dim transition-colors hover:border-rose-500/50 hover:text-rose-300"><Trash2 size={13} /></button>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-sm text-paper-mute">
          {folder.kind === 'video' ? <Film size={16} className="text-brand" /> : <ImageIcon size={16} className="text-brand" />}
          <span className="font-medium text-paper">{folder.name}</span> · {items.length}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} onOpen={onOpen} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {folders.map((f) => {
          const cover = (f.assets || [])[0];
          return (
            <button key={f.id} onClick={() => setOpenFolder(f.id)} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-card text-left">
              {cover
                ? (cover.type === 'video'
                  ? <video src={srcFor(cover)} className="h-full w-full object-cover opacity-90" muted playsInline preload="metadata" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={srcFor(cover)} alt="" className="h-full w-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" />)
                : <div className="grid h-full place-items-center text-paper-dim"><Folder size={26} /></div>}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/60 to-transparent p-3 pt-8">
                <p className="truncate text-sm font-semibold text-paper">{f.name}</p>
                <p className="text-[11px] text-paper-mute">{(f.assets || []).length} {f.kind === 'video' ? t.panel.videos : t.panel.photos}</p>
              </div>
            </button>
          );
        })}
        <button onClick={onNewFolder} className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-paper-dim transition-colors hover:border-brand/40 hover:text-brand">
          <FolderPlus size={22} /> <span className="text-xs font-medium">{t.panel.newFolder}</span>
        </button>
      </div>
      {profileId && (
        <details className="mt-8 rounded-2xl border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-paper-mute">{t.panel.addClonePhotos}</summary>
          <div className="mt-4"><LoraUploader userId={profileId} compact /></div>
        </details>
      )}
    </div>
  );
}

// ── Requests section ────────────────────────────────────────────────────────
function RequestsView({ requests, reqOpen, setReqOpen, onSubmit, t }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-paper-mute">{t.panel.requests}</p>
        <button onClick={() => setReqOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"><Plus size={15} /> {t.panel.askContent}</button>
      </div>
      {reqOpen && <RequestForm t={t} onSubmit={onSubmit} />}
      <div className="mt-4 space-y-2.5">
        {requests.length === 0 && !reqOpen && <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.reqEmpty}</p>}
        {requests.map((r) => {
          const st = r.status === 'delivered' ? { l: t.panel.reqDelivered, cls: 'border-brand/40 bg-brand/10 text-brand' }
            : r.status === 'in_progress' ? { l: t.panel.reqProgress, cls: 'border-sky/40 bg-sky/10 text-sky' }
            : { l: t.panel.reqPending, cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
          return (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <div className="min-w-0"><p className="text-sm font-medium text-paper">{r.title}</p>{r.description && <p className="mt-0.5 text-xs text-paper-dim">{r.description}</p>}</div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${st.cls}`}>{st.l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// A photo tile with read-only sale/price badges.
function PhotoCard({ a, src, onOpen }) {
  return (
    <button onClick={() => onOpen(a)} className="group relative overflow-hidden rounded-xl border border-line bg-card text-left">
      {a.type === 'video'
        ? <video src={src} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={src} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
      {(a.sales_count > 0 || Number(a.revenue) > 0) && (
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {a.sales_count > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><ShoppingBag size={10} className="text-brand" /> {nf(a.sales_count)}</span>}
          {Number(a.revenue) > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><DollarSign size={10} className="text-brand" /> {money(a.revenue)}</span>}
        </div>
      )}
      {(a.title || a.purpose) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
          {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
        </div>
      )}
    </button>
  );
}

// Content request form.
function RequestForm({ t, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); const ok = await onSubmit(title, description); setSaving(false); if (ok) { setTitle(''); setDescription(''); } }} className="mt-3 rounded-2xl border border-line bg-card p-4">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.panel.reqWhat} className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t.panel.reqDetails} className="mt-2 w-full resize-none rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
      <button type="submit" disabled={saving} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60"><Send size={14} /> {saving ? t.common.saving : t.panel.reqSend}</button>
    </form>
  );
}

// Read-only detail: the delivered piece, why it was made, and its numbers
// (mirror of the agency's — the creator can see, never edit).
function AssetDetail({ asset, src, t, locale, folders, onClose, onFeedback, onMove }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const STATS = [
    { icon: ShoppingBag, label: t.panel.kpiSales, value: nf(asset.sales_count) },
    { icon: DollarSign, label: t.panel.kpiRevenue, value: money(asset.revenue) },
    { icon: Eye, label: t.panel.kpiReach, value: nf(asset.reach) },
    { icon: Heart, label: t.panel.interactions, value: nf(asset.interactions) },
  ];
  const hasStats = asset.sales_count || Number(asset.revenue) || asset.reach || asset.interactions;

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label={t.panel.close} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand"><X size={18} /></button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="bg-ink">
            {asset.type === 'video'
              ? <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[80vh]" controls autoPlay loop playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={src} alt={asset.title || ''} className="h-full max-h-[46vh] w-full object-contain md:max-h-[80vh]" />}
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[80vh]">
            <div>
              {asset.deliver_date && <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 text-[11px] font-medium text-paper-dim"><Sparkles size={11} className="text-brand" /> {t.panel.deliveredOn} {fmtDate(asset.deliver_date)}</span>}
              {asset.title && <h3 className="mt-2 font-display text-xl font-semibold text-paper">{asset.title}</h3>}
            </div>
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} /> {t.panel.why}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || t.panel.noPurpose}</p>
            </div>
            {hasStats ? (
              <div>
                <div className="grid grid-cols-2 gap-2.5">
                  {STATS.map((s) => (
                    <div key={s.label} className="rounded-xl border border-line bg-ink-2 p-2.5">
                      <div className="flex items-center gap-1.5 text-paper-dim"><s.icon size={12} className="text-brand" /><span className="text-[10px] font-medium uppercase tracking-wide">{s.label}</span></div>
                      <div className="mt-0.5 font-display text-lg font-semibold text-paper">{s.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-paper-dim">{t.panel.statsNote}</p>
              </div>
            ) : null}
            <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
              <button onClick={() => onFeedback(asset, 'love')} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Heart size={14} /> {t.panel.love}</button>
              <button onClick={() => onFeedback(asset, 'change')} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><MessageSquarePlus size={14} /> {t.panel.change}</button>
              <a href={src} download className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Download size={14} /> {t.panel.download}</a>
              {folders.length > 1 && (
                <div className="relative">
                  <button onClick={() => setMoveOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><FolderInput size={14} /> {t.panel.moveTo}</button>
                  {moveOpen && (
                    <div className="absolute bottom-11 left-0 z-10 max-h-48 w-52 overflow-y-auto rounded-xl border border-line bg-ink/95 backdrop-blur">
                      {folders.map((f) => (
                        <button key={f.id} onClick={() => { setMoveOpen(false); onMove(f.id); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-paper-mute transition-colors hover:bg-brand/10 hover:text-brand"><Folder size={12} /> {f.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

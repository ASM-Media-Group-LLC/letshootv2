'use client';

// Creator panel — the paid client's account:
//  · month overview KPIs (delivered · sales · revenue · reach)
//  · her delivered content, grouped by delivery date, in her own folders
//  · per-photo PURPOSE ("por qué se hizo esta foto", set by the team)
//  · per-photo PERFORMANCE she marks (sales / revenue / reach / interactions)
//  · in-app notifications, feedback, folder management, downloads

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Image as ImageIcon, Film, Download, Folder, Heart, MessageSquarePlus,
  User, Bell, FolderPlus, Pencil, Trash2, FolderInput, X, Sparkles, Target,
  FolderOpen, CalendarDays, Building2, Inbox, Plus, Send,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import Logo from '@/components/Logo';
import LangToggle from '@/components/LangToggle';
import LoraUploader from '@/components/LoraUploader';

// storage_path may be a /public path or full URL (demo/seed) — usable as-is —
// or an object path in the PRIVATE 'deliveries' bucket, which needs a signed URL.
function isDirect(path) {
  return !path || path.startsWith('http') || path.startsWith('/');
}

const ASSET_COLS = 'id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, reach, interactions';

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

const nf = (n) => Number(n || 0).toLocaleString('en-US');

export default function PanelPage() {
  const { t, lang } = usePortal();
  const router = useRouter();
  const locale = lang === 'es' ? 'es-US' : 'en-US';
  const [state, setState] = useState({ loading: true, profile: null, folders: [] });
  const [active, setActive] = useState(null);
  const [urls, setUrls] = useState({}); // asset id → signed url
  const [toast, setToast] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [detail, setDetail] = useState(null);   // asset open in the lightbox
  const [agency, setAgency] = useState('');      // name of the managing agency
  const [requests, setRequests] = useState([]);  // her own content requests
  const [reqOpen, setReqOpen] = useState(false);

  const load = useCallback(async (userId) => {
    const supabase = getSupabase();
    const [{ data: folders }, { data: nots }] = await Promise.all([
      supabase.from('folders')
        .select(`id, name, kind, assets(${ASSET_COLS})`)
        .eq('creator_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('notifications')
        .select('id, kind, meta, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    const { data: reqs } = await supabase.from('requests')
      .select('id, title, description, status, due_date, created_at')
      .eq('creator_id', userId).order('created_at', { ascending: false });
    setRequests(reqs || []);
    const list = folders || [];
    const toSign = list.flatMap((f) => (f.assets || []).filter((a) => !isDirect(a.storage_path)));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries')
        .createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {};
      (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; });
      setUrls(map);
    }
    setNotifs(nots || []);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role === 'creator' && up.profile?.onboarding_status !== 'active') {
        router.replace('/onboarding'); return;
      }
      const list = await load(up.user.id);
      setState({ loading: false, profile: up.profile, folders: list });
      if (list.length) setActive((a) => a || list[0].id);
      const { data: ag } = await getSupabase().rpc('my_agency');
      if (ag) setAgency(ag);
    })();
  }, [router, load]);

  const refreshFolders = useCallback(async () => {
    if (!state.profile?.id) return;
    const list = await load(state.profile.id);
    setState((s) => ({ ...s, folders: list }));
    return list;
  }, [state.profile?.id, load]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const folder = state.folders.find((f) => f.id === active) || state.folders[0];
  const items = [...(folder?.assets || [])].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || ''));
  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));
  const unread = notifs.filter((n) => !n.read).length;

  // Content-focused overview (sales live on the agency's side, not here).
  const allAssets = state.folders.flatMap((f) => f.assets || []);
  const lastDate = allAssets.reduce((m, a) => (a.deliver_date && a.deliver_date > m ? a.deliver_date : m), '');

  // Group the active folder's items by delivery date (a delivery timeline).
  const groups = [];
  items.forEach((a) => {
    const key = a.deliver_date || '';
    let g = groups.find((x) => x.date === key);
    if (!g) { g = { date: key, items: [] }; groups.push(g); }
    g.items.push(a);
  });
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' }) : '');

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function openBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unread > 0) {
      setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
      await getSupabase().from('notifications').update({ read: true })
        .eq('user_id', state.profile.id).eq('read', false);
    }
  }

  async function sendFeedback(asset, kind) {
    let message = null;
    if (kind === 'change') {
      message = window.prompt(t.panel.changePrompt, '');
      if (message === null) return;
    }
    const { error } = await getSupabase().from('feedback').insert({
      asset_id: asset.id, creator_id: state.profile.id, kind, message,
    });
    if (!error) flash(t.panel.thanks);
  }

  async function createRequest(title, description) {
    if (!title.trim()) return false;
    const { error } = await getSupabase().from('requests').insert({
      creator_id: state.profile.id, chatter_id: state.profile.id,
      title: title.trim(), description: description.trim() || null, status: 'pending',
    });
    if (error) { console.error(error); flash(t.common.error); return false; }
    setReqOpen(false);
    flash(t.panel.reqSent);
    await refreshFolders();
    return true;
  }

  async function createFolder() {
    const name = window.prompt(t.panel.newFolderPrompt, '');
    if (!name || !name.trim()) return;
    const { data, error } = await getSupabase().from('folders')
      .insert({ creator_id: state.profile.id, name: name.trim(), kind: 'photo' })
      .select('id').single();
    if (error) { console.error(error); flash(t.common.error); return; }
    await refreshFolders();
    if (data?.id) setActive(data.id);
    flash(t.panel.folderCreated);
  }

  async function renameFolder() {
    if (!folder) return;
    const name = window.prompt(t.panel.renamePrompt, folder.name);
    if (!name || !name.trim() || name.trim() === folder.name) return;
    const { error } = await getSupabase().from('folders').update({ name: name.trim() }).eq('id', folder.id);
    if (error) { console.error(error); flash(t.common.error); return; }
    await refreshFolders();
    flash(t.panel.folderRenamed);
  }

  async function deleteFolder() {
    if (!folder) return;
    if ((folder.assets || []).length > 0) { flash(t.panel.folderNotEmpty); return; }
    const { error } = await getSupabase().rpc('delete_own_folder', { fid: folder.id });
    if (error) { console.error(error); flash(t.common.error); return; }
    const list = await refreshFolders();
    setActive(list?.[0]?.id || null);
    flash(t.panel.folderDeleted);
  }

  async function moveAsset(assetId, folderId) {
    setMoveFor(null);
    const { error } = await getSupabase().rpc('move_own_asset', { aid: assetId, fid: folderId });
    if (error) { console.error(error); flash(t.common.error); return; }
    await refreshFolders();
    flash(t.panel.moved);
  }

  function downloadAll() {
    items.forEach((a, i) => {
      const src = srcFor(a);
      if (!src) return;
      setTimeout(() => {
        const el = document.createElement('a');
        el.href = src; el.download = '';
        document.body.appendChild(el); el.click(); el.remove();
      }, i * 350);
    });
  }

  const KPIS = [
    { key: 'delivered', icon: ImageIcon, label: t.panel.kpiDelivered, value: nf(allAssets.length) },
    { key: 'folders', icon: FolderOpen, label: t.panel.kpiFolders, value: nf(state.folders.length) },
    { key: 'last', icon: CalendarDays, label: t.panel.kpiLast, value: lastDate ? fmtDate(lastDate) : '—' },
  ];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden text-sm text-paper-dim sm:inline">· Portal</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-sm text-paper-mute md:inline">{t.panel.hello} {state.profile?.full_name || t.panel.creator}</span>
            <LangToggle />

            {/* Notifications bell */}
            <div className="relative">
              <button onClick={openBell} aria-label={t.panel.notifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                <Bell size={16} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-on-accent">
                    {unread}
                  </span>
                )}
              </button>
              {bellOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" onClick={() => setBellOpen(false)} aria-hidden />
                  <div className="fixed inset-x-4 top-16 z-50 overflow-hidden rounded-2xl border border-line bg-card shadow-glow-sm sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-2rem)]">
                    <div className="border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                      {t.panel.notifications}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 && <p className="px-4 py-6 text-center text-sm text-paper-dim">{t.panel.notifEmpty}</p>}
                      {notifs.map((n) => (
                        <div key={n.id} className="border-b border-line px-4 py-3 text-sm last:border-0">
                          <p className="text-paper">{notifText(t, n)}</p>
                          <p className="mt-0.5 text-[11px] text-paper-dim">
                            {new Date(n.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/cuenta" aria-label={t.panel.myAccount}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <User size={16} />
            </Link>
            <button
              onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
            >
              <LogOut size={15} /> <span className="hidden sm:inline">{t.common.exit}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.panel.title}</h1>
            <p className="mt-1 text-sm text-paper-mute">{t.panel.sub}</p>
          </div>
          {agency && (
            <div className="rounded-2xl border border-line bg-card px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">
                <Building2 size={12} className="text-brand" /> {t.panel.managedBy}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-paper">{agency}</p>
              <p className="text-[11px] text-paper-dim">{t.panel.agencyNote}</p>
            </div>
          )}
        </div>

        {/* Content overview (sales live on the agency's side) */}
        {allAssets.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-paper-dim">
              <CalendarDays size={13} className="text-brand" /> {t.panel.overview}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {KPIS.map((k) => (
                <div key={k.key} className="rounded-2xl border border-line bg-card p-4">
                  <div className="flex items-center gap-2 text-paper-dim">
                    <k.icon size={15} className="text-brand" />
                    <span className="text-xs font-medium">{k.label}</span>
                  </div>
                  <div className="mt-1.5 font-display text-2xl font-semibold text-paper sm:text-3xl">{k.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request content — from the creator herself (her agency can too) */}
        <div className="mt-6 rounded-2xl border border-line bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-paper">
              <Inbox size={16} className="text-brand" /> {t.panel.requests}
              {requests.length > 0 && <span className="font-mono text-xs text-paper-dim">· {requests.length}</span>}
            </div>
            <button onClick={() => setReqOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/20">
              <Plus size={14} /> {t.panel.askContent}
            </button>
          </div>
          {reqOpen && <RequestForm t={t} onSubmit={createRequest} />}
          {requests.length > 0 && (
            <div className="mt-3 space-y-2">
              {requests.map((r) => {
                const st = r.status === 'delivered' ? { l: t.panel.reqDelivered, cls: 'border-brand/40 bg-brand/10 text-brand' }
                  : r.status === 'in_progress' ? { l: t.panel.reqProgress, cls: 'border-sky/40 bg-sky/10 text-sky' }
                  : { l: t.panel.reqPending, cls: 'border-amber-400/40 bg-amber-400/10 text-amber-300' };
                return (
                  <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-ink-2 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-paper">{r.title}</p>
                      {r.description && <p className="mt-0.5 line-clamp-1 text-xs text-paper-dim">{r.description}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${st.cls}`}>{st.l}</span>
                  </div>
                );
              })}
            </div>
          )}
          {requests.length === 0 && !reqOpen && <p className="mt-2 text-xs text-paper-dim">{t.panel.reqEmpty}</p>}
        </div>

        {state.folders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-line bg-card p-10 text-center text-paper-mute">
            {t.panel.empty}
            <div className="mt-4">
              <button onClick={createFolder} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20">
                <FolderPlus size={15} /> {t.panel.newFolder}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
            <aside className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-visible">
              {state.folders.map((f) => (
                <button
                  key={f.id} onClick={() => setActive(f.id)}
                  className={`flex shrink-0 max-w-[70vw] md:max-w-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors md:shrink ${
                    active === f.id ? 'bg-brand/10 font-medium text-brand' : 'text-paper-mute hover:bg-hair/5 hover:text-paper'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder size={14} className={active === f.id ? 'text-brand' : 'text-paper-dim'} />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <span className="font-mono text-[11px] text-paper-dim">{f.assets?.length || 0}</span>
                </button>
              ))}
              <button onClick={createFolder}
                className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-paper-dim transition-colors hover:bg-hair/5 hover:text-brand md:shrink">
                <FolderPlus size={14} /> {t.panel.newFolder}
              </button>
            </aside>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-sm text-paper-mute">
                  {folder?.kind === 'video' ? <Film size={16} className="text-brand" /> : <ImageIcon size={16} className="text-brand" />}
                  <span className="truncate">{folder?.name}</span> · {items.length} {folder?.kind === 'video' ? t.panel.videos : t.panel.photos}
                </div>
                <div className="flex items-center gap-1.5">
                  {items.length > 0 && (
                    <button onClick={downloadAll} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20">
                      <Download size={13} /> {t.panel.downloadAll}
                    </button>
                  )}
                  <button onClick={renameFolder} title={t.panel.renameFolder}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-paper-dim transition-colors hover:border-brand/40 hover:text-paper">
                    <Pencil size={13} />
                  </button>
                  <button onClick={deleteFolder} title={t.panel.deleteFolder}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-paper-dim transition-colors hover:border-rose-500/50 hover:text-rose-300">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Delivery timeline: assets grouped by their delivery date */}
              {groups.map((g) => (
                <div key={g.date || 'nodate'} className="mb-7">
                  {g.date && (
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-paper-dim">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-brand">
                        <Sparkles size={12} /> {t.panel.deliveredOn} {fmtDate(g.date)}
                      </span>
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {g.items.map((a) => {
                      const src = srcFor(a);
                      return (
                        <button
                          key={a.id} onClick={() => setDetail(a)}
                          className="group relative overflow-hidden rounded-xl border border-line bg-card text-left"
                        >
                          {a.type === 'video' ? (
                            <video src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline preload="metadata" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          )}
                          {/* caption: title + purpose */}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
                            {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
                            {a.purpose && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-paper-mute">{a.purpose}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* Clone photos — creators can keep adding at any time */}
        {state.profile?.id && (
          <div className="mt-10 max-w-xl">
            <LoraUploader userId={state.profile.id} compact />
          </div>
        )}
      </main>

      {/* Detail lightbox: big view + purpose + performance the creator marks */}
      {detail && (
        <AssetDetail
          asset={detail}
          src={srcFor(detail)}
          t={t} locale={locale}
          folders={state.folders}
          currentFolderId={folder?.id}
          onClose={() => setDetail(null)}
          onFeedback={sendFeedback}
          onMove={async (fid) => { await moveAsset(detail.id, fid); setDetail(null); }}
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

// Content request form (the creator asks her team for content).
function RequestForm({ t, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); setSaving(true); const ok = await onSubmit(title, description); setSaving(false); if (ok) { setTitle(''); setDescription(''); } }}
      className="mt-3 rounded-xl border border-line bg-ink-2 p-3.5"
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.panel.reqWhat}
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder={t.panel.reqDetails}
        className="mt-2 w-full resize-none rounded-lg border border-line bg-ink px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/50" />
      <button type="submit" disabled={saving}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:opacity-60">
        <Send size={14} /> {saving ? t.common.saving : t.panel.reqSend}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Asset detail (modal) — the delivered piece + why it was made. Sales live on
// the agency's side, so the creator's view is read-only about performance.
// ─────────────────────────────────────────────────────────────────────────
function AssetDetail({ asset, src, t, locale, folders, currentFolderId, onClose, onFeedback, onMove }) {
  const [moveOpen, setMoveOpen] = useState(false);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden rounded-none border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label={t.panel.close}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand">
          <X size={18} />
        </button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          {/* Media */}
          <div className="bg-ink">
            {asset.type === 'video' ? (
              <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[80vh]" controls autoPlay loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={asset.title || ''} className="h-full max-h-[46vh] w-full object-contain md:max-h-[80vh]" />
            )}
          </div>

          {/* Info + purpose */}
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[80vh]">
            <div>
              {asset.deliver_date && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-2 px-2.5 py-1 text-[11px] font-medium text-paper-dim">
                  <Sparkles size={11} className="text-brand" /> {t.panel.deliveredOn} {fmtDate(asset.deliver_date)}
                </span>
              )}
              {asset.title && <h3 className="mt-2 font-display text-xl font-semibold text-paper">{asset.title}</h3>}
            </div>

            {/* Purpose — why the team made it */}
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
                <Target size={12} /> {t.panel.why}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || t.panel.noPurpose}</p>
            </div>

            {/* Actions */}
            <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
              <button onClick={() => onFeedback(asset, 'love')}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand">
                <Heart size={14} /> {t.panel.love}
              </button>
              <button onClick={() => onFeedback(asset, 'change')}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand">
                <MessageSquarePlus size={14} /> {t.panel.change}
              </button>
              <a href={src} download
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand">
                <Download size={14} /> {t.panel.download}
              </a>
              {folders.length > 1 && (
                <div className="relative">
                  <button onClick={() => setMoveOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand">
                    <FolderInput size={14} /> {t.panel.moveTo}
                  </button>
                  {moveOpen && (
                    <div className="absolute bottom-11 left-0 z-10 max-h-48 w-52 overflow-y-auto rounded-xl border border-line bg-ink/95 backdrop-blur">
                      {folders.filter((f) => f.id !== currentFolderId).map((f) => (
                        <button key={f.id} onClick={() => { setMoveOpen(false); onMove(f.id); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-paper-mute transition-colors hover:bg-brand/10 hover:text-brand">
                          <Folder size={12} /> {f.name}
                        </button>
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

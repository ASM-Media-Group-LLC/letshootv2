'use client';

// Creator panel — her content, organized her way:
//  · in-app notifications (bell) for deliveries / verification / feedback
//  · her OWN folders: create, rename, delete (when empty), move photos
//  · per-photo feedback (love / request change) and downloads (one or all)

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Image as ImageIcon, Film, Download, Folder, Heart, MessageSquarePlus,
  User, Bell, FolderPlus, Pencil, Trash2, FolderInput,
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
  const [state, setState] = useState({ loading: true, profile: null, folders: [] });
  const [active, setActive] = useState(null);
  const [urls, setUrls] = useState({}); // asset id → signed url
  const [toast, setToast] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [moveFor, setMoveFor] = useState(null); // asset id showing move menu

  const load = useCallback(async (userId) => {
    const supabase = getSupabase();
    const [{ data: folders }, { data: nots }] = await Promise.all([
      supabase.from('folders')
        .select('id, name, kind, assets(id, type, storage_path, deliver_date)')
        .eq('creator_id', userId)
        .order('created_at', { ascending: true }),
      supabase.from('notifications')
        .select('id, kind, meta, read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
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
    })();
  }, [router, load]);

  async function refreshFolders() {
    if (!state.profile?.id) return;
    const list = await load(state.profile.id);
    setState((s) => ({ ...s, folders: list }));
    return list;
  }

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const folder = state.folders.find((f) => f.id === active) || state.folders[0];
  const items = [...(folder?.assets || [])].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || ''));
  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));
  const unread = notifs.filter((n) => !n.read).length;

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function openBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unread > 0) {
      // Optimistic mark-all-read.
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
                            {new Date(n.created_at).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
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
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.panel.title}</h1>
        <p className="mt-1 text-sm text-paper-mute">{t.panel.sub}</p>

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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((a) => {
                  const src = srcFor(a);
                  return (
                    <div key={a.id} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                      {a.type === 'video' ? (
                        <video src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline preload="metadata"
                          onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()}
                          onClick={(e) => (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/90 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button onClick={() => sendFeedback(a, 'love')} title={t.panel.love}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur transition-colors hover:text-brand">
                            <Heart size={15} />
                          </button>
                          <button onClick={() => sendFeedback(a, 'change')} title={t.panel.change}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur transition-colors hover:text-brand">
                            <MessageSquarePlus size={15} />
                          </button>
                          <button onClick={() => setMoveFor(moveFor === a.id ? null : a.id)} title={t.panel.moveTo}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur transition-colors hover:text-brand">
                            <FolderInput size={15} />
                          </button>
                        </div>
                        <a href={src} download className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur" aria-label={t.panel.download}>
                          <Download size={15} />
                        </a>
                      </div>
                      {moveFor === a.id && (
                        <>
                        <button className="fixed inset-0 z-20 cursor-default" onClick={() => setMoveFor(null)} aria-hidden />
                        <div className="absolute inset-x-2 bottom-12 z-30 max-h-[calc(100%-3.5rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-line bg-ink/95 backdrop-blur">
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-paper-dim">{t.panel.moveTo}</div>
                          {state.folders.filter((f) => f.id !== folder?.id).map((f) => (
                            <button key={f.id} onClick={() => moveAsset(a.id, f.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-paper-mute transition-colors hover:bg-brand/10 hover:text-brand">
                              <Folder size={12} /> {f.name}
                            </button>
                          ))}
                        </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
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

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

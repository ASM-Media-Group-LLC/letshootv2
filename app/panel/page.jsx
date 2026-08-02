'use client';

// Creator panel — calm and clear for the model (OnlyFans creator).
// Two sections: Galería (her delivered content, organized by delivery, with a
// simple monthly accounting: fotos · videos · dinero) and Pedidos (request
// content). Everything about numbers/notes is READ-ONLY — a mirror of what her
// agency/manager keeps. Per photo she sees: when it was delivered, how much it
// sold, who added it, the agency's day-by-day notes, and she can leave feedback.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut, Image as ImageIcon, Film, Download, Heart, MessageSquarePlus, User, Bell,
  X, Sparkles, Target, Building2, Inbox, Plus, Send, ChevronLeft, ChevronRight,
  ShoppingBag, DollarSign, Images, UserPlus, NotebookPen, Activity,
} from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import { usePortal } from '@/lib/portal-i18n';
import { ymOf, ymLabel, shiftYm, initials } from '@/lib/portal-stats';
import Logo from '@/components/Logo';
import Avatar from '@/components/Avatar';
import LangToggle from '@/components/LangToggle';
import LoraUploader from '@/components/LoraUploader';

function isDirect(path) { return !path || path.startsWith('http') || path.startsWith('/'); }
const ASSET_COLS = 'id, folder_id, type, storage_path, deliver_date, title, purpose, sales_count, revenue, added_by';
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
  const [state, setState] = useState({ loading: true, profile: null, assets: [], folders: {} });
  const [urls, setUrls] = useState({});
  const [toast, setToast] = useState('');
  const [notifs, setNotifs] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [agency, setAgency] = useState('');
  const [requests, setRequests] = useState([]);
  const [reqOpen, setReqOpen] = useState(false);
  const [notesFeed, setNotesFeed] = useState([]);
  const [view, setView] = useState('gallery');   // gallery | activity | requests
  const [month, setMonth] = useState(null);

  const load = useCallback(async (userId) => {
    const supabase = getSupabase();
    const [{ data: folders }, { data: nots }, { data: reqs }] = await Promise.all([
      supabase.from('folders').select(`id, name, assets(${ASSET_COLS})`).eq('creator_id', userId).order('created_at'),
      supabase.from('notifications').select('id, kind, meta, read, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('requests').select('id, title, description, status, created_at').eq('creator_id', userId).order('created_at', { ascending: false }),
    ]);
    const folderMap = {}; (folders || []).forEach((f) => { folderMap[f.id] = f.name; });
    const assets = (folders || []).flatMap((f) => f.assets || []);
    const toSign = assets.filter((a) => !isDirect(a.storage_path));
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from('deliveries').createSignedUrls(toSign.map((a) => a.storage_path), 3600);
      const map = {}; (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; }); setUrls(map);
    }
    setNotifs(nots || []); setRequests(reqs || []);
    // Activity feed — the agency's notes across all her content (with thumbs).
    const ids = assets.map((a) => a.id);
    if (ids.length) {
      const { data: ns } = await supabase.from('asset_notes')
        .select('id, note, note_date, author_name, asset_id')
        .in('asset_id', ids).order('note_date', { ascending: false }).order('created_at', { ascending: false }).limit(40);
      const byId = {}; assets.forEach((a) => { byId[a.id] = a; });
      setNotesFeed((ns || []).map((n) => ({ ...n, asset: byId[n.asset_id] })).filter((n) => n.asset));
    } else setNotesFeed([]);
    return { assets, folders: folderMap };
  }, []);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role === 'creator' && up.profile?.onboarding_status !== 'active') { router.replace('/onboarding'); return; }
      const { assets, folders } = await load(up.user.id);
      const latest = assets.reduce((mx, a) => (a.deliver_date && a.deliver_date > mx ? a.deliver_date : mx), '');
      setMonth(latest ? ymOf(latest) : ymOf(new Date().toISOString()));
      setState({ loading: false, profile: up.profile, assets, folders });
      const { data: ag } = await getSupabase().rpc('my_agency'); if (ag) setAgency(ag);
    })();
  }, [router, load]);

  const refresh = useCallback(async () => {
    if (!state.profile?.id) return;
    const { assets, folders } = await load(state.profile.id);
    setState((s) => ({ ...s, assets, folders }));
  }, [state.profile?.id, load]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));
  const unread = notifs.filter((n) => !n.read).length;
  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

  async function openBell() {
    const opening = !bellOpen; setBellOpen(opening);
    if (opening && unread > 0) { setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))); await getSupabase().from('notifications').update({ read: true }).eq('user_id', state.profile.id).eq('read', false); }
  }
  async function sendFeedback(asset, kind) {
    let message = null;
    if (kind === 'change') { message = window.prompt(t.panel.changePrompt, ''); if (message === null) return; }
    const { error } = await getSupabase().from('feedback').insert({ asset_id: asset.id, creator_id: state.profile.id, kind, message });
    if (!error) flash(t.panel.thanks);
  }
  async function createRequest(title, description) {
    if (!title.trim()) return false;
    const { error } = await getSupabase().from('requests').insert({ creator_id: state.profile.id, chatter_id: state.profile.id, title: title.trim(), description: description.trim() || null, status: 'pending' });
    if (error) { console.error(error); flash(t.common.error); return false; }
    setReqOpen(false); flash(t.panel.reqSent); await refresh(); return true;
  }
  function downloadMany(items) { items.forEach((a, i) => { const src = srcFor(a); if (!src) return; setTimeout(() => { const el = document.createElement('a'); el.href = src; el.download = ''; document.body.appendChild(el); el.click(); el.remove(); }, i * 350); }); }

  // Selected-month accounting + deliveries grouped by date.
  const monthAssets = state.assets.filter((a) => ymOf(a.deliver_date) === month);
  const acc = {
    photos: monthAssets.filter((a) => a.type !== 'video').length,
    videos: monthAssets.filter((a) => a.type === 'video').length,
    revenue: monthAssets.reduce((s, a) => s + Number(a.revenue || 0), 0),
  };
  const groups = [];
  [...monthAssets].sort((a, b) => (b.deliver_date || '').localeCompare(a.deliver_date || '')).forEach((a) => {
    let g = groups.find((x) => x.date === a.deliver_date); if (!g) { g = { date: a.deliver_date, items: [] }; groups.push(g); } g.items.push(a);
  });
  const fmtDay = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : '');

  const NAV = [
    { id: 'gallery', label: t.panel.navGallery, icon: Images },
    { id: 'activity', label: t.panel.navActivity, icon: Activity },
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
        <div className="flex items-center gap-4">
          <Avatar src={state.profile?.avatar_url} name={state.profile?.stage_name || state.profile?.full_name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{t.panel.hello} {(state.profile?.stage_name || state.profile?.full_name || '').split(' ')[0]}</h1>
            {state.profile?.handle && <p className="text-sm text-paper-dim">@{state.profile.handle}</p>}
            <p className="mt-1 text-sm text-paper-mute">{t.panel.greeting}</p>
            {agency && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-paper-dim"><Building2 size={12} className="text-brand" /> {t.panel.managedBy} <span className="font-medium text-paper-mute">{agency}</span></p>}
          </div>
        </div>

        <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-card p-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${view === n.id ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'}`}>
              <n.icon size={15} /> {n.label}
              {n.id === 'requests' && requests.length > 0 && <span className={`rounded-full px-1.5 text-[10px] font-bold ${view === n.id ? 'bg-on-accent/20' : 'bg-brand/15 text-brand'}`}>{requests.length}</span>}
            </button>
          ))}
        </div>

        {view === 'gallery' && (
          <div className="mt-6">
            {/* Monthly accounting — fotos · videos · dinero (read-only mirror) */}
            <div className="rounded-3xl border border-line bg-card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <button onClick={() => setMonth(shiftYm(month, -1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronLeft size={17} /></button>
                <div className="font-display text-lg font-semibold">{ymLabel(month, locale)}</div>
                <button onClick={() => setMonth(shiftYm(month, 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"><ChevronRight size={17} /></button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[{ icon: ImageIcon, label: t.panel.mPhotos, value: nf(acc.photos) }, { icon: Film, label: t.panel.mVideos, value: nf(acc.videos) }, { icon: DollarSign, label: t.panel.mRevenue, value: money(acc.revenue) }].map((k) => (
                  <div key={k.label} className="rounded-2xl border border-line bg-ink-2 p-3.5 text-center sm:text-left">
                    <div className="flex items-center justify-center gap-1.5 text-paper-dim sm:justify-start"><k.icon size={13} className="text-brand" /><span className="text-[11px] font-medium">{k.label}</span></div>
                    <div className="mt-1 font-display text-xl font-semibold sm:text-2xl">{k.value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-paper-dim">{t.panel.statsNote}</p>
            </div>

            {/* Gallery — deliveries grouped by day */}
            {groups.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.emptyMonth}</p>
            ) : groups.map((g) => (
              <div key={g.date} className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-paper"><Sparkles size={15} className="text-brand" /> {fmtDay(g.date)} <span className="font-normal text-paper-dim">· {g.items.length} {g.items.length === 1 ? t.panel.mPhotos.slice(0, -1).toLowerCase() : t.panel.mPhotos.toLowerCase()}</span></div>
                  <button onClick={() => downloadMany(g.items)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Download size={13} /> {t.panel.downloadAll}</button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {g.items.map((a) => <PhotoCard key={a.id} a={a} src={srcFor(a)} folder={state.folders[a.folder_id]} onOpen={setDetail} />)}
                </div>
              </div>
            ))}

            {state.profile?.id && (
              <details className="mt-10 rounded-2xl border border-line bg-card p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-paper-mute"><UserPlus size={15} className="text-brand" /> {t.panel.addClonePhotos}</summary>
                <div className="mt-4"><LoraUploader userId={state.profile.id} compact /></div>
              </details>
            )}
          </div>
        )}

        {view === 'activity' && (
          <div className="mt-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-paper"><Activity size={16} className="text-brand" /> {t.panel.activityLead}</div>
            {notesFeed.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-card/50 p-8 text-center text-sm text-paper-dim">{t.panel.activityEmpty}</p>
            ) : (
              <div className="relative space-y-3 before:absolute before:left-[27px] before:top-3 before:bottom-3 before:w-px before:bg-line">
                {notesFeed.map((n) => (
                  <button key={n.id} onClick={() => setDetail(n.asset)} className="group relative flex w-full items-start gap-3 rounded-2xl border border-line bg-card p-3 text-left transition-colors hover:border-brand/40">
                    <div className="relative z-10 h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
                      {n.asset.type === 'video'
                        ? <video src={srcFor(n.asset)} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        // eslint-disable-next-line @next/next/no-img-element
                        : <img src={srcFor(n.asset)} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-paper">{n.note}</p>
                      <p className="mt-1 text-[11px] text-paper-dim">
                        <span className="text-paper-mute">{n.asset.title}</span> · {new Date(n.note_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}{n.author_name ? ` · ${n.author_name}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="mt-1 shrink-0 text-paper-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'requests' && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-paper-mute">{t.panel.requests}</p>
              <button onClick={() => setReqOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"><Plus size={15} /> {t.panel.askContent}</button>
            </div>
            {reqOpen && <RequestForm t={t} onSubmit={createRequest} />}
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
        )}
      </main>

      {detail && <AssetDetail asset={detail} src={srcFor(detail)} t={t} locale={locale} folderName={state.folders[detail.folder_id]} onClose={() => setDetail(null)} onFeedback={sendFeedback} />}
      {toast && <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">{toast}</div>}
    </div>
  );
}

function PhotoCard({ a, src, folder, onOpen }) {
  return (
    <button onClick={() => onOpen(a)} className="group relative overflow-hidden rounded-xl border border-line bg-card text-left">
      {a.type === 'video'
        ? <video src={src} className="aspect-[3/4] w-full object-cover" muted playsInline preload="metadata" />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src={src} alt={a.title || ''} className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
      {Number(a.revenue) > 0 && (
        <div className="pointer-events-none absolute left-2 top-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-ink/75 px-1.5 py-0.5 text-[10px] font-semibold text-paper backdrop-blur"><DollarSign size={10} className="text-brand" /> {money(a.revenue)}</span>
        </div>
      )}
      {(a.title || folder) && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-2.5 pt-8">
          {a.title && <p className="truncate text-xs font-semibold text-paper">{a.title}</p>}
          {folder && <p className="truncate text-[11px] text-paper-mute">{folder}</p>}
        </div>
      )}
    </button>
  );
}

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

// Read-only photo detail: when delivered, how much it sold, who added it,
// the agency's notes journal (read-only), and the creator's own feedback.
function AssetDetail({ asset, src, t, locale, folderName, onClose, onFeedback }) {
  const [notes, setNotes] = useState([]);
  useEffect(() => { (async () => { const { data } = await getSupabase().from('asset_notes').select('id, note, note_date, author_name').eq('asset_id', asset.id).order('note_date', { ascending: false }).order('created_at', { ascending: false }); setNotes(data || []); })(); }, [asset.id]);
  const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

  return (
    <div className="fixed inset-0 z-[55] flex items-stretch justify-center overflow-y-auto bg-ink/85 backdrop-blur-sm sm:items-center sm:p-6">
      <button className="fixed inset-0 -z-10 cursor-default" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-4xl self-start overflow-hidden border-line bg-card shadow-glow-sm sm:self-center sm:rounded-3xl sm:border">
        <button onClick={onClose} aria-label={t.panel.close} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper backdrop-blur transition-colors hover:text-brand"><X size={18} /></button>
        <div className="grid md:grid-cols-[1.1fr_1fr]">
          <div className="bg-ink">
            {asset.type === 'video'
              ? <video src={src} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" controls autoPlay loop playsInline />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={src} alt={asset.title || ''} className="h-full max-h-[46vh] w-full object-contain md:max-h-[85vh]" />}
          </div>
          <div className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[85vh]">
            <div>
              {asset.title && <h3 className="font-display text-xl font-semibold text-paper">{asset.title}</h3>}
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-paper-dim">
                {asset.deliver_date && <span className="inline-flex items-center gap-1"><Sparkles size={12} className="text-brand" /> {t.panel.deliveredOn} {fmtDate(asset.deliver_date)}</span>}
                {folderName && <span>· {folderName}</span>}
              </div>
              {asset.added_by && <p className="mt-1 flex items-center gap-1 text-xs text-paper-dim"><UserPlus size={12} className="text-brand" /> {t.panel.addedBy} <span className="text-paper-mute">{asset.added_by}</span></p>}
            </div>

            {/* Sold (read-only) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line bg-ink-2 p-3">
                <div className="flex items-center gap-1.5 text-paper-dim"><ShoppingBag size={12} className="text-brand" /><span className="text-[10px] font-medium uppercase tracking-wide">{t.panel.sold}</span></div>
                <div className="mt-0.5 font-display text-lg font-semibold text-paper">{nf(asset.sales_count)}</div>
              </div>
              <div className="rounded-xl border border-line bg-ink-2 p-3">
                <div className="flex items-center gap-1.5 text-paper-dim"><DollarSign size={12} className="text-brand" /><span className="text-[10px] font-medium uppercase tracking-wide">{t.panel.mRevenue}</span></div>
                <div className="mt-0.5 font-display text-lg font-semibold text-paper">{money(asset.revenue)}</div>
              </div>
            </div>

            {/* Purpose */}
            <div className="rounded-2xl border border-line bg-ink-2 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand"><Target size={12} /> {t.panel.why}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-paper-mute">{asset.purpose || t.panel.noPurpose}</p>
            </div>

            {/* Agency notes journal (read-only) */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-paper-dim"><NotebookPen size={12} className="text-brand" /> {t.panel.notesTitle}</div>
              {notes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-3 text-xs text-paper-dim">{t.panel.notesEmpty}</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-xl border border-line bg-ink-2 p-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[10px] font-bold text-brand">{initials(n.author_name)}</span>
                        <span className="truncate text-xs font-semibold text-paper">{n.author_name || t.panel.managedBy}</span>
                        <span className="ml-auto shrink-0 text-[10px] text-paper-dim">{fmtDate(n.note_date)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-snug text-paper">{n.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Her feedback */}
            <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
              <button onClick={() => onFeedback(asset, 'love')} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Heart size={14} /> {t.panel.love}</button>
              <button onClick={() => onFeedback(asset, 'change')} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><MessageSquarePlus size={14} /> {t.panel.change}</button>
              <a href={src} download className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs font-medium text-paper-mute transition-colors hover:border-brand/40 hover:text-brand"><Download size={14} /> {t.panel.download}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

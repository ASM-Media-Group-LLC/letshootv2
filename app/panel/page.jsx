'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Image as ImageIcon, Film, Download, Folder, Heart, MessageSquarePlus, User } from 'lucide-react';
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

export default function PanelPage() {
  const { t } = usePortal();
  const router = useRouter();
  const [state, setState] = useState({ loading: true, profile: null, folders: [] });
  const [active, setActive] = useState(null);
  const [urls, setUrls] = useState({}); // asset id → signed url
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (up.profile?.role === 'creator' && up.profile?.onboarding_status !== 'active') {
        router.replace('/onboarding'); return;
      }
      const supabase = getSupabase();
      const { data: folders } = await supabase
        .from('folders')
        .select('id, name, kind, assets(id, type, storage_path, deliver_date)')
        .eq('creator_id', up.user.id)
        .order('created_at', { ascending: true });
      const list = folders || [];
      // Sign the private-bucket assets in one batch.
      const toSign = list.flatMap((f) => (f.assets || []).filter((a) => !isDirect(a.storage_path)));
      if (toSign.length) {
        const { data: signed } = await supabase.storage.from('deliveries')
          .createSignedUrls(toSign.map((a) => a.storage_path), 3600);
        const map = {};
        (signed || []).forEach((s, i) => { if (s?.signedUrl) map[toSign[i].id] = s.signedUrl; });
        setUrls(map);
      }
      setState({ loading: false, profile: up.profile, folders: list });
      if (list.length) setActive(list[0].id);
    })();
  }, [router]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">{t.common.loading}</div>;

  const folder = state.folders.find((f) => f.id === active) || state.folders[0];
  const items = folder?.assets || [];
  const srcFor = (a) => (isDirect(a.storage_path) ? a.storage_path : (urls[a.id] || ''));

  function flash(m) { setToast(m); setTimeout(() => setToast(''), 2600); }

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
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
            <aside className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
              {state.folders.map((f) => (
                <button
                  key={f.id} onClick={() => setActive(f.id)}
                  className={`flex shrink-0 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors md:shrink ${
                    active === f.id ? 'border-brand/50 bg-brand/10 text-paper' : 'border-line bg-card text-paper-mute hover:text-paper'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Folder size={16} className={active === f.id ? 'text-brand' : 'text-paper-dim'} />
                    {f.name}
                  </span>
                  <span className="font-mono text-[11px] text-paper-dim">{f.assets?.length || 0}</span>
                </button>
              ))}
            </aside>

            <section>
              <div className="mb-4 flex items-center gap-2 text-sm text-paper-mute">
                {folder?.kind === 'video' ? <Film size={16} className="text-brand" /> : <ImageIcon size={16} className="text-brand" />}
                {folder?.name} · {items.length} {folder?.kind === 'video' ? t.panel.videos : t.panel.photos}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((a) => {
                  const src = srcFor(a);
                  return (
                    <div key={a.id} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                      {a.type === 'video' ? (
                        <video src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline
                          onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/90 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex gap-1">
                          <button onClick={() => sendFeedback(a, 'love')} title={t.panel.love}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur transition-colors hover:text-brand">
                            <Heart size={15} />
                          </button>
                          <button onClick={() => sendFeedback(a, 'change')} title={t.panel.change}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur transition-colors hover:text-brand">
                            <MessageSquarePlus size={15} />
                          </button>
                        </div>
                        <a href={src} download className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/80 text-paper backdrop-blur" aria-label={t.panel.download}>
                          <Download size={15} />
                        </a>
                      </div>
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-sm font-medium text-brand backdrop-blur">
          {toast}
        </div>
      )}
    </div>
  );
}

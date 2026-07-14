'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Image as ImageIcon, Film, Download, Folder } from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import Logo from '@/components/Logo';

// storage_path may be a /public path, a full URL, or a storage object path.
function srcFor(path) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('/')) return path;
  const { data } = getSupabase().storage.from('deliveries').getPublicUrl(path);
  return data?.publicUrl || path;
}

export default function PanelPage() {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, profile: null, folders: [] });
  const [active, setActive] = useState(null);

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      const supabase = getSupabase();
      const { data: folders } = await supabase
        .from('folders')
        .select('id, name, kind, assets(id, type, storage_path, deliver_date)')
        .eq('creator_id', up.user.id)
        .order('created_at', { ascending: true });
      const list = folders || [];
      setState({ loading: false, profile: up.profile, folders: list });
      if (list.length) setActive(list[0].id);
    })();
  }, [router]);

  if (state.loading) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;

  const folder = state.folders.find((f) => f.id === active) || state.folders[0];
  const items = folder?.assets || [];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden text-sm text-paper-dim sm:inline">· Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-paper-mute sm:inline">Hola, {state.profile?.full_name || 'creadora'}</span>
            <button
              onClick={async () => { await signOut(); router.replace('/login'); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
            >
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Tu contenido</h1>
        <p className="mt-1 text-sm text-paper-mute">Listo para vender. Descarga y suelta en tus chats, PPV y pedidos.</p>

        {state.folders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-line bg-card p-10 text-center text-paper-mute">
            Aún no tienes contenido entregado. Tu equipo lo subirá pronto.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
            <aside className="flex flex-col gap-2">
              {state.folders.map((f) => (
                <button
                  key={f.id} onClick={() => setActive(f.id)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
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
                {folder?.name} · {items.length} {folder?.kind === 'video' ? 'videos' : 'fotos'}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((a) => {
                  const src = srcFor(a.storage_path);
                  return (
                    <div key={a.id} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                      {a.type === 'video' ? (
                        <video src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline
                          onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                      ) : (
                        <img src={src} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      <a href={src} download className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ink/80 text-paper opacity-0 backdrop-blur transition-opacity group-hover:opacity-100" aria-label="Descargar">
                        <Download size={15} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

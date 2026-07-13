'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Image as ImageIcon, Film, Download, Folder } from 'lucide-react';
import { getSession, logout } from '@/lib/portalAuth';
import Logo from '@/components/Logo';

// Demo delivered content (until Supabase storage is wired)
const FOLDERS = [
  {
    id: 'venta-julio',
    name: 'Set de venta — Julio',
    kind: 'photo',
    count: 3,
    items: ['/result-2.jpg', '/result-4.jpg', '/result-5.jpg'],
  },
  {
    id: 'diario-opener',
    name: 'Contenido diario / opener',
    kind: 'photo',
    count: 4,
    items: ['/card-locacion.jpg', '/card-moda.jpg', '/card-estilista.jpg', '/card-hd.jpg'],
  },
  {
    id: 'videos',
    name: 'Videos cortos',
    kind: 'video',
    count: 1,
    items: ['/hero-miami.mp4'],
  },
];

export default function PanelPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = checking
  const [active, setActive] = useState(FOLDERS[0].id);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace('/login');
      return;
    }
    setSession(s);
  }, [router]);

  if (session === undefined) {
    return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;
  }
  if (!session) return null;

  const folder = FOLDERS.find((f) => f.id === active) || FOLDERS[0];

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden text-sm text-paper-dim sm:inline">· Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-paper-mute sm:inline">Hola, {session.name}</span>
            <button
              onClick={() => { logout(); router.replace('/login'); }}
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

        <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Folder list */}
          <aside className="flex flex-col gap-2">
            {FOLDERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActive(f.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  active === f.id ? 'border-brand/50 bg-brand/10 text-paper' : 'border-line bg-card text-paper-mute hover:text-paper'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Folder size={16} className={active === f.id ? 'text-brand' : 'text-paper-dim'} />
                  {f.name}
                </span>
                <span className="font-mono text-[11px] text-paper-dim">{f.count}</span>
              </button>
            ))}
          </aside>

          {/* Gallery */}
          <section>
            <div className="mb-4 flex items-center gap-2 text-sm text-paper-mute">
              {folder.kind === 'video' ? <Film size={16} className="text-brand" /> : <ImageIcon size={16} className="text-brand" />}
              {folder.name} · {folder.count} {folder.kind === 'video' ? 'videos' : 'fotos'}
            </div>

            <div className={`grid gap-3 ${folder.kind === 'video' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
              {folder.items.map((src, i) => (
                <div key={i} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                  {folder.kind === 'video' ? (
                    <video src={src} className="aspect-[3/4] w-full object-cover" muted loop playsInline
                      onMouseEnter={(e) => e.currentTarget.play()} onMouseLeave={(e) => e.currentTarget.pause()} />
                  ) : (
                    <img src={src} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  )}
                  <a
                    href={src}
                    download
                    className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ink/80 text-paper opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    aria-label="Descargar"
                  >
                    <Download size={15} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

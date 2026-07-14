'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UploadCloud, X, Check, ImagePlus, Film, Sparkles, ChevronDown } from 'lucide-react';
import { getUserProfile, signOut } from '@/lib/supabase/session';
import Logo from '@/components/Logo';

const CREATORS = [
  { id: 'sofia', name: 'Sofía', email: 'creadora@letshoot.ai' },
  { id: 'valentina', name: 'Valentina', email: 'valentina@demo.letshoot.ai' },
  { id: 'mia', name: 'Mia', email: 'mia@demo.letshoot.ai' },
];

const LORA_TARGET = 80;

function useUploads() {
  const [files, setFiles] = useState([]); // { id, url, name, isVideo }
  function add(fileList) {
    const added = Array.from(fileList).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      url: URL.createObjectURL(f),
      name: f.name,
      isVideo: f.type.startsWith('video/'),
    }));
    setFiles((prev) => [...prev, ...added]);
  }
  function remove(id) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }
  return { files, add, remove };
}

function DropZone({ onFiles, accept, label, sub }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
        over ? 'border-brand bg-brand/10' : 'border-line bg-ink-2/50 hover:border-brand/50'
      }`}
    >
      <UploadCloud size={28} className="mb-3 text-brand" />
      <div className="font-medium text-paper">{label}</div>
      <div className="mt-1 text-sm text-paper-dim">{sub}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}

function Thumb({ file, onRemove }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-line bg-card">
      {file.isVideo ? (
        <video src={file.url} className="aspect-square w-full object-cover" muted />
      ) : (
        <img src={file.url} alt={file.name} className="aspect-square w-full object-cover" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(file.id); }}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-ink/80 text-paper opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        aria-label="Quitar"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [creator, setCreator] = useState(CREATORS[0].id);
  const [tab, setTab] = useState('lora');

  const lora = useUploads();
  const deliver = useUploads();

  useEffect(() => {
    (async () => {
      const up = await getUserProfile();
      if (!up) { router.replace('/login'); return; }
      if (!['admin', 'chatter', 'producer'].includes(up.profile?.role)) { router.replace('/panel'); return; }
      setSession(up.profile);
    })();
  }, [router]);

  if (session === undefined) {
    return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;
  }
  if (!session) return null;

  const activeCreator = CREATORS.find((c) => c.id === creator);
  const loraDone = lora.files.length >= LORA_TARGET;
  const loraPct = Math.min(100, Math.round((lora.files.length / LORA_TARGET) * 100));

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-paper-mute sm:inline">{session.full_name}</span>
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">Administración de contenido</h1>
            <p className="mt-1 text-sm text-paper-mute">Sube y organiza el contenido de cada creadora.</p>
          </div>
          {/* Creator selector */}
          <label className="relative">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-paper-dim">Creadora</span>
            <div className="relative">
              <select
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="appearance-none rounded-xl border border-line bg-card py-2.5 pl-4 pr-10 text-sm text-paper outline-none focus:border-brand/60"
              >
                {CREATORS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-paper-dim" />
            </div>
          </label>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-2 border-b border-line">
          {[
            { id: 'lora', label: 'Set de LoRA (80 fotos)' },
            { id: 'deliver', label: 'Entregar contenido' },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`relative -mb-px px-4 py-3 text-sm font-medium transition-colors ${
                tab === tb.id ? 'text-brand' : 'text-paper-mute hover:text-paper'
              }`}
            >
              {tb.label}
              {tab === tb.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {/* LoRA tab */}
        {tab === 'lora' && (
          <div className="mt-6">
            <div className="mb-5 rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium text-paper">
                  <Sparkles size={18} className="text-brand" />
                  Set de entrenamiento para {activeCreator?.name}
                </div>
                <span className={`font-mono text-sm ${loraDone ? 'text-brand' : 'text-paper-mute'}`}>
                  {lora.files.length} / {LORA_TARGET} fotos
                </span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-2">
                <div className={`h-full rounded-full transition-all duration-300 ${loraDone ? 'bg-brand' : 'bg-brand/70'}`} style={{ width: `${loraPct}%` }} />
              </div>
              <p className="mt-3 text-sm text-paper-mute">
                Higgsfield pide <strong className="text-paper">80 fotos</strong> para entrenar el clon (LoRA). Sube fotos variadas: rostro, cuerpo, ángulos, luz e outfits distintos.
              </p>
              {loraDone ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2.5 text-sm font-semibold text-brand">
                  <Check size={16} /> Set completo — listo para enviar a Higgsfield
                </div>
              ) : (
                <p className="mt-4 text-sm text-paper-dim">Faltan {LORA_TARGET - lora.files.length} fotos.</p>
              )}
            </div>

            <DropZone
              onFiles={lora.add}
              accept="image/*"
              label="Arrastra las fotos aquí o haz clic para elegir"
              sub="JPG o PNG · puedes seleccionar varias a la vez"
            />

            {lora.files.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
                {lora.files.map((f) => <Thumb key={f.id} file={f} onRemove={lora.remove} />)}
              </div>
            )}
          </div>
        )}

        {/* Deliver tab */}
        {tab === 'deliver' && (
          <div className="mt-6">
            <div className="mb-5 rounded-2xl border border-line bg-card p-5">
              <div className="flex items-center gap-2 font-medium text-paper">
                <ImagePlus size={18} className="text-brand" />
                Contenido entregado a {activeCreator?.name}
              </div>
              <p className="mt-2 text-sm text-paper-mute">
                Sube fotos y videos finales. Es lo que la creadora verá en su portal, listo para vender.
              </p>
            </div>

            <DropZone
              onFiles={deliver.add}
              accept="image/*,video/*"
              label="Arrastra fotos o videos aquí"
              sub="Fotos (JPG/PNG) y videos cortos (MP4)"
            />

            {deliver.files.length > 0 && (
              <>
                <div className="mt-5 flex items-center gap-2 text-sm text-paper-mute">
                  <Film size={15} className="text-brand" /> {deliver.files.length} archivo(s) listos para entregar
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                  {deliver.files.map((f) => <Thumb key={f.id} file={f} onRemove={deliver.remove} />)}
                </div>
                <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]">
                  <Check size={16} /> Publicar en el portal de {activeCreator?.name}
                </button>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

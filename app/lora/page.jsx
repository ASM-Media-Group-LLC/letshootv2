'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, X, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { getSession, logout } from '@/lib/portalAuth';
import { LORA_TARGET, LORA_CATEGORIES, LORA_DOS, LORA_DONTS } from '@/lib/loraSpec';
import Logo from '@/components/Logo';

function CategoryCard({ cat, files, onFiles, onRemove }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const done = files.length >= cat.target;
  return (
    <div className={`rounded-2xl border p-5 ${done ? 'border-brand/40 bg-brand/[0.05]' : 'border-line bg-card'}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-paper">{cat.name}</h3>
        <span className={`font-mono text-sm ${done ? 'text-brand' : 'text-paper-mute'}`}>
          {files.length}/{cat.target}{done && <Check size={14} className="ml-1 inline" />}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-paper-mute">{cat.tip}</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onFiles(cat.id, e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 text-sm transition-colors ${
          over ? 'border-brand bg-brand/10 text-paper' : 'border-line text-paper-dim hover:border-brand/50 hover:text-paper'
        }`}
      >
        <UploadCloud size={18} className="text-brand" /> Subir fotos
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) onFiles(cat.id, e.target.files); e.target.value = ''; }} />
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-md border border-line">
              <img src={f.url} alt="" className="aspect-square w-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); onRemove(cat.id, f.id); }}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-ink/80 text-paper opacity-0 group-hover:opacity-100" aria-label="Quitar">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LoraPage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined);
  const [byCat, setByCat] = useState({}); // { catId: [{id,url}] }

  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace('/login'); return; }
    setSession(s);
  }, [router]);

  if (session === undefined) return <div className="grid min-h-[100svh] place-items-center bg-ink text-paper-dim">Cargando…</div>;
  if (!session) return null;

  function addFiles(catId, fileList) {
    const added = Array.from(fileList).map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, url: URL.createObjectURL(f) }));
    setByCat((prev) => ({ ...prev, [catId]: [...(prev[catId] || []), ...added] }));
  }
  function removeFile(catId, id) {
    setByCat((prev) => ({ ...prev, [catId]: (prev[catId] || []).filter((f) => f.id !== id) }));
  }

  const total = Object.values(byCat).reduce((n, arr) => n + arr.length, 0);
  const pct = Math.min(100, Math.round((total / LORA_TARGET) * 100));
  const done = total >= LORA_TARGET;

  return (
    <div className="min-h-[100svh] bg-ink text-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-paper-mute hover:text-paper" aria-label="Volver"><ArrowLeft size={18} /></button>
            <Logo size="sm" />
          </div>
          <button onClick={() => { logout(); router.replace('/login'); }} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute hover:text-paper">Salir</button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center gap-2 text-brand"><Sparkles size={18} /><span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Tu clon IA (LoRA)</span></div>
        <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Sube tus fotos para crear tu clon</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-paper-mute">
          Necesitamos <strong className="text-paper">{LORA_TARGET} fotos tuyas</strong>, repartidas por tipo. Entre mejor variedad, mejor te clona la IA.
        </p>

        {/* Progress */}
        <div className="sticky top-[68px] z-10 mt-6 rounded-2xl border border-line bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-paper">Progreso total</span>
            <span className={`font-mono ${done ? 'text-brand' : 'text-paper-mute'}`}>{total} / {LORA_TARGET}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-2">
            <div className={`h-full rounded-full transition-all ${done ? 'bg-brand' : 'bg-brand/70'}`} style={{ width: `${pct}%` }} />
          </div>
          {done && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm font-semibold text-brand">
              <Check size={16} /> ¡Listo! Ya podemos entrenar tu clon.
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {LORA_CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} files={byCat[cat.id] || []} onFiles={addFiles} onRemove={removeFile} />
          ))}
        </div>

        {/* Do / Don't */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand/30 bg-brand/[0.05] p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-paper"><Check size={16} className="text-brand" /> Sí</h3>
            <ul className="mt-3 space-y-2">
              {LORA_DOS.map((d, i) => (
                <li key={i} className="flex gap-2 text-[13.5px] text-paper-mute"><Check size={15} className="mt-0.5 shrink-0 text-brand" />{d}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.05] p-5">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-paper"><X size={16} className="text-rose-400" /> No</h3>
            <ul className="mt-3 space-y-2">
              {LORA_DONTS.map((d, i) => (
                <li key={i} className="flex gap-2 text-[13.5px] text-paper-mute"><X size={15} className="mt-0.5 shrink-0 text-rose-400" />{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

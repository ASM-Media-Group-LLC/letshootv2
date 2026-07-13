'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud, X, Check, Sparkles, ArrowLeft,
  ScanFace, Camera, PersonStanding, RotateCcw, Smile, Sun, Shirt,
} from 'lucide-react';
import { getSession, logout } from '@/lib/portalAuth';
import { LORA_TARGET, LORA_CATEGORIES, LORA_DOS, LORA_DONTS } from '@/lib/loraSpec';
import Logo from '@/components/Logo';

const CAT_ICONS = {
  face: ScanFace,
  bust: Camera,
  full: PersonStanding,
  angles: RotateCcw,
  expressions: Smile,
  lighting: Sun,
  outfits: Shirt,
};

function CategoryCard({ cat, files, onFiles, onRemove }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const done = files.length >= cat.target;
  const Icon = CAT_ICONS[cat.id] || Camera;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 ${
        done
          ? 'border-brand/45 bg-gradient-to-b from-brand/[0.1] to-brand/[0.02] shadow-glow-sm'
          : 'border-line bg-gradient-to-b from-card to-ink-2/50 hover:border-brand/30'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-colors ${
          done ? 'bg-brand/20 text-brand ring-brand/40' : 'bg-brand/12 text-brand ring-brand/25'
        }`}>
          <Icon size={20} strokeWidth={1.85} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold text-paper">{cat.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              done ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line bg-ink-2 text-paper-mute'
            }`}>
              {files.length}/{cat.target}{done && <Check size={12} />}
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-paper-mute">{cat.tip}</p>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files?.length) onFiles(cat.id, e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3.5 text-sm font-medium transition-colors ${
          over ? 'border-brand bg-brand/10 text-paper' : 'border-line text-paper-dim hover:border-brand/50 hover:text-paper'
        }`}
      >
        <UploadCloud size={17} className="text-brand" /> Subir fotos
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { if (e.target.files?.length) onFiles(cat.id, e.target.files); e.target.value = ''; }} />
      </div>

      {files.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-md border border-line">
              <img src={f.url} alt="" className="aspect-square w-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); onRemove(cat.id, f.id); }}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-ink/80 text-paper opacity-0 backdrop-blur group-hover:opacity-100" aria-label="Quitar">
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
  const [byCat, setByCat] = useState({});

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
    <div className="relative min-h-[100svh] overflow-hidden bg-ink text-paper">
      <div className="blob left-1/2 top-16 h-[420px] w-[560px] -translate-x-1/2 bg-brand/10" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-paper-mute hover:text-paper" aria-label="Volver"><ArrowLeft size={18} /></button>
            <Logo size="sm" />
          </div>
          <button onClick={() => { logout(); router.replace('/login'); }} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">Salir</button>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 py-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-hair/5 px-3.5 py-1.5 text-brand">
          <Sparkles size={15} />
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]">Tu clon IA · LoRA</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.1] [text-wrap:balance] sm:text-4xl">
          Sube tus <span className="text-brand">80 fotos</span> para crear tu clon
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-paper-mute">
          Son <strong className="text-paper">80 fotos en total</strong>, repartidas por tipo (mira el objetivo de cada bloque abajo). Entre mejor variedad, mejor te clona la IA.
        </p>

        {/* Progress */}
        <div className={`sticky top-[68px] z-20 mt-7 rounded-2xl border p-4 backdrop-blur transition-colors ${
          done ? 'border-brand/45 bg-brand/[0.08] shadow-glow-sm' : 'border-line bg-card/95'
        }`}>
          <div className="flex items-end justify-between">
            <span className="text-sm font-medium text-paper">Progreso total</span>
            <span className="font-display leading-none">
              <span className={`text-3xl font-bold ${done ? 'text-brand' : 'text-paper'}`}>{total}</span>
              <span className="text-lg text-paper-dim"> / {LORA_TARGET} fotos</span>
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-2">
            <div className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-brand shadow-[0_0_16px_rgb(var(--brand,0_177_246))]' : 'bg-brand/70'}`} style={{ width: `${pct}%` }} />
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
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand/30 bg-gradient-to-b from-brand/[0.08] to-transparent p-5">
            <h3 className="flex items-center gap-2.5 font-display text-base font-semibold text-paper">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 text-brand ring-1 ring-brand/25"><Check size={16} /></span>
              Sí
            </h3>
            <ul className="mt-4 space-y-2.5">
              {LORA_DOS.map((d, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] text-paper-mute"><Check size={15} className="mt-0.5 shrink-0 text-brand" />{d}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-500/[0.08] to-transparent p-5">
            <h3 className="flex items-center gap-2.5 font-display text-base font-semibold text-paper">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/25"><X size={16} /></span>
              No
            </h3>
            <ul className="mt-4 space-y-2.5">
              {LORA_DONTS.map((d, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] text-paper-mute"><X size={15} className="mt-0.5 shrink-0 text-rose-400" />{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

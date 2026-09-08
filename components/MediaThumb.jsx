'use client';

// Miniatura de foto o video para las galerías del portal (equipo, creadora,
// agencia). Los videos son INTERACTIVOS: muestran un botón grande de play
// centrado y, al pasar el mouse encima, arrancan solos en mute (como en TikTok
// o Instagram). Al salir se pausan y vuelven al inicio.
// Uso: <MediaThumb asset={a} src={srcOf(a)} className="aspect-[3/4]" />
// El consumidor decide qué pasa al hacer click (abrir lightbox, seleccionar…).

import { useEffect, useRef, useState } from 'react';
import { Play, Pencil } from 'lucide-react';

export default function MediaThumb({ asset, src, className = 'aspect-[3/4] w-full object-cover', imgClassName = '' }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  if (asset?.type !== 'video') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={asset?.title || ''} loading="lazy" className={`${className} ${imgClassName}`} />;
  }

  function enter() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.then === 'function') p.then(() => setPlaying(true)).catch(() => {});
  }
  function leave() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  }

  return (
    <div className="relative h-full w-full" onMouseEnter={enter} onMouseLeave={leave}>
      <video ref={videoRef} src={src} className={className} muted playsInline preload="metadata" />
      {/* Botón grande de PLAY centrado — se atenúa cuando el video corre */}
      <div className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${playing ? 'opacity-0' : 'opacity-100'}`}>
        <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur">
          <Play size={22} strokeWidth={2.5} className="translate-x-[1px]" fill="currentColor" />
        </span>
      </div>
    </div>
  );
}

// Lightbox universal: modal fullscreen con la pieza en grande. Para videos
// entra con controles nativos + autoplay + loop; para fotos, la imagen a todo
// el alto disponible. Esc o click en el fondo cierra.
// Si se pasa `onRename(asset, nuevoTitulo)`, el título se vuelve editable
// (solo el equipo interno lo pasa; para la creadora queda de solo lectura).
export function MediaLightbox({ asset, src, onClose, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setEditing(false); setSaving(false); setDraft(asset?.title || ''); }, [asset?.id]);
  if (!asset) return null;
  const canEdit = typeof onRename === 'function';

  async function save() {
    if (saving) return;
    setSaving(true);
    try { await onRename(asset, draft.trim()); setEditing(false); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={onClose}>
      {/* Cerrar — botón X grande y contrastado. También cierra tocando el fondo o Esc. */}
      <button onClick={onClose}
        className="fixed right-3 top-3 z-[90] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-black/80 text-white shadow-2xl backdrop-blur transition-transform hover:scale-105 hover:bg-white/15 sm:right-5 sm:top-5"
        aria-label="Cerrar">
        <span className="text-2xl font-light leading-none">×</span>
      </button>
      <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {asset.type === 'video'
          ? <video src={src} className="max-h-[92vh] max-w-[92vw] rounded-xl bg-black object-contain shadow-2xl" controls autoPlay loop playsInline />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={src} alt={asset.title || ''} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />}
        {(asset.title || asset.deliver_date || canEdit) && (
          <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            {canEdit && editing ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setDraft(asset.title || ''); } }}
                  placeholder="Título de la foto" maxLength={120}
                  className="min-w-0 flex-1 rounded-lg border border-white/25 bg-black/60 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/60" />
                <button onClick={save} disabled={saving} className="shrink-0 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white disabled:opacity-50">{saving ? '…' : 'Guardar'}</button>
                <button onClick={() => { setEditing(false); setDraft(asset.title || ''); }} className="shrink-0 rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white/80 transition-colors hover:text-white">Cancelar</button>
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${asset.title ? 'text-white' : 'italic text-white/50'}`}>{asset.title || 'Sin título'}</p>
                  {asset.deliver_date && <p className="text-[11px] text-white/70">{new Date(asset.deliver_date).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                </div>
                {canEdit && (
                  <button onClick={() => { setDraft(asset.title || ''); setEditing(true); }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/25 bg-black/50 px-2.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/10">
                    <Pencil size={12} /> Renombrar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

// AudioCard — reproductor de audio compartido estilo WhatsApp/iMessage.
// API (contrato fijo — la consumen /trabajo, /panel y /agencia tal cual):
//   <AudioCard src={signedUrl} title={string} date={isoString|null}
//              canDownload={bool} onRename={fn|null} onDelete={fn|null} />
// · onRename(nuevoTitulo) / onDelete() — si son null, esas acciones no se muestran.
// · canDownload muestra/oculta el botón de bajar (equipo sí; creadora/agencia no).
// · Un solo audio suena a la vez en toda la página: al dar play se emite el
//   evento window 'ls-audio-play' con el id del card y los demás se pausan.
// Mobile-first: play grande (44px), ondas clickeables para saltar (seek).

import { useEffect, useId, useRef, useState } from 'react';
import { Play, Pause, Download, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

const BARS = 28;
// Alturas DETERMINISTAS (hash seno por índice) — nada de Math.random en el
// render para no provocar hydration mismatch entre servidor y cliente.
const HEIGHTS = Array.from({ length: BARS }, (_, i) => {
  const v = Math.abs(Math.sin((i + 1) * 12.9898) * 43758.5453) % 1;
  return 0.28 + v * 0.72;
});

function fmt(s) {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function AudioCard({ src, title, date, canDownload, onRename, onDelete }) {
  const id = useId();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState(0);   // duración — del metadata del archivo
  const [cur, setCur] = useState(0);   // tiempo actual
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState('');

  // Si otro AudioCard empieza a sonar, este se pausa (un audio a la vez).
  useEffect(() => {
    function onOther(e) {
      const a = audioRef.current;
      if (e.detail !== id && a && !a.paused) a.pause();
    }
    window.addEventListener('ls-audio-play', onOther);
    return () => window.removeEventListener('ls-audio-play', onOther);
  }, [id]);

  function toggle() {
    const a = audioRef.current;
    if (!a || !src) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent('ls-audio-play', { detail: id }));
      a.play().catch(() => {});
    } else a.pause();
  }

  function onLoaded() {
    const a = audioRef.current;
    if (!a) return;
    if (isFinite(a.duration)) { setDur(a.duration); return; }
    // Algunos formatos grabados (webm/ogg) reportan Infinity en el metadata:
    // se fuerza la duración saltando al final y volviendo al inicio.
    const fix = () => {
      a.removeEventListener('timeupdate', fix);
      a.currentTime = 0;
      if (isFinite(a.duration)) setDur(a.duration);
    };
    a.addEventListener('timeupdate', fix);
    try { a.currentTime = 1e101; } catch { a.removeEventListener('timeupdate', fix); }
  }

  // Seek proporcional tocando/clickeando las ondas.
  function seek(e) {
    const a = audioRef.current;
    if (!a || !isFinite(dur) || dur <= 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX) - r.left;
    const t = Math.min(dur, Math.max(0, (x / r.width) * dur));
    a.currentTime = t;
    setCur(t);
  }

  function startEdit() { setDraft(title || ''); setEditing(true); }
  async function saveRename(e) {
    e.preventDefault();
    if (!onRename) return;
    const t = draft.trim();
    if (!t || t === title) { setEditing(false); return; }
    setBusy('rename');
    try { await onRename(t); } finally { setBusy(''); setEditing(false); }
  }
  async function doDelete() {
    if (!onDelete || busy) return;
    if (!window.confirm('¿Eliminar este audio? No se puede deshacer.')) return;
    setBusy('delete');
    try { await onDelete(); } finally { setBusy(''); }
  }

  // Descarga real (la signed URL es cross-origin y el atributo download solo
  // no basta): baja el blob y lo guarda con el título como nombre de archivo.
  async function downloadIt(e) {
    e.preventDefault();
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      let ext = '';
      try {
        const p = new URL(src).pathname.split('.').pop();
        if (p && /^[a-z0-9]{2,5}$/i.test(p)) ext = `.${p.toLowerCase()}`;
      } catch { /* sin extensión */ }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(title || 'audio').trim() || 'audio'}${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch { window.open(src, '_blank', 'noreferrer'); }
  }

  const frac = dur > 0 ? Math.min(1, cur / dur) : 0;
  const playedBars = Math.floor(frac * BARS + 1e-4);
  const actionCls = 'grid h-9 w-9 place-items-center rounded-lg border border-line bg-ink-2 text-paper-dim transition-colors hover:border-brand/40 hover:text-paper';

  return (
    <div className="card3d rounded-2xl border border-line bg-card p-3">
      <style>{'@keyframes lsAudioEq{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}'}</style>

      {/* Título + fecha + acciones */}
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <form onSubmit={saveRename} className="flex min-w-0 flex-1 items-center gap-1.5">
            <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-sm text-paper outline-none focus:border-brand/60" />
            <button type="submit" disabled={busy === 'rename'} title="Guardar título"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-on-accent disabled:opacity-60">
              {busy === 'rename' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button type="button" onClick={() => setEditing(false)} title="Cancelar"
              className={`${actionCls} shrink-0`}><X size={14} /></button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-paper">{title || 'Audio'}</p>
              {date && (
                <p className="text-[10px] text-paper-dim">
                  {new Date(date).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {onRename && (
                <button type="button" onClick={startEdit} title="Renombrar" className={actionCls}>
                  <Pencil size={14} />
                </button>
              )}
              {canDownload && src && (
                <a href={src} download onClick={downloadIt} title="Descargar" className={actionCls}>
                  <Download size={14} />
                </a>
              )}
              {onDelete && (
                <button type="button" onClick={doDelete} disabled={busy === 'delete'} title="Eliminar"
                  className={`${actionCls} hover:border-rose-500/50 hover:text-rose-300 disabled:opacity-60`}>
                  {busy === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Play + ondas (progreso + seek) + tiempos */}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={toggle} disabled={!src}
          title={playing ? 'Pausar' : 'Reproducir'}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-on-accent shadow-glow-sm transition-transform active:scale-95 disabled:opacity-50">
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div onClick={seek} role="slider" aria-label="Posición del audio"
            aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(cur)}
            className="flex h-10 cursor-pointer touch-none items-center gap-[3px]">
            {HEIGHTS.map((h, i) => (
              <span key={i}
                className={`min-w-0 flex-1 rounded-full ${i < playedBars ? 'bg-brand' : 'bg-paper-dim/30'}`}
                style={{
                  height: `${Math.round(h * 100)}%`,
                  transformOrigin: 'center',
                  animation: playing ? `lsAudioEq ${(0.9 + (i % 4) * 0.15).toFixed(2)}s ease-in-out ${((i % 5) * 0.1).toFixed(1)}s infinite` : 'none',
                }} />
            ))}
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-paper-dim">
            <span>{fmt(cur)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={src || undefined} preload="metadata" hidden
        onLoadedMetadata={onLoaded}
        onTimeUpdate={() => setCur(audioRef.current?.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCur(0); }} />
    </div>
  );
}

'use client';

// Miniatura de foto o video para las galerías del portal (equipo, creadora,
// agencia). Los videos son INTERACTIVOS: muestran un botón grande de play
// centrado y, al pasar el mouse encima, arrancan solos en mute (como en TikTok
// o Instagram). Al salir se pausan y vuelven al inicio.
// Uso: <MediaThumb asset={a} src={srcOf(a)} className="aspect-[3/4]" />
// El consumidor decide qué pasa al hacer click (abrir lightbox, seleccionar…).

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

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
export function MediaLightbox({ asset, src, onClose }) {
  if (!asset) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-black/50 text-white transition-colors hover:bg-white/10" aria-label="Cerrar">
        <span className="text-lg leading-none">×</span>
      </button>
      <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {asset.type === 'video'
          ? <video src={src} className="max-h-[92vh] max-w-[92vw] rounded-xl bg-black object-contain shadow-2xl" controls autoPlay loop playsInline />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={src} alt={asset.title || ''} className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-2xl" />}
        {(asset.title || asset.deliver_date) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/70 to-transparent p-4">
            {asset.title && <p className="text-sm font-medium text-white">{asset.title}</p>}
            {asset.deliver_date && <p className="text-[11px] text-white/70">{new Date(asset.deliver_date).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

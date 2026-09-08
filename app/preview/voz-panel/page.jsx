'use client';

// ─────────────────────────────────────────────────────────────────────────
// "Mi voz" — DEMO de lo que ve la CREADORA (Julia) sobre su voz clonada.
//
// Patrón espejo de app/p/demo (lo que ve el receptor de una propuesta):
// comparte estado por localStorage con el panel del EQUIPO.
//
// CONTRATO localStorage — key 'ls_voz_demo':
//   { v:1, creators: { julia: { cloned:bool, consent:bool, consentAt?:iso,
//                               clips:[{ id, type, text, lang, url, dur, at }] } } }
//
//   · Lo ESCRIBE /preview/voz-admin (el equipo genera todos los audios).
//   · Este panel SOLO LEE… con una excepción: la creadora puede otorgar su
//     consentimiento desde acá (setea consent=true), porque es su decisión.
//
// La creadora VE TODO lo que se hace con su voz — transparencia total.
// Si no hay nada en localStorage (entrada directa) se muestra un estado demo
// con audios de ejemplo (con audio generado real para que el player funcione).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Check, Volume2 } from 'lucide-react';
import Logo from '@/components/Logo';
import StatusDot from '@/components/StatusDot';

const STORE_KEY = 'ls_voz_demo';
const CREATOR = 'julia';

// Tipo de audio → dot de color (estilo StatusDot, nunca pill outline+tint).
// El "enganche" es lo central del producto → color de marca.
const TYPE_META = {
  // Vocabulario del equipo (voz-admin) — fuente de verdad
  bienvenida:    { tone: 'brand', label: 'Bienvenida' },
  ppv:           { tone: 'ok',    label: 'PPV' },
  coqueto:       { tone: 'warn',  label: 'Coqueto' },
  explicito:     { tone: 'bad',   label: 'Explícito' },
  personalizado: { tone: 'warn',  label: 'Personalizado' },
  // Alias antiguos por compatibilidad con clips demo previos
  enganche:      { tone: 'brand', label: 'Bienvenida' },
  venta:         { tone: 'ok',    label: 'PPV' },
  saludo:        { tone: 'zinc',  label: 'Saludo' },
};
const typeMeta = (t) => TYPE_META[t] || { tone: 'zinc', label: t || 'Audio' };

const LANGS = { es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', de: 'Alemán', it: 'Italiano', ru: 'Ruso' };
const langLabel = (l) => LANGS[l] || (l ? String(l).toUpperCase() : '—');

function fmtDate(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDur(s) {
  // El equipo (voz-admin) guarda dur ya formateado como 'm:ss'.
  if (typeof s === 'string' && /^\d+:\d{2}$/.test(s)) return s;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const m = Math.floor(n / 60);
  const sec = Math.floor(n % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Clips de ejemplo (deterministas; url se rellena en cliente) ────────────
const DEMO_CLIPS = [
  {
    id: 'v1', type: 'enganche', lang: 'es', dur: 14, at: '2026-09-05T16:20:00Z', freq: 196, url: '',
    text: 'Hola amor… sé que estuviste todo el día pensando en mí. Te dejé algo especial esperándote adentro.',
  },
  {
    id: 'v2', type: 'venta', lang: 'en', dur: 9, at: '2026-09-04T21:05:00Z', freq: 233, url: '',
    text: 'This one is just for you, baby. Unlock it and let me tell you the rest…',
  },
  {
    id: 'v3', type: 'saludo', lang: 'es', dur: 6, at: '2026-09-02T13:40:00Z', freq: 174, url: '',
    text: '¡Feliz cumple, Martín! Un beso enorme de mi parte para vos.',
  },
];

const DEMO_STORE = {
  v: 1,
  creators: {
    [CREATOR]: {
      cloned: true,
      consent: true,
      consentAt: '2026-08-30T10:00:00Z',
      clips: DEMO_CLIPS.map((c) => ({ ...c })),
    },
  },
};

// Genera un tono suave como WAV data-URI — así el <audio controls> del demo
// reproduce algo real sin depender de la red (los audios reales llegan por url).
function toneWav(seconds = 3, freq = 200) {
  const rate = 8000;
  const n = Math.floor(rate * seconds);
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const w = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); w(8, 'WAVE');
  w(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 4) * Math.min(1, (seconds - t) * 2); // fade in/out
    const vib = 1 + 0.02 * Math.sin(2 * Math.PI * 5 * t);
    const v = Math.sin(2 * Math.PI * freq * vib * t) * 0.09 * env;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true);
  }
  const u8 = new Uint8Array(buf);
  let bin = '';
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) bin += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export default function VozPanel() {
  const [store, setStore] = useState(null);

  useEffect(() => {
    let next = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.creators && parsed.creators[CREATOR]) next = parsed;
      }
    } catch {}
    if (!next) {
      // Estado demo con audio generado para que se vea (y suene) lleno.
      next = {
        ...DEMO_STORE,
        creators: {
          ...DEMO_STORE.creators,
          [CREATOR]: {
            ...DEMO_STORE.creators[CREATOR],
            clips: DEMO_CLIPS.map((c) => ({ ...c, url: c.url || toneWav(3, c.freq) })),
          },
        },
      };
    }
    setStore(next);
  }, []);

  const creator = store?.creators?.[CREATOR] || null;
  const cloned = !!creator?.cloned;
  const consent = !!creator?.consent;
  const consentAt = creator?.consentAt;
  const clips = Array.isArray(creator?.clips) ? creator.clips : [];

  const giveConsent = () => {
    if (!store) return;
    const cur = store.creators?.[CREATOR] || {};
    const next = {
      ...store,
      v: 1,
      creators: {
        ...store.creators,
        [CREATOR]: { ...cur, consent: true, consentAt: cur.consentAt || new Date().toISOString() },
      },
    };
    setStore(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Header simple (PortalHeader-like, sin auth) */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="hidden text-xs text-paper-mute sm:inline">Portal de la creadora</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-hair/10 text-[11px] font-semibold text-paper">JP</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        {!store ? (
          <div className="py-24 text-center text-sm text-paper-mute">Cargando tu voz…</div>
        ) : (
          <>
            {/* Cabecera + estado */}
            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-brand">
              LetShoot · Voz
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Mi voz</h1>
              <StatusDot tone={cloned ? 'ok' : 'warn'} size="md" pulse={!cloned}>
                {cloned ? 'Tu voz está clonada' : 'Aún no clonada'}
              </StatusDot>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-paper-mute">
              Acá ves, con total transparencia, todo lo que el equipo crea con tu voz clonada:
              audios de <span className="text-paper">enganche</span> para atraer y retener fans, y
              audios para <span className="text-paper">vender</span> directo. Vos tenés el control.
            </p>

            {/* Consentimiento */}
            {!consent ? (
              <div className="card3d mt-8 rounded-2xl border border-line bg-card p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
                    <ShieldCheck size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold">Autorizá la clonación de tu voz</h2>
                    <p className="mt-1 text-sm leading-relaxed text-paper-mute">
                      Para crear audios con tu voz necesitamos tu consentimiento. Vas a poder ver y
                      escuchar cada audio que se genere — siempre, sin excepción.
                    </p>
                    <button
                      type="button"
                      onClick={giveConsent}
                      className="btn3d mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                    >
                      <Check size={16} /> Doy mi consentimiento
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 inline-flex items-center gap-2 text-xs text-paper-mute">
                <Check size={14} className="text-emerald-400" />
                <span>Consentimiento otorgado{consentAt ? ` · ${fmtDate(consentAt)}` : ''}</span>
              </div>
            )}

            {/* Transparencia — audios hechos con su voz */}
            <section className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Audios hechos con tu voz</h2>
                {clips.length > 0 && (
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-dim">
                    {clips.length} {clips.length === 1 ? 'audio' : 'audios'}
                  </span>
                )}
              </div>

              {clips.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-card/40 px-6 py-14 text-center">
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-hair/10 text-paper-mute">
                    <Volume2 size={22} />
                  </span>
                  <div className="font-display text-base font-semibold">Todavía no hay audios</div>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-paper-mute">
                    Cuando el equipo cree audios con tu voz, van a aparecer todos acá para que los escuches.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {clips.map((c) => (
                    <ClipCard key={c.id} clip={c} />
                  ))}
                </ul>
              )}
            </section>

            {/* Nota de confianza */}
            <div className="mt-10 flex items-start gap-2.5 rounded-2xl border border-line bg-card/40 px-4 py-3.5 text-sm text-paper-mute">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
              <span>Todo lo que se crea con tu voz aparece acá. Vos tenés el control.</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ClipCard({ clip }) {
  const meta = typeMeta(clip.type);
  const dur = fmtDur(clip.dur);
  return (
    <li className="card3d rounded-2xl border border-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11px] text-paper-dim">
        <StatusDot tone={meta.tone}>{meta.label}</StatusDot>
        <span className="h-0.5 w-0.5 rounded-full bg-paper-dim" />
        <span>{langLabel(clip.lang)}</span>
        <span className="h-0.5 w-0.5 rounded-full bg-paper-dim" />
        <span>{fmtDate(clip.at)}</span>
        {dur && (
          <>
            <span className="h-0.5 w-0.5 rounded-full bg-paper-dim" />
            <span>{dur}</span>
          </>
        )}
      </div>

      {clip.text && (
        <p className="mt-2.5 text-[15px] leading-relaxed text-paper">
          <span className="text-paper-dim">“</span>{clip.text}<span className="text-paper-dim">”</span>
        </p>
      )}

      <audio controls src={clip.url} className="mt-3 h-10 w-full">
        Tu navegador no puede reproducir este audio.
      </audio>
    </li>
  );
}

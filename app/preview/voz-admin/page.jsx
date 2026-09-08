'use client';

// ─────────────────────────────────────────────────────────────────────────
// Panel del EQUIPO para gestionar la VOZ CLONADA de las creadoras (DEMO/mock,
// sin backend). Espejo del módulo de propuestas: acá el operador sube el clip
// de referencia, deja constancia del consentimiento y GENERA los audios; la
// vista de la creadora /preview/voz-panel lee el MISMO estado desde
// localStorage ('ls_voz_demo') para ver todo lo que se hace con su voz.
//
// La voz es CONTENIDO DE ENGANCHE: audios para enganchar fans, traer tráfico
// y sumar/retener suscriptores, además de vender directo.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Eye, ExternalLink, UploadCloud, Mic, Sparkles, Wand2,
  Download, Trash2, Check, AudioLines, RefreshCw,
} from 'lucide-react';
import StatusDot from '@/components/StatusDot';

const STORE_KEY = 'ls_voz_demo';
const LAN_HOST = '10.0.0.67:3001';

// Audio de ejemplo: WAV silencioso de 1s embebido como data-URI. Es un mock,
// así que no depende de red y el <audio controls> siempre reproduce/scrubbea.
const SAMPLE_AUDIO = 'data:audio/wav;base64,UklGRmQfAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAfAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

const CREATORS = [
  { id: 'julia',  name: 'Julia Parker', agency: 'Kash',            seed: 'jp' },
  { id: 'monica', name: 'Mónica Rivas', agency: 'Kash',            seed: 'mr' },
  { id: 'nadia',  name: 'Nadia Torres', agency: 'LetShoot Direct', seed: 'nt' },
];

// Etiquetas/tipos de audio, cada una con su dot de color (estilo StatusDot).
const TYPES = [
  { id: 'bienvenida',    label: 'Bienvenida',    dot: 'bg-brand' },
  { id: 'ppv',           label: 'PPV',           dot: 'bg-emerald-400' },
  { id: 'coqueto',       label: 'Coqueto',       dot: 'bg-amber-400' },
  { id: 'explicito',     label: 'Explícito',     dot: 'bg-rose-500' },
  { id: 'personalizado', label: 'Personalizado', dot: 'bg-paper-mute' },
];
const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.id, t]));

const LANGS = [
  { id: 'es', flag: '🇪🇸', label: 'ES' },
  { id: 'en', flag: '🇺🇸', label: 'EN' },
  { id: 'pt', flag: '🇧🇷', label: 'PT' },
  { id: 'fr', flag: '🇫🇷', label: 'FR' },
  { id: 'de', flag: '🇩🇪', label: 'DE' },
  { id: 'it', flag: '🇮🇹', label: 'IT' },
];

const avatar = (seed) => `https://picsum.photos/seed/${seed}/96/96`;
const genId = () => `v-${Math.random().toString(36).slice(2, 9)}`;

// Duración estimada a partir del texto (~14 caracteres/seg), para el mock.
const estDur = (text) => {
  const secs = Math.max(4, Math.round((text || '').trim().length / 14));
  return `0:${String(secs).padStart(2, '0')}`;
};

// Formateo determinista de la fecha ISO (evita mismatch SSR/CSR): lee las
// partes UTC del string, sin toLocale ni desfase de zona horaria.
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} · ${m[4]}:${m[5]}`;
};

// Estado semilla: Julia ya tiene voz clonada + un catálogo inicial; las otras
// arrancan sin voz. Fechas fijas (deterministas) para el render inicial.
const makeDefault = () => ({
  v: 1,
  creators: {
    julia: {
      cloned: true,
      consent: true,
      clips: [
        { id: 'seed-1', type: 'bienvenida', text: 'Hola amor, qué bueno tenerte por acá… te preparé algo que sé que te va a encantar, quedate cerca.', lang: 'es', url: SAMPLE_AUDIO, dur: '0:11', at: '2026-09-06T14:20:00.000Z' },
        { id: 'seed-2', type: 'ppv', text: 'Acabo de subir algo muy especial a tu bandeja privada… no te lo pierdas, es solo para vos.', lang: 'es', url: SAMPLE_AUDIO, dur: '0:08', at: '2026-09-06T16:05:00.000Z' },
        { id: 'seed-3', type: 'coqueto', text: 'Estuve pensando en vos todo el día… ¿me extrañaste tanto como yo a vos?', lang: 'es', url: SAMPLE_AUDIO, dur: '0:06', at: '2026-09-06T19:40:00.000Z' },
        { id: 'seed-4', type: 'bienvenida', text: 'Hey babe, so glad you subscribed… I made something just for you, stay close.', lang: 'en', url: SAMPLE_AUDIO, dur: '0:10', at: '2026-09-07T10:15:00.000Z' },
      ],
    },
    monica: { cloned: false, consent: false, clips: [] },
    nadia:  { cloned: false, consent: false, clips: [] },
  },
});

// Normaliza/valida lo leído de localStorage contra el shape esperado.
const hydrate = (raw) => {
  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !d.creators) return null;
    const base = makeDefault();
    for (const c of CREATORS) {
      const src = d.creators[c.id];
      if (!src) continue;
      base.creators[c.id] = {
        cloned: Boolean(src.cloned),
        consent: Boolean(src.consent),
        ...(typeof src.consentAt === 'string' ? { consentAt: src.consentAt } : {}),
        clips: Array.isArray(src.clips)
          ? src.clips.map((x) => ({
              id: typeof x.id === 'string' ? x.id : genId(),
              type: TYPE_MAP[x.type] ? x.type : 'personalizado',
              text: typeof x.text === 'string' ? x.text : '',
              lang: LANGS.some((l) => l.id === x.lang) ? x.lang : 'es',
              url: typeof x.url === 'string' ? x.url : SAMPLE_AUDIO,
              dur: typeof x.dur === 'string' ? x.dur : '0:00',
              at: typeof x.at === 'string' ? x.at : new Date().toISOString(),
            }))
          : [],
      };
    }
    return base;
  } catch {
    return null;
  }
};

export default function VozAdmin() {
  const [store, setStore] = useState(makeDefault);
  const [sel, setSel] = useState('julia');
  const [type, setType] = useState('bienvenida');
  const [text, setText] = useState('');
  const [lang, setLang] = useState('es');

  // Espejo del panel de la creadora: si es local mostramos la IP LAN para
  // abrir /preview/voz-panel desde el teléfono; si no, el origen actual.
  const [panelUrl, setPanelUrl] = useState('/preview/voz-panel');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.host;
    const isLocal = /^(localhost|127\.)/.test(host);
    const origin = isLocal ? `${window.location.protocol}//${LAN_HOST}` : window.location.origin;
    setPanelUrl(`${origin}/preview/voz-panel`);
  }, []);

  // Rehidratar al montar; si no hay nada, escribir el default para que la
  // vista de la creadora tenga datos que leer.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = hydrate(raw);
        if (parsed) { setStore(parsed); return; }
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(makeDefault()));
    } catch {}
  }, []);

  const save = (next) => {
    setStore(next);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
  };

  const cur = store.creators[sel];
  const creatorMeta = CREATORS.find((c) => c.id === sel);
  const canGenerate = cur.cloned && cur.consent && text.trim().length > 0;
  const canUpload = cur.consent;

  const mutateCur = (patch) => {
    const next = { ...store, creators: { ...store.creators, [sel]: { ...cur, ...patch } } };
    save(next);
  };

  const simulateReferenceUpload = () => {
    // Mock: simula que se subió el clip de referencia y la voz queda clonada.
    mutateCur({ cloned: true });
  };

  const toggleConsent = () => mutateCur({ consent: !cur.consent });

  const addClip = (extra = {}) => {
    const clip = {
      id: genId(),
      type,
      text: text.trim() || 'Audio subido por el equipo',
      lang,
      url: SAMPLE_AUDIO,
      dur: estDur(text),
      at: new Date().toISOString(),
      ...extra,
    };
    mutateCur({ clips: [clip, ...cur.clips] });
  };

  const generate = () => {
    if (!canGenerate) return;
    addClip();
    setText('');
  };

  const uploadExternal = () => {
    if (!canUpload) return;
    addClip({ dur: text.trim() ? estDur(text) : '0:20' });
    setText('');
  };

  const removeClip = (id) => mutateCur({ clips: cur.clips.filter((x) => x.id !== id) });

  const total = useMemo(
    () => Object.values(store.creators).reduce((s, c) => s + c.clips.length, 0),
    [store],
  );

  return (
    <div className="min-h-screen bg-ink text-paper">

      {/* Header sticky */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/preview/admin"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
              title="Volver al admin"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">
                  <AudioLines size={12} className="text-brand" /> Voz
                </span>
                <StatusDot tone={cur.cloned ? 'ok' : 'warn'}>
                  {cur.cloned ? 'Clonada' : 'Sin voz'}
                </StatusDot>
              </div>
              <h1 className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-paper">
                {creatorMeta?.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-dim sm:inline">
              {total} audios
            </span>
            <a
              href={panelUrl}
              target="_blank"
              rel="noreferrer"
              className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold sm:px-4 sm:text-sm"
            >
              <Eye size={14} /> <span className="hidden sm:inline">Ver como la creadora</span>
              <span className="sm:hidden">Ver</span>
              <ExternalLink size={12} className="opacity-60" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 lg:px-8">

        {/* Intro + concepto de enganche */}
        <div className="mb-6">
          <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-paper-mute">
            <Sparkles size={11} className="text-brand" /> Voz clonada
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-[2rem]">
            Gestión de voz
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-paper-mute">
            El equipo sube el clip de referencia y genera los audios. La creadora ve todo lo que se
            hace con su voz. Son <span className="text-paper">contenido de enganche</span>: audios para
            enganchar fans, traer tráfico y sumar suscriptores, además de vender directo.
          </p>
        </div>

        {/* Selector de creadora */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {CREATORS.map((c) => {
            const active = c.id === sel;
            const cl = store.creators[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSel(c.id)}
                className={`card3d flex items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-all ${
                  active ? 'border-brand ring-1 ring-brand/50 shadow-glow-sm' : 'border-line hover:border-hair'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatar(c.seed)} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-sm font-bold text-paper">{c.name}</div>
                  <div className="truncate text-[11px] text-paper-mute">{c.agency}</div>
                </div>
                <StatusDot tone={cl.cloned ? 'ok' : 'warn'}>
                  {cl.cloned ? 'Clonada' : 'Sin voz'}
                </StatusDot>
              </button>
            );
          })}
        </div>

        {/* 3 columnas */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* ── IZQUIERDA — Voz de la creadora ─────────────────────────── */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-paper">Voz de {creatorMeta?.name?.split(' ')[0]}</h3>
              <StatusDot tone={cur.cloned ? 'ok' : 'warn'}>{cur.cloned ? 'Clonada' : 'Sin voz'}</StatusDot>
            </div>

            {/* Dropzone del clip de referencia */}
            {cur.cloned ? (
              <div className="rounded-2xl border border-line bg-ink-2 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hair/10 text-brand">
                    <Mic size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-paper">Clip de referencia cargado</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Voz lista para generar audios
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={simulateReferenceUpload}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
                >
                  <RefreshCw size={12} /> Reemplazar clip
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={simulateReferenceUpload}
                className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-line px-4 py-8 text-center text-paper-dim transition-colors hover:border-brand/50 hover:text-paper-mute"
              >
                <span className="flex flex-col items-center gap-2">
                  <UploadCloud size={22} />
                  <span className="text-sm font-semibold text-paper-mute">Arrastrá el audio de la creadora o buscá</span>
                  <span className="text-[11px]">10s+ de su voz, con consentimiento</span>
                </span>
              </button>
            )}

            {/* Consentimiento */}
            <button
              type="button"
              onClick={toggleConsent}
              className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-line bg-ink-2 p-3 text-left transition-colors hover:border-hair"
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                  cur.consent ? 'border-brand bg-brand text-on-accent' : 'border-line bg-ink'
                }`}
              >
                {cur.consent && <Check size={13} />}
              </span>
              <span className="min-w-0 flex-1 text-sm text-paper">
                La creadora dio consentimiento para clonar su voz
                <span className="mt-0.5 block text-[11px] text-paper-mute">Obligatorio para habilitar generar</span>
              </span>
            </button>
          </section>

          {/* ── CENTRO — Generar audio ─────────────────────────────────── */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <h3 className="mb-4 font-display text-base font-bold text-paper">Generar audio</h3>

            <div className="space-y-4">
              <div>
                <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Etiqueta</div>
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.map((t) => (
                    <Chip key={t.id} active={type === t.id} onClick={() => setType(t.id)} dot={t.dot}>
                      {t.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Guion</div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  placeholder="Escribí lo que va a decir con su voz…"
                  className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </div>

              <div>
                <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Idioma del audio</div>
                <div className="flex flex-wrap gap-1.5">
                  {LANGS.map((l) => (
                    <Chip key={l.id} active={lang === l.id} onClick={() => setLang(l.id)}>
                      {l.flag} {l.label}
                    </Chip>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate}
                className="btn3d inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold disabled:pointer-events-none disabled:opacity-40"
              >
                <Wand2 size={16} /> Generar audio
              </button>

              {!cur.cloned && (
                <div className="flex items-center gap-1.5 text-[11px] text-paper-mute">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Subí el clip de referencia para clonar la voz
                </div>
              )}
              {cur.cloned && !cur.consent && (
                <div className="flex items-center gap-1.5 text-[11px] text-paper-mute">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Falta el consentimiento de la creadora
                </div>
              )}

              <div className="border-t border-line pt-4">
                <button
                  type="button"
                  onClick={uploadExternal}
                  disabled={!canUpload}
                  className="btn3d-ghost inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
                >
                  <UploadCloud size={15} /> Subir audio hecho afuera
                </button>
                <p className="mt-2 text-center text-[11px] text-paper-dim">Fallback: cargás un audio ya listo con su voz.</p>
              </div>
            </div>
          </section>

          {/* ── DERECHA — Catálogo ─────────────────────────────────────── */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate font-display text-base font-bold text-paper">
                Catálogo de {creatorMeta?.name?.split(' ')[0]}
              </h3>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
                {cur.clips.length} audios
              </span>
            </div>

            {cur.clips.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-line bg-ink-2 px-4 py-12 text-center">
                <AudioLines size={26} className="mb-2 text-paper-dim" />
                <div className="text-sm font-semibold text-paper">Todavía no hay audios</div>
                <div className="mt-1 text-[12px] text-paper-mute">Generá el primero desde el panel del centro.</div>
              </div>
            ) : (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {cur.clips.map((clip) => {
                  const meta = TYPE_MAP[clip.type] || TYPE_MAP.personalizado;
                  const flag = LANGS.find((l) => l.id === clip.lang)?.flag ?? '🌐';
                  return (
                    <article key={clip.id} className="rounded-2xl border border-line bg-ink-2 p-3.5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="text-paper-dim">·</span>
                        <span className="font-mono text-[11px] text-paper-mute">{flag} {clip.dur}</span>
                        <span className="ml-auto font-mono text-[10px] text-paper-dim">{fmtDate(clip.at)}</span>
                      </div>

                      <p className="mb-2.5 line-clamp-2 text-[13px] leading-relaxed text-paper-mute">{clip.text}</p>

                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <audio controls preload="none" src={clip.url} className="mb-2.5 h-9 w-full" />

                      <div className="flex items-center gap-2">
                        <a
                          href={clip.url}
                          download={`${meta.label.toLowerCase()}-${clip.id}.wav`}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
                        >
                          <Download size={13} /> Descargar
                        </a>
                        <button
                          type="button"
                          onClick={() => removeClip(clip.id)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function Chip({ active, onClick, dot, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-transparent bg-brand text-on-accent shadow-glow-sm'
          : 'border-line text-paper-mute hover:border-hair hover:text-paper'
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
      {children}
    </button>
  );
}

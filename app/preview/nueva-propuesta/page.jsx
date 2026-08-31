'use client';

// ─────────────────────────────────────────────────────────────────────────
// CREAR PRESENTACIÓN — wizard unificado (rehecho).
// Un solo flujo guiado de 3 pasos, sin saltar entre páginas:
//   1) Modelo   2) Armar paquete   3) Revisar y publicar
// Idioma del LINK integrado (es/en/de/it/fr) → cambia lo que ve el receptor.
// Apegado 100% al sistema de diseño: tokens ink/paper/brand, rounded-3xl,
// bg-card, chips mono, botones brand con shadow-glow.
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Search, Check, X, ChevronUp, ChevronDown, Plus,
  ImageIcon, Building2, Calendar, Sparkles, User, Copy, Smartphone, Trash2,
  Eye, Send, Share2, Link as LinkIcon, Globe, Grid2x2, Rows3, ChevronRight,
} from 'lucide-react';
import { useProp, PROP_LANGS, PROP_LANG_LABELS, PROP_LANG_FLAG, propDict } from '@/lib/propuesta-i18n';

// ── Data demo ─────────────────────────────────────────────────────────────
const TODAY = new Date('2026-08-26');
const daysAgo = (n) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const MODELOS = [
  { id: 'julia',  name: 'Julia Parker',  agency: 'Kash Agency',      avatar: 'https://picsum.photos/seed/jp/120/120', assetCount: 24, lastUpload: daysAgo(2), tag: 'principal' },
  { id: 'monica', name: 'Mónica Rivas',  agency: 'Kash Agency',      avatar: 'https://picsum.photos/seed/mr/120/120', assetCount: 18, lastUpload: daysAgo(7) },
  { id: 'nadia',  name: 'Nadia Torres',  agency: 'LetShoot Direct',  avatar: 'https://picsum.photos/seed/nt/120/120', assetCount: 12, lastUpload: daysAgo(15) },
  { id: 'lila',   name: 'Lila Antú',     agency: 'Bloom Talent',     avatar: 'https://picsum.photos/seed/la/120/120', assetCount: 9,  lastUpload: daysAgo(20) },
  { id: 'sofia',  name: 'Sofía Ledesma', agency: 'Kash Agency',      avatar: 'https://picsum.photos/seed/sl/120/120', assetCount: 7,  lastUpload: daysAgo(27) },
];

const BAUL = Array.from({ length: 24 }, (_, i) => {
  const kinds = ['ia', 'ia', 'ia', 'raw', 'ref', 'ia', 'selfie', 'ia'];
  const chapters = ['Cafetería', 'Playa', 'Estudio', 'Interior', 'Piscina', 'Bar'];
  return {
    id: `a${i + 1}`,
    src: `https://picsum.photos/seed/lsjp${String(i + 1).padStart(2, '0')}/600/750`,
    kind: kinds[i % kinds.length],
    chapter: chapters[i % chapters.length],
    date: daysAgo(Math.floor(i * 1.4)),
    approved: i % 5 !== 4,
    prompt: `${chapters[i % chapters.length]} · look ${i % 3 === 0 ? 'editorial' : i % 3 === 1 ? 'lifestyle' : 'estudio'}`,
  };
});

const KIND_TONE = {
  ia: 'bg-brand/15 text-brand border-brand/30',
  raw: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ref: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  selfie: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};
const KIND_SHORT = { ia: 'IA', raw: 'RAW', ref: 'REF', selfie: 'SELF' };
const LAN_HOST = '192.168.1.125:3001';

export default function NuevaPropuesta() {
  const t = useProp(); // editor sigue el idioma del sitio

  // Host real: en producción usa el dominio actual; en local (localhost) usa
  // la IP LAN para que el QR/link funcionen desde el teléfono. Nunca dejamos
  // el LAN hardcodeado en producción (rompería el link "Ver como cliente").
  const [host, setHost] = useState(LAN_HOST);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cur = window.location.host;
    setHost(/^(localhost|127\.0\.0\.1|::1)/.test(cur) ? LAN_HOST : cur);
  }, []);

  const [step, setStep] = useState(1);
  const [modelId, setModelId] = useState(null);
  const [items, setItems] = useState([]);

  // Config
  const [name, setName] = useState('Selección editorial');
  const [subtitle, setSubtitle] = useState('Verano · 2026');
  const [intro, setIntro] = useState('Sentí el estilo antes de confirmar la sesión.');
  const [days, setDays] = useState(10);
  const [linkLang, setLinkLang] = useState('es'); // idioma del LINK público

  const model = MODELOS.find((m) => m.id === modelId);
  const canNext = step === 1 ? !!modelId : step === 2 ? items.length > 0 : true;

  const steps = [t.step1, t.step2, t.step3];

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* ── HEADER + STEPPER ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/preview/admin" className="grid h-10 w-10 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
              <ArrowLeft size={17} />
            </Link>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">
                <Sparkles size={11} className="text-brand" /> {t.newPres}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tracking-tight">
                {step === 1 ? t.pickModel : step === 2 ? `${t.vaultOf} ${model?.name ?? ''}` : `${t.step3}`}
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="hidden items-center gap-2 md:flex">
            {steps.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <button
                    onClick={() => { if (done || active) setStep(n); }}
                    className={`flex items-center gap-2 rounded-full px-1 transition-opacity ${active || done ? '' : 'opacity-45'}`}
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] font-bold transition-all ${
                      active ? 'bg-brand text-on-accent shadow-glow-sm' : done ? 'bg-brand/20 text-brand' : 'border border-line text-paper-mute'
                    }`}>
                      {done ? <Check size={13} /> : n}
                    </span>
                    <span className={`text-sm font-semibold ${active ? 'text-paper' : 'text-paper-mute'}`}>{label}</span>
                  </button>
                  {n < 3 && <div className={`h-px w-6 ${done ? 'bg-brand/40' : 'bg-line'}`} />}
                </div>
              );
            })}
          </div>

          {/* Acción según paso */}
          <div className="flex items-center gap-2">
            {step === 3 && (
              <a href={`${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${host}/preview/propuesta?lang=${linkLang}`} target="_blank" rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-full border border-line px-4 py-2.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper sm:inline-flex">
                <Eye size={15} /> {t.viewAsClient}
              </a>
            )}
            <button
              onClick={() => { if (step < 3 && canNext) setStep(step + 1); }}
              disabled={step >= 3 || !canNext}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                step >= 3
                  ? 'bg-brand text-on-accent shadow-glow'
                  : canNext ? 'bg-brand text-on-accent shadow-glow-sm hover:scale-[1.02]' : 'bg-hair/10 text-paper-dim'
              }`}
            >
              {step >= 3 ? <><Share2 size={15} /> {t.publish}</> : <>{t.step2 && (step === 1 ? t.step2 : t.step3)} <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO por paso ── */}
      {step === 1 && <StepModel t={t} modelId={modelId} onPick={(id) => { setModelId(id); setStep(2); }} />}
      {step === 2 && <StepBuild t={t} items={items} setItems={setItems} model={model} />}
      {step === 3 && (
        <StepPublish
          t={t} name={name} setName={setName} subtitle={subtitle} setSubtitle={setSubtitle}
          intro={intro} setIntro={setIntro} days={days} setDays={setDays}
          linkLang={linkLang} setLinkLang={setLinkLang} items={items} model={model}
        />
      )}

      {/* ── Barra inferior de navegación (móvil / siempre) ── */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-6 py-3 sm:px-8">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:opacity-40"
          >
            <ArrowLeft size={15} /> Atrás
          </button>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-paper-dim">
            {t.step1} · {t.step2} · {t.step3} — <span className="text-brand">{step}/3</span>
          </div>
          <button
            onClick={() => { if (step < 3 && canNext) setStep(step + 1); }}
            disabled={step >= 3 || !canNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02] disabled:bg-hair/10 disabled:text-paper-dim disabled:shadow-none"
          >
            {step >= 3 ? t.publish : 'Siguiente'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ PASO 1 · MODELO ═══════════════
function StepModel({ t, modelId, onPick }) {
  const [q, setQ] = useState('');
  const [agency, setAgency] = useState('todas');
  const agencies = useMemo(() => ['todas', ...Array.from(new Set(MODELOS.map((m) => m.agency)))], []);
  const filtered = MODELOS.filter((m) => (agency === 'todas' || m.agency === agency) && (!q || m.name.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => b.assetCount - a.assetCount);

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-8 sm:px-8">
      <p className="mb-6 max-w-2xl text-sm text-paper-mute">{t.pickModelSub}</p>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchModel}
            className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-10 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {agencies.map((ag) => (
            <button key={ag} onClick={() => setAgency(ag)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                agency === ag ? 'border-brand bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-hair hover:text-paper'
              }`}>
              {ag !== 'todas' && <Building2 size={12} />}{ag === 'todas' ? t.allAgencies : ag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <button key={m.id} onClick={() => onPick(m.id)}
            className={`group relative overflow-hidden rounded-3xl border bg-card p-5 text-left transition-all hover:border-brand/40 hover:shadow-glow-sm ${
              modelId === m.id ? 'border-brand ring-2 ring-brand/40' : 'border-line'
            }`}>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.avatar} alt={m.name} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-line transition-all group-hover:ring-2 group-hover:ring-brand/60" />
                {m.tag === 'principal' && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-brand px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-on-accent shadow-glow-sm">
                    {t.step1 === 'Model' ? 'Main' : 'Principal'}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-bold tracking-tight text-paper">{m.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-paper-mute"><Building2 size={11} /> {m.agency}</div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-paper-dim transition-transform group-hover:translate-x-1 group-hover:text-brand" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-ink-2 px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-mute"><ImageIcon size={11} /> {t.vault}</div>
                <div className="mt-0.5 font-display text-xl font-bold tabular-nums">{m.assetCount}</div>
              </div>
              <div className="rounded-xl border border-line bg-ink-2 px-3 py-2.5">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-paper-mute">{t.lastUpload}</div>
                <div className="mt-0.5 text-sm font-medium text-paper">{m.lastUpload.slice(5)}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

// ═══════════════ PASO 2 · ARMAR PAQUETE ═══════════════
function StepBuild({ t, items, setItems, model }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [size, setSize] = useState('md');

  const filtered = BAUL.filter((a) => {
    if (kind !== 'all' && a.kind !== kind) return false;
    if (onlyApproved && !a.approved) return false;
    if (q && !(`${a.chapter} ${a.prompt}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const inPackage = new Set(items);
  const packageAssets = items.map((id) => BAUL.find((a) => a.id === id)).filter(Boolean);
  const toggle = (id) => setItems((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const remove = (id) => setItems((s) => s.filter((x) => x !== id));
  const moveUp = (i) => setItems((s) => { if (i === 0) return s; const a = [...s]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; });
  const moveDown = (i) => setItems((s) => { if (i === s.length - 1) return s; const a = [...s]; [a[i+1], a[i]] = [a[i], a[i+1]]; return a; });

  const cols = { sm: 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7', md: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5', lg: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' };

  return (
    <div className="mx-auto grid max-w-[1600px] gap-4 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Baúl */}
      <main className="rounded-3xl border border-line bg-card p-5 sm:p-6">
        {/* toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchVault}
              className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-10 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
          </div>
          <div className="flex items-center gap-0.5 rounded-full border border-line bg-ink-2 p-0.5">
            {[['sm', <Grid2x2 key="a" size={13} />], ['lg', <Rows3 key="b" size={13} />]].map(([s, ic]) => (
              <button key={s} onClick={() => setSize(s)} className={`grid h-7 w-7 place-items-center rounded-full ${size === s ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}>{ic}</button>
            ))}
          </div>
        </div>
        {/* filtros tipo */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[['all', t.tipoAll], ['ia', t.tipoIa], ['raw', t.tipoRaw], ['ref', t.tipoRef], ['selfie', t.tipoSelfie]].map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${kind === k ? 'border-brand bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-hair hover:text-paper'}`}>
              {label}
            </button>
          ))}
          <label className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-ink-2 px-3 py-1 text-xs text-paper-mute">
            <input type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} className="h-3.5 w-3.5 accent-brand" /> {t.onlyApproved}
          </label>
        </div>
        {/* grid */}
        <div className={`grid gap-3 ${cols[size]}`}>
          {filtered.map((a) => {
            const isIn = inPackage.has(a.id);
            return (
              <button key={a.id} onClick={() => toggle(a.id)}
                className={`group relative overflow-hidden rounded-2xl border transition-all ${isIn ? 'border-brand ring-2 ring-brand/40 shadow-glow-sm' : 'border-line hover:border-hair'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.src} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className={`absolute left-2 top-2 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest ${KIND_TONE[a.kind]}`}>{KIND_SHORT[a.kind]}</span>
                {a.approved && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow"><Check size={11} /></span>}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                  <div className="line-clamp-1 text-[11px] font-semibold text-white">{a.chapter}</div>
                  <div className="text-[9px] text-white/60">{a.date.slice(5)}</div>
                </div>
                {isIn ? (
                  <div className="absolute inset-0 grid place-items-center bg-brand/25 backdrop-blur-[1px]">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-on-accent shadow-glow"><Check size={17} /></span>
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-ink shadow"><Plus size={18} /></span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* Paquete sticky */}
      <aside className="lg:sticky lg:top-[89px] lg:h-fit">
        <div className="rounded-3xl border border-line bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand"><ImageIcon size={18} /></div>
              <div>
                <div className="font-display text-lg font-bold">{t.step2}</div>
                <div className="text-xs text-paper-mute"><b className="text-paper">{packageAssets.length}</b> {t.selected}</div>
              </div>
            </div>
            <button onClick={() => setItems([])} disabled={items.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-paper-mute transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-40">
              <Trash2 size={12} /> {t.clear}
            </button>
          </div>
          {packageAssets.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line py-14 text-center">
              <ImageIcon size={24} className="mb-2 text-paper-dim" />
              <div className="text-sm text-paper-mute">{t.empty}</div>
              <div className="mt-1 text-xs text-paper-dim">{t.emptyHint}</div>
            </div>
          ) : (
            <ol className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
              {packageAssets.map((a, i) => (
                <li key={a.id} className="group flex items-center gap-2.5 rounded-xl border border-line bg-ink-2 p-2 transition-colors hover:border-hair">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded font-mono text-[10px] font-bold text-paper-dim">{String(i + 1).padStart(2, '0')}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.src} alt="" className="h-12 w-10 shrink-0 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-[13px] font-semibold text-paper">{a.chapter}</div>
                    <div className="line-clamp-1 text-[10px] text-paper-mute">{a.prompt}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-30 transition-opacity group-hover:opacity-100">
                    <button onClick={() => moveUp(i)} disabled={i === 0} className="grid h-7 w-7 place-items-center rounded-md hover:bg-hair/10 disabled:opacity-30"><ChevronUp size={13} /></button>
                    <button onClick={() => moveDown(i)} disabled={i === packageAssets.length - 1} className="grid h-7 w-7 place-items-center rounded-md hover:bg-hair/10 disabled:opacity-30"><ChevronDown size={13} /></button>
                    <button onClick={() => remove(a.id)} className="grid h-7 w-7 place-items-center rounded-md text-paper-mute hover:bg-rose-500/10 hover:text-rose-300"><X size={13} /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

// ═══════════════ PASO 3 · REVISAR Y PUBLICAR ═══════════════
function StepPublish({ t, name, setName, subtitle, setSubtitle, intro, setIntro, days, setDays, linkLang, setLinkLang, items, model }) {
  const [copied, setCopied] = useState(false);
  const [host, setHost] = useState(LAN_HOST);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cur = window.location.host;
    setHost(/^(localhost|127\.0\.0\.1|::1)/.test(cur) ? LAN_HOST : cur);
  }, []);

  const publicUrl = `http://${host}/preview/propuesta?lang=${linkLang}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(publicUrl)}`;
  const packageAssets = items.map((id) => BAUL.find((a) => a.id === id)).filter(Boolean);
  const rt = propDict(linkLang); // dict del idioma del LINK, para la preview

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  };

  return (
    <main className="mx-auto grid max-w-[1400px] gap-4 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Preview del link + config */}
      <div className="space-y-4">
        {/* Config */}
        <section className="rounded-3xl border border-line bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"><Sparkles size={17} /></div>
            <div className="font-display text-lg font-bold">{t.details}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.pkgTitle}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.subtitle}</span>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute"><Calendar size={11} className="mr-1 inline" />{t.expiresField}</span>
              <div className="flex items-center gap-1.5">
                {[3, 7, 10, 14, 30].map((n) => (
                  <button key={n} onClick={() => setDays(n)} className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors ${days === n ? 'border-brand bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-hair'}`}>{n}d</button>
                ))}
              </div>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.introduction}</span>
              <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className="w-full resize-vertical rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
            </label>
            {/* IDIOMA DEL LINK */}
            <div className="sm:col-span-2">
              <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute"><Globe size={11} className="mr-1 inline" />{t.langField}</span>
              <div className="flex flex-wrap gap-2">
                {PROP_LANGS.map((l) => (
                  <button key={l} onClick={() => setLinkLang(l)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${linkLang === l ? 'border-brand bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-hair hover:text-paper'}`}>
                    <span>{PROP_LANG_FLAG[l]}</span> {PROP_LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mini-preview del cover del link (en el idioma elegido) */}
        <section className="overflow-hidden rounded-3xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
              <Eye size={12} /> {t.viewAsClient} · {PROP_LANG_FLAG[linkLang]} {PROP_LANG_LABELS[linkLang]}
            </span>
            <span className="rounded-full border border-brand/25 bg-brand/[0.06] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-brand">Preview</span>
          </div>
          <div className="relative h-72 overflow-hidden">
            {packageAssets[0] && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={packageAssets[0].src.replace(/\/\d+\/\d+$/, '/1200/900')} alt="" className="h-full w-full object-cover object-[center_30%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
              </>
            )}
            <div className="absolute inset-0 flex flex-col justify-end p-6">
              <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {rt.privateSel} · {model?.name}
              </span>
              <div className="font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-white drop-shadow-lg">{name}</div>
              <div className="mt-1 font-display text-base font-medium italic text-white/70">{subtitle}</div>
              <div className="mt-3 flex items-center gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-ink">{rt.start}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/60">{packageAssets.length} {rt.images} · {rt.tapHint}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Link + QR + compartir */}
      <aside className="space-y-4 lg:sticky lg:top-[89px] lg:h-fit">
        <section className="rounded-3xl border border-brand/40 bg-gradient-to-br from-brand/[0.1] to-brand/[0.02] p-5 shadow-glow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-on-accent shadow-glow-sm"><LinkIcon size={17} /></div>
            <div>
              <div className="font-display text-base font-bold">{t.shareLink}</div>
              <div className="text-[11px] text-paper-mute">{t.publicAnon} · {days}d</div>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
            <LinkIcon size={13} className="shrink-0 text-paper-dim" />
            <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-paper outline-none" />
            <button onClick={copyLink} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-brand text-on-accent hover:scale-105'}`}>
              {copied ? <><Check size={13} /> {t.copied}</> : <><Copy size={13} /> {t.copy}</>}
            </button>
          </div>
          <div className="rounded-2xl border border-line bg-ink p-4">
            <div className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute"><Smartphone size={11} /> {t.scanPhone}</div>
            <div className="grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" className="h-52 w-52 rounded-lg" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-ink px-3 py-2 text-xs font-semibold text-paper-mute transition-colors hover:border-emerald-500/40 hover:text-emerald-300">WhatsApp</button>
            <button className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-ink px-3 py-2 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">Email</button>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-card p-5">
          <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute"><User size={11} /> {t.shareInternal}</div>
          <p className="mb-3 text-xs text-paper-mute">Se comparte en el /panel de la modelo y por email, con un link personal.</p>
          <button className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-brand/40 bg-brand/[0.08] px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/[0.15]">
            <Send size={14} /> {t.shareInternal}
          </button>
        </section>
      </aside>
    </main>
  );
}

'use client';

// ─────────────────────────────────────────────────────────────────────────
// Editor de PROPUESTA (admin) — layout desktop tipo media library pro.
//
// Layout:
//   [ Top bar: título + estado + Ver como receptor + Publicar        ]
//   [ Sidebar izq · filtros ] [ CENTRO · grid del baúl ancho ] [ Der · paquete + link/QR ]
//
// El admin NO se ve como un teléfono: usa todo el ancho, thumbs grandes,
// filtros verticales fijos, panel derecho ancho con paquete + link.
// El link público (/preview/propuesta) es el que se optimiza para móvil.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Plus, X, ChevronUp, ChevronDown, Eye, Copy, Check,
  Smartphone, Trash2, ImageIcon, Sparkles, User, Calendar, QrCode,
  Link as LinkIcon, ExternalLink, LayoutGrid, LayoutList, Filter,
  Share2, MessageSquare, Heart, ChevronRight,
} from 'lucide-react';

const TODAY = new Date('2026-08-24');
function daysAgo(n) { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

// ── Baúl (24 archivos) ────────────────────────────────────────────────────
const BAUL = Array.from({ length: 24 }, (_, i) => {
  const kinds = ['ia', 'ia', 'ia', 'raw', 'ref', 'ia', 'selfie', 'ia'];
  const chapters = ['Cafetería', 'Playa', 'Estudio', 'Interior', 'Piscina', 'Bar'];
  return {
    id: `a${i + 1}`,
    src: `https://picsum.photos/seed/lsjp${String(i + 1).padStart(2, '0')}/600/750`,
    kind: kinds[i % kinds.length],
    chapter: chapters[i % chapters.length],
    date: daysAgo(Math.floor(i * 1.7)),
    approved: i % 5 !== 4,
    prompt: `${chapters[i % chapters.length]} · look ${i % 3 === 0 ? 'editorial' : i % 3 === 1 ? 'lifestyle' : 'estudio'}`,
  };
});

const KIND_LABEL = { ia: 'Generada IA', raw: 'Original', ref: 'Referencia', selfie: 'Selfie' };
const KIND_TONE = {
  ia: 'bg-brand/15 text-brand border-brand/30',
  raw: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ref: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  selfie: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};
const KIND_ORDER = ['ia', 'raw', 'ref', 'selfie'];

const LAN_HOST = '192.168.1.125:3001';

export default function PropuestaAdmin() {
  const [name, setName] = useState('Selección editorial');
  const [subtitle, setSubtitle] = useState('Verano · 2026');
  const [intro, setIntro] = useState('Una curaduría cerrada para que sientas el estilo, la paleta y la dirección visual antes de confirmar la sesión.');
  const [days, setDays] = useState(10);
  const [slug] = useState('JP-VE26-A31F');

  const [items, setItems] = useState(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12']);

  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [chapterFilter, setChapterFilter] = useState('all');
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [size, setSize] = useState('md'); // sm | md | lg
  const [copied, setCopied] = useState(false);

  const [host, setHost] = useState(LAN_HOST);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.host;
    const isLocal = /^(localhost|127\.0\.0\.1|::1)/.test(current);
    setHost(isLocal ? LAN_HOST : current);
  }, []);

  const chapters = useMemo(() => Array.from(new Set(BAUL.map((x) => x.chapter))), []);

  const kindCounts = useMemo(() => {
    const c = { ia: 0, raw: 0, ref: 0, selfie: 0 };
    BAUL.forEach((a) => { c[a.kind]++; });
    return c;
  }, []);

  const chapterCounts = useMemo(() => {
    const c = {};
    BAUL.forEach((a) => { c[a.chapter] = (c[a.chapter] || 0) + 1; });
    return c;
  }, []);

  const filtered = useMemo(() => BAUL.filter((a) => {
    if (kind !== 'all' && a.kind !== kind) return false;
    if (chapterFilter !== 'all' && a.chapter !== chapterFilter) return false;
    if (onlyApproved && !a.approved) return false;
    if (q && !(`${a.chapter} ${a.prompt}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (dateRange !== 'all') {
      const nDays = { 7: 7, 30: 30, 90: 90 }[dateRange];
      const cutoff = new Date(TODAY); cutoff.setDate(cutoff.getDate() - nDays);
      if (new Date(a.date) < cutoff) return false;
    }
    return true;
  }), [q, kind, chapterFilter, onlyApproved, dateRange]);

  const inPackage = new Set(items);
  const packageAssets = items.map((id) => BAUL.find((a) => a.id === id)).filter(Boolean);

  const toggle = (id) => setItems((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const remove = (id) => setItems((s) => s.filter((x) => x !== id));
  const moveUp = (idx) => setItems((s) => { if (idx === 0) return s; const a = [...s]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
  const moveDown = (idx) => setItems((s) => { if (idx === s.length - 1) return s; const a = [...s]; [a[idx+1], a[idx]] = [a[idx], a[idx+1]]; return a; });

  const scheme = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const publicUrl = `${scheme}//${host}/preview/propuesta`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(publicUrl)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`Te preparé una selección: ${publicUrl}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Propuesta ${name}`)}&body=${encodeURIComponent(`Te preparé una selección para que veas antes de confirmar la sesión:\n\n${publicUrl}\n\nExpira en ${days} días.`)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const gridColsBySize = { sm: 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8', md: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6', lg: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' };

  return (
    <div className="min-h-screen bg-ink text-paper">

      {/* ═══════════ TOP BAR (ancho completo, generoso) ═══════════ */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="flex items-center justify-between gap-6 px-8 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/preview/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver a Presentaciones">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">Propuesta</span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">{slug}</span>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  ● Borrador
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-3">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-paper">{name}</h1>
                <span className="truncate font-medium italic text-paper-mute">{subtitle}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
            >
              <Eye size={15} /> Ver como receptor <ExternalLink size={12} className="opacity-50" />
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-accent shadow-glow-sm transition-transform hover:scale-[1.02]"
            >
              <Share2 size={15} /> Publicar
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ LAYOUT 3 zonas (sidebar filtros · baúl · paquete) ═══════════ */}
      <div className="flex min-h-[calc(100vh-73px)]">

        {/* ─── SIDEBAR FILTROS (izq, sticky, angosta) ─── */}
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[260px] shrink-0 overflow-y-auto border-r border-line bg-ink px-5 py-6 lg:block">

          {/* Modelo */}
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-on-accent shadow-glow-sm">
              <User size={17} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-bold text-paper">Julia Parker</div>
              <div className="text-[11px] text-paper-mute">Baúl · {BAUL.length} archivos</div>
            </div>
          </div>

          {/* Filtro tipo */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Tipo</span>
              {kind !== 'all' && <button onClick={() => setKind('all')} className="text-[10px] uppercase tracking-widest text-paper-dim hover:text-paper">reset</button>}
            </div>
            <div className="space-y-1">
              <SidebarRow active={kind === 'all'} onClick={() => setKind('all')} label="Todos" count={BAUL.length} />
              {KIND_ORDER.map((k) => (
                <SidebarRow
                  key={k}
                  active={kind === k}
                  onClick={() => setKind(k)}
                  label={KIND_LABEL[k]}
                  count={kindCounts[k]}
                  dot={k === 'ia' ? 'bg-brand' : k === 'raw' ? 'bg-amber-400' : k === 'ref' ? 'bg-fuchsia-400' : 'bg-emerald-400'}
                />
              ))}
            </div>
          </div>

          {/* Filtro capítulo */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Capítulo</span>
              {chapterFilter !== 'all' && <button onClick={() => setChapterFilter('all')} className="text-[10px] uppercase tracking-widest text-paper-dim hover:text-paper">reset</button>}
            </div>
            <div className="space-y-1">
              <SidebarRow active={chapterFilter === 'all'} onClick={() => setChapterFilter('all')} label="Todos" count={BAUL.length} />
              {chapters.map((c) => (
                <SidebarRow key={c} active={chapterFilter === c} onClick={() => setChapterFilter(c)} label={c} count={chapterCounts[c]} />
              ))}
            </div>
          </div>

          {/* Fecha */}
          <div className="mb-6">
            <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">Fecha</div>
            <div className="space-y-1">
              <SidebarRow active={dateRange === 'all'} onClick={() => setDateRange('all')} label="Cualquier fecha" />
              <SidebarRow active={dateRange === '7'} onClick={() => setDateRange('7')} label="Últimos 7 días" />
              <SidebarRow active={dateRange === '30'} onClick={() => setDateRange('30')} label="Últimos 30 días" />
              <SidebarRow active={dateRange === '90'} onClick={() => setDateRange('90')} label="Últimos 90 días" />
            </div>
          </div>

          {/* Toggles */}
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-card px-3 py-2.5 text-sm">
            <span className="text-paper">Solo aprobadas</span>
            <input type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} className="h-4 w-4 accent-brand" />
          </label>
        </aside>

        {/* ─── CENTRO · BAÚL (fluido) ─── */}
        <main className="flex-1 min-w-0 border-r border-line">
          {/* Toolbar del baúl */}
          <div className="sticky top-[73px] z-20 border-b border-line bg-ink/90 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-6 py-3.5">
              <div className="relative min-w-0 flex-1 max-w-md">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar en el baúl…"
                  className="w-full rounded-xl border border-line bg-ink-2 py-2.5 pl-10 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </div>
              <span className="text-xs text-paper-mute"><b className="font-mono text-paper">{filtered.length}</b> de {BAUL.length} archivos</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-paper-dim">Vista</span>
                <div className="flex items-center gap-0.5 rounded-full border border-line bg-ink-2 p-0.5">
                  {['sm', 'md', 'lg'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${size === s ? 'bg-brand text-on-accent' : 'text-paper-mute hover:text-paper'}`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="p-6">
            {filtered.length === 0 ? (
              <div className="grid place-items-center rounded-3xl border border-line bg-card p-24 text-center">
                <Filter size={28} className="mb-3 text-paper-dim" />
                <div className="font-display text-lg font-semibold text-paper">Sin resultados</div>
                <div className="mt-1 text-sm text-paper-mute">Probá con otros filtros.</div>
              </div>
            ) : (
              <div className={`grid gap-4 ${gridColsBySize[size]}`}>
                {filtered.map((a) => {
                  const isIn = inPackage.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggle(a.id)}
                      className={`group relative overflow-hidden rounded-2xl border bg-card transition-all ${
                        isIn ? 'border-brand ring-2 ring-brand/40 shadow-glow-sm' : 'border-line hover:border-hair'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.src} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <span className={`absolute left-2 top-2 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest ${KIND_TONE[a.kind]}`}>
                        {a.kind === 'ia' ? 'IA' : a.kind === 'raw' ? 'RAW' : a.kind === 'ref' ? 'REF' : 'SELF'}
                      </span>
                      {a.approved && (
                        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" title="Aprobada">
                          <Check size={13} />
                        </span>
                      )}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-2.5">
                        <div className="line-clamp-1 text-[12px] font-semibold text-white">{a.chapter}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                          <Calendar size={9} />{a.date.slice(5)}
                        </div>
                      </div>
                      {isIn ? (
                        <div className="absolute inset-0 grid place-items-center bg-brand/25 backdrop-blur-[2px]">
                          <div className="flex flex-col items-center gap-2">
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-on-accent shadow-glow">
                              <Check size={20} />
                            </span>
                            <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">En el paquete</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-ink shadow-lg">
                            <Plus size={22} />
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ─── DERECHA · PAQUETE + LINK + QR (sticky, ancho generoso) ─── */}
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[420px] shrink-0 overflow-y-auto bg-ink px-5 py-6 xl:block">

          {/* Paquete */}
          <section className="mb-4 rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <div className="font-display text-lg font-bold">Paquete</div>
                  <div className="text-xs text-paper-mute"><b className="text-paper">{packageAssets.length}</b> seleccionadas</div>
                </div>
              </div>
              <button
                onClick={() => setItems([])}
                disabled={items.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-paper-mute transition-colors hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-40"
              >
                <Trash2 size={12} /> Vaciar
              </button>
            </div>
            {packageAssets.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border-2 border-dashed border-line py-10 text-center">
                <ImageIcon size={22} className="mb-2 text-paper-dim" />
                <div className="text-sm text-paper-mute">Clic en fotos del baúl</div>
              </div>
            ) : (
              <ol className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
                {packageAssets.map((a, i) => (
                  <li key={a.id} className="group flex items-center gap-2.5 rounded-xl border border-line bg-ink-2 p-2 transition-colors hover:border-hair">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded font-mono text-[10px] font-bold text-paper-dim">
                      {String(i + 1).padStart(2, '0')}
                    </span>
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
          </section>

          {/* Config compacta */}
          <section className="mb-4 rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand">
                <Sparkles size={17} />
              </div>
              <div className="font-display text-base font-bold">Detalles</div>
            </div>
            <div className="space-y-3">
              <Field label="Título">
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label="Subtítulo">
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label="Introducción">
                <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3} className="w-full resize-vertical rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={<span className="inline-flex items-center gap-1.5"><Calendar size={11} /> Vence en</span>}>
                <div className="flex items-center gap-1.5">
                  {[3, 7, 10, 14, 30].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDays(n)}
                      className={`flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors ${
                        days === n ? 'border-brand bg-brand/10 text-brand' : 'border-line text-paper-mute hover:border-hair'
                      }`}
                    >
                      {n}d
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* Link + QR (destacado) */}
          <section className="rounded-3xl border border-brand/40 bg-gradient-to-br from-brand/[0.10] to-brand/[0.02] p-5 shadow-glow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-on-accent shadow-glow-sm">
                <LinkIcon size={17} />
              </div>
              <div>
                <div className="font-display text-base font-bold">Link para compartir</div>
                <div className="text-[11px] text-paper-mute">Público · anónimo · sin descarga · {days}d</div>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
              <LinkIcon size={13} className="shrink-0 text-paper-dim" />
              <input
                readOnly
                value={publicUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-paper outline-none"
              />
              <button
                onClick={copyLink}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-brand text-on-accent hover:scale-105'
                }`}
              >
                {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
              </button>
            </div>

            <div className="rounded-2xl border border-line bg-ink p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                  <Smartphone size={11} /> Escaneá con el teléfono
                </span>
                <span className="rounded-full border border-brand/25 bg-brand/[0.06] px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-brand">QR</span>
              </div>
              <div className="grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" className="h-52 w-52 rounded-lg" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={waUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-ink px-3 py-2 text-xs font-semibold text-paper-mute transition-colors hover:border-emerald-500/40 hover:text-emerald-300">
                WhatsApp
              </a>
              <a href={emailUrl} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-ink px-3 py-2 text-xs font-semibold text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                Email
              </a>
            </div>
          </section>

          {/* Actividad (placeholder) */}
          <section className="mt-4 rounded-3xl border border-line bg-card p-5">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
              <QrCode size={11} /> Actividad
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Aperturas" value="—" icon={<Eye size={12} />} />
              <MiniStat label="Me gustan" value="—" tone="ok" icon={<Heart size={12} />} />
              <MiniStat label="Rechazadas" value="—" tone="bad" icon={<X size={12} />} />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-paper-dim">
              <ChevronRight size={11} />
              Publicá el link para empezar a ver feedback en vivo.
            </div>
          </section>

        </aside>
      </div>
    </div>
  );
}

// ── Sub components ────────────────────────────────────────────────────────
function SidebarRow({ active, onClick, label, count, dot }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`group flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-brand/10 text-brand'
          : 'text-paper-mute hover:bg-hair/[0.05] hover:text-paper'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}
        <span className="truncate">{label}</span>
      </span>
      {typeof count === 'number' && (
        <span className={`shrink-0 font-mono text-[10px] ${active ? 'text-brand/70' : 'text-paper-dim'}`}>{count}</span>
      )}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{label}</span>
      {children}
    </label>
  );
}

function MiniStat({ label, value, tone, icon }) {
  const color = tone === 'ok' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-paper';
  return (
    <div className="rounded-xl border border-line bg-ink-2 p-2.5 text-center">
      <div className={`flex items-center justify-center gap-1 font-display text-lg font-bold tabular-nums ${color}`}>
        {icon}{value}
      </div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-paper-dim">{label}</div>
    </div>
  );
}

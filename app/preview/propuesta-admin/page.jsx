'use client';

// ─────────────────────────────────────────────────────────────────────────
// Editor de PROPUESTA (admin) — builder de looks en formato TRÍPTICO:
// Inspiración + Modelo real = Resultado IA. Al guardar escribe el draft
// en localStorage ('ls_propuesta_draft') y la vista pública
// /preview/propuesta renderiza exactamente lo que el dueño armó.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, ImagePlus, Search, X,
  Copy, Check, Eye, ExternalLink, Link as LinkIcon, Smartphone, Save,
} from 'lucide-react';
import { useProp, PROP_LANGS, PROP_LANG_LABELS, PROP_LANG_FLAG } from '@/lib/propuesta-i18n';

const DRAFT_KEY = 'ls_propuesta_draft';
const LAN_HOST = '10.0.0.67:3001';

const SM = (seed) => `https://picsum.photos/seed/${seed}/600/750`;
const LG = (seed) => `https://picsum.photos/seed/${seed}/900/1125`;

const LOOK_SEEDS = [
  { id: 'lk1', caption: 'Dubai · balcón · golden hour',   in: 'lsin-dubai',  re: 'lsre-01', ai: 'lsai-dubai' },
  { id: 'lk2', caption: 'Playa · golden hour · lifestyle', in: 'lsin-beach',  re: 'lsre-02', ai: 'lsai-beach' },
  { id: 'lk3', caption: 'Cafetería · luz matinal',         in: 'lsin-cafe',   re: 'lsre-03', ai: 'lsai-cafe' },
  { id: 'lk4', caption: 'Estudio · editorial · clean',     in: 'lsin-studio', re: 'lsre-04', ai: 'lsai-studio' },
  { id: 'lk5', caption: 'Piscina · mediodía · lifestyle',  in: 'lsin-pool',   re: 'lsre-05', ai: 'lsai-pool' },
  { id: 'lk6', caption: 'Noche urbana · neón',             in: 'lsin-night',  re: 'lsre-06', ai: 'lsai-night' },
];

const DEMO_LOOKS = LOOK_SEEDS.map((s) => ({
  id: s.id, caption: s.caption, inspiration: SM(s.in), real: SM(s.re), result: LG(s.ai),
}));

const BAUL_EXTRAS = [
  ['lsin-yacht',   'ref',    'Yate · atardecer'],
  ['lsin-mall',    'ref',    'Shopping · editorial'],
  ['lsin-gym',     'ref',    'Gimnasio · activewear'],
  ['lsin-rooftop', 'ref',    'Rooftop · blue hour'],
  ['lsre-07',      'selfie', 'Selfie · luz natural'],
  ['lsre-08',      'selfie', 'Selfie · espejo'],
  ['lsre-09',      'selfie', 'Selfie · exterior'],
  ['lsre-10',      'selfie', 'Selfie · interior'],
  ['lsai-yacht',   'ia',     'Yate · atardecer'],
  ['lsai-mall',    'ia',     'Shopping · editorial'],
  ['lsai-gym',     'ia',     'Gimnasio · activewear'],
  ['lsai-rooftop', 'ia',     'Rooftop · blue hour'],
];

const BAUL = [
  ...LOOK_SEEDS.flatMap((s) => [
    { id: `b-${s.in}`, src: SM(s.in), kind: 'ref',    caption: s.caption },
    { id: `b-${s.re}`, src: SM(s.re), kind: 'selfie', caption: s.caption },
    { id: `b-${s.ai}`, src: LG(s.ai), kind: 'ia',     caption: s.caption },
  ]),
  ...BAUL_EXTRAS.map(([seed, kind, caption]) => ({
    id: `b-${seed}`, src: kind === 'ia' ? LG(seed) : SM(seed), kind, caption,
  })),
];

const KIND_DOT = { ref: 'bg-amber-400', selfie: 'bg-emerald-400', ia: 'bg-brand' };
const SLOTS = [
  { key: 'inspiration', tKey: 'inspiration', dot: 'bg-amber-400',   kind: 'ref' },
  { key: 'real',        tKey: 'realModel',   dot: 'bg-emerald-400', kind: 'selfie' },
  { key: 'result',      tKey: 'aiResult',    dot: 'bg-brand',       kind: 'ia' },
];

const isComplete = (l) => Boolean(l.inspiration && l.real && l.result);

export default function PropuestaAdmin() {
  const t = useProp();

  const [name, setName] = useState('Selección editorial');
  const [subtitle, setSubtitle] = useState('Verano · 2026');
  const [intro, setIntro] = useState('Sentí el estilo antes de confirmar la sesión.');
  const [days, setDays] = useState(10);
  const [lang, setLang] = useState('es');
  const [code] = useState('JP-VE26-A31F');
  const [looks, setLooks] = useState(DEMO_LOOKS.map((l) => ({ ...l })));

  const [picker, setPicker] = useState(null);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerKind, setPickerKind] = useState('all');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const [proto, setProto] = useState('http:');
  const [host, setHost] = useState(LAN_HOST);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const current = window.location.host;
    const isLocal = /^(localhost|127\.)/.test(current);
    setHost(isLocal ? LAN_HOST : current);
    setProto(window.location.protocol);
  }, []);

  // Rehidrata el draft guardado: recargar el editor no debe pisar lo editado.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.v !== 1) return;
      if (typeof d.name === 'string') setName(d.name);
      if (typeof d.subtitle === 'string') setSubtitle(d.subtitle);
      if (typeof d.intro === 'string') setIntro(d.intro);
      if ([3, 7, 10, 14, 30].includes(d.days)) setDays(d.days);
      if (PROP_LANGS.includes(d.lang)) setLang(d.lang);
      if (Array.isArray(d.looks) && d.looks.length > 0) {
        setLooks(d.looks.map((l) => ({
          id: l.id, caption: l.caption || '',
          inspiration: l.inspiration || null, real: l.real || null, result: l.result || null,
        })));
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const publicUrl = `${proto}//${host}/preview/propuesta?lang=${lang}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(publicUrl)}`;

  const setLook = (id, patch) => setLooks((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLook = (id) => setLooks((s) => s.filter((l) => l.id !== id));
  const moveUp = (i) => setLooks((s) => { if (i === 0) return s; const a = [...s]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  const moveDown = (i) => setLooks((s) => { if (i === s.length - 1) return s; const a = [...s]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; });
  const addLook = () => setLooks((s) => [...s, {
    id: `lk-${Math.random().toString(36).slice(2, 8)}`, caption: '', inspiration: null, real: null, result: null,
  }]);

  const openPicker = (lookId, slot) => {
    setPicker({ lookId, slotKey: slot.key, slotLabel: t[slot.tKey] });
    setPickerKind(slot.kind);
    setPickerQ('');
  };
  const assign = (src) => {
    if (picker) setLook(picker.lookId, { [picker.slotKey]: src });
    setPicker(null);
  };

  const pickerItems = useMemo(() => BAUL.filter((p) => {
    if (pickerKind !== 'all' && p.kind !== pickerKind) return false;
    if (pickerQ && !p.caption.toLowerCase().includes(pickerQ.toLowerCase())) return false;
    return true;
  }), [pickerKind, pickerQ]);

  const completeCount = looks.filter(isComplete).length;

  const saveDraft = () => {
    if (completeCount === 0) return;
    const draft = {
      v: 1,
      name, subtitle, intro, lang, days, code,
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      looks: looks.filter(isComplete).map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* noop */ }
  };

  const saveAndView = () => {
    saveDraft();
    window.open(publicUrl, '_blank', 'noopener');
  };
  const saveOnly = () => {
    saveDraft();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-ink text-paper">

      {/* ═══════════ TOP BAR ═══════════ */}
      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/preview/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver a Presentaciones">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">Propuesta</span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand">{code}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t.draft}
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-3">
                <h1 className="truncate font-display text-xl font-bold tracking-tight text-paper">{name}</h1>
                <span className="hidden truncate font-medium italic text-paper-mute sm:inline">{subtitle}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute md:inline-flex">
              <span className={`h-1.5 w-1.5 rounded-full ${completeCount === looks.length && looks.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {completeCount}/{looks.length} {t.looks}
            </span>
            <button type="button" onClick={saveAndView} disabled={completeCount === 0} className="btn3d inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40">
              <Save size={15} /> {t.saveView}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ LAYOUT: config · builder · publicación ═══════════ */}
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-8">

        {/* ─── CONFIG (izq) ─── */}
        <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.details}</div>
            <div className="space-y-3.5">
              <Field label={t.pkgTitle}>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.subtitle}>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.introduction}>
                <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.expiresField}>
                <div className="flex items-center gap-1.5">
                  {[3, 7, 10, 14, 30].map((n) => (
                    <Chip key={n} active={days === n} onClick={() => setDays(n)} grow>{n}d</Chip>
                  ))}
                </div>
              </Field>
              <Field label={t.langField}>
                <div className="flex flex-wrap gap-1.5">
                  {PROP_LANGS.map((l) => (
                    <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
                      {PROP_LANG_FLAG[l]} {PROP_LANG_LABELS[l]}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          <section className="card3d flex items-center gap-3 rounded-2xl border border-line bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://picsum.photos/seed/jp/96/96" alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-bold text-paper">Julia Parker</div>
              <div className="truncate text-[11px] text-paper-mute">Kash Agency</div>
            </div>
          </section>
        </aside>

        {/* ─── BUILDER (centro) ─── */}
        <main className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
              {String(looks.length).padStart(2, '0')} {t.looks}
            </span>
            <span className="hidden text-[11px] italic text-paper-dim sm:block">{t.formula}</span>
          </div>

          <div className="space-y-4">
            {looks.map((l, i) => (
              <article key={l.id} className="card3d rounded-3xl border border-line bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[11px] font-bold text-paper-dim">{String(i + 1).padStart(2, '0')}</span>
                  <input
                    value={l.caption}
                    onChange={(e) => setLook(l.id, { caption: e.target.value })}
                    placeholder={t.captionPh}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-paper placeholder:text-paper-dim outline-none transition-colors focus:border-brand"
                  />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconBtn onClick={() => moveUp(i)} disabled={i === 0}><ChevronUp size={14} /></IconBtn>
                    <IconBtn onClick={() => moveDown(i)} disabled={i === looks.length - 1}><ChevronDown size={14} /></IconBtn>
                    <IconBtn danger onClick={() => removeLook(l.id)}><Trash2 size={14} /></IconBtn>
                  </div>
                </div>

                <div className="flex items-stretch">
                  {SLOTS.map((slot, si) => (
                    <SlotFragment key={slot.key} first={si === 0} sign={si === 1 ? '+' : '='}>
                      <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${slot.dot}`} />
                        <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper-mute">{t[slot.tKey]}</span>
                      </div>
                      {l[slot.key] ? (
                        <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-ink-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l[slot.key]} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" onClick={() => openPicker(l.id, slot)} className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-ink">
                              {t.change}
                            </button>
                            <button type="button" onClick={() => setLook(l.id, { [slot.key]: null })} className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/85">
                              {t.remove}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPicker(l.id, slot)}
                          className="grid aspect-[4/5] w-full place-items-center rounded-2xl border-2 border-dashed border-line text-paper-dim transition-colors hover:border-brand/50 hover:text-paper-mute"
                        >
                          <span className="flex flex-col items-center gap-1.5 px-2 text-center">
                            <ImagePlus size={18} />
                            <span className="text-[10px] font-medium leading-tight">{t.pickFromVault}</span>
                          </span>
                        </button>
                      )}
                    </SlotFragment>
                  ))}
                </div>

                {!isComplete(l) && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-paper-mute">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t.lookEmpty}
                  </div>
                )}
              </article>
            ))}

            <button
              type="button"
              onClick={addLook}
              className="grid w-full place-items-center rounded-3xl border-2 border-dashed border-line py-8 text-paper-mute transition-colors hover:border-brand/50 hover:text-paper"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold"><Plus size={16} /> {t.addLook}</span>
            </button>
          </div>
        </main>

        {/* ─── PUBLICACIÓN (der, sticky) ─── */}
        <aside className="w-full shrink-0 space-y-4 lg:sticky lg:top-[89px] lg:w-[330px] lg:self-start">
          <section className="card3d rounded-3xl border border-brand/40 bg-gradient-to-br from-brand/[0.10] to-brand/[0.02] p-5 shadow-glow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-on-accent shadow-glow-sm">
                <LinkIcon size={17} />
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-bold">{t.shareLink}</div>
                <div className="truncate text-[11px] text-paper-mute">{t.publicAnon} · {days}d</div>
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
                type="button"
                onClick={copyLink}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-brand text-on-accent hover:scale-105'
                }`}
              >
                {copied ? <><Check size={13} /> {t.copied}</> : <><Copy size={13} /> {t.copy}</>}
              </button>
            </div>

            <div className="mb-3 rounded-2xl border border-line bg-ink p-4">
              <div className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                <Smartphone size={11} /> {t.scanPhone}
              </div>
              <div className="grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" className="h-44 w-44 rounded-lg" />
              </div>
            </div>

            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              onClick={saveDraft}
              className="btn3d mb-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
            >
              <Eye size={15} /> {t.viewAsClient} <ExternalLink size={12} className="opacity-60" />
            </a>
            <button
              type="button"
              onClick={saveOnly}
              disabled={completeCount === 0}
              className="btn3d-ghost inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
            >
              <Save size={14} /> {t.save}
            </button>
            {saved && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /> {t.savedOk}
              </div>
            )}
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">{t.activity}</div>
            <div className="space-y-2">
              <StatRow dot="bg-brand" label={t.opens} value="3" />
              <StatRow dot="bg-emerald-400" label={t.liked} value="8" />
              <StatRow dot="bg-rose-400" label={t.rejected} value="2" />
              <StatRow dot="bg-zinc-400" label={t.comments} value="4" />
            </div>
          </section>
        </aside>
      </div>

      {/* ═══════════ PICKER DEL BAÚL (modal) ═══════════ */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPicker(null)}
        >
          <div
            className="card3d flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <div className="truncate font-display text-base font-bold text-paper">
                  {t.pickFromVault} — {picker.slotLabel}
                </div>
                <div className="text-[11px] text-paper-mute">Julia Parker · {BAUL.length} {t.files}</div>
              </div>
              <button type="button" onClick={() => setPicker(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper">
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
              <div className="relative min-w-0 flex-1 basis-48">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
                <input
                  value={pickerQ}
                  onChange={(e) => setPickerQ(e.target.value)}
                  placeholder={t.searchVault}
                  className="w-full rounded-xl border border-line bg-ink-2 py-2 pl-8 pr-3 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Chip active={pickerKind === 'all'} onClick={() => setPickerKind('all')}>{t.tipoAll}</Chip>
                <Chip active={pickerKind === 'ref'} onClick={() => setPickerKind('ref')} dot="bg-amber-400">{t.tipoRef}</Chip>
                <Chip active={pickerKind === 'selfie'} onClick={() => setPickerKind('selfie')} dot="bg-emerald-400">{t.tipoSelfie}</Chip>
                <Chip active={pickerKind === 'ia'} onClick={() => setPickerKind('ia')} dot="bg-brand">{t.tipoIa}</Chip>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {pickerItems.length === 0 ? (
                <div className="grid place-items-center py-16 text-sm text-paper-mute">—</div>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                  {pickerItems.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => assign(p.src)}
                      className="group relative overflow-hidden rounded-xl border border-line bg-ink-2 transition-colors hover:border-brand/60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt="" className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[p.kind]}`} />
                          <span className="line-clamp-1 text-left text-[9px] font-medium text-white/85">{p.caption}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub components ────────────────────────────────────────────────────────
function SlotFragment({ first, sign, children }) {
  return (
    <>
      {!first && (
        <div className="z-10 -mx-3 self-center">
          <span className="grid h-7 w-7 place-items-center rounded-full border border-line bg-ink font-mono text-sm font-bold text-paper-mute">
            {sign}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </>
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

function Chip({ active, onClick, dot, grow, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${grow ? 'flex-1' : ''} ${
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

function IconBtn({ onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`grid h-8 w-8 place-items-center rounded-lg text-paper-mute transition-colors disabled:opacity-30 ${
        danger ? 'hover:bg-rose-500/10 hover:text-rose-300' : 'hover:bg-hair/10 hover:text-paper'
      }`}
    >
      {children}
    </button>
  );
}

function StatRow({ dot, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-3 py-2">
      <span className="flex min-w-0 items-center gap-2 text-sm text-paper">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-paper">{value}</span>
    </div>
  );
}

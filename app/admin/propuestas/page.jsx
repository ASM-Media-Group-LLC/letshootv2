'use client';

// ─────────────────────────────────────────────────────────────────────────
// Editor de PROPUESTA (admin) — wizard de 4 pasos: Destinatario → Molde →
// Fotos → Link. Al publicar escribe el draft en localStorage
// ('ls_propuesta_draft') y la vista pública /p/demo renderiza
// exactamente lo que el dueño armó, personalizado para el destinatario.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, Trash2, Plus,
  ImagePlus, Search, X, Copy, Eye, ExternalLink, Link as LinkIcon,
  Smartphone, Mail, MessageCircle,
} from 'lucide-react';
import { useProp, PROP_LANGS, PROP_LANG_LABELS, PROP_LANG_FLAG } from '@/lib/propuesta-i18n';

const DRAFT_KEY = 'ls_propuesta_draft';
const FEEDBACK_KEY = 'ls_propuesta_feedback';
const LAN_HOST = '10.0.0.67:3001';

// Países para el teléfono del destinatario (Telegram/WhatsApp). Default CO.
const COUNTRIES = [
  { flag: '🇨🇴', code: 'CO', dial: '+57' },
  { flag: '🇺🇸', code: 'US', dial: '+1' },
  { flag: '🇲🇽', code: 'MX', dial: '+52' },
  { flag: '🇦🇷', code: 'AR', dial: '+54' },
  { flag: '🇪🇸', code: 'ES', dial: '+34' },
  { flag: '🇩🇪', code: 'DE', dial: '+49' },
  { flag: '🇮🇹', code: 'IT', dial: '+39' },
  { flag: '🇫🇷', code: 'FR', dial: '+33' },
  { flag: '🇬🇧', code: 'GB', dial: '+44' },
  { flag: '🇧🇷', code: 'BR', dial: '+55' },
  { flag: '🇵🇪', code: 'PE', dial: '+51' },
  { flag: '🇨🇱', code: 'CL', dial: '+56' },
  { flag: '🇻🇪', code: 'VE', dial: '+58' },
  { flag: '🇪🇨', code: 'EC', dial: '+593' },
  { flag: '🇺🇾', code: 'UY', dial: '+598' },
  { flag: '🇵🇦', code: 'PA', dial: '+507' },
  { flag: '🇨🇷', code: 'CR', dial: '+506' },
  { flag: '🇩🇴', code: 'DO', dial: '+1' },
];

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

const DEMO_RECIPIENT = { name: 'Valentina Ríos', email: 'valentina@email.com', kind: 'prospect' };
const DEMO_COVER = LG('lsai-dubai');
const DEMO_CLOSING = LG('lsai-night');

const TEMPLATES = {
  exclusive: (n) => ({
    name: 'Contenido que engancha',
    subtitle: 'Julia Parker × LetShoot',
    intro: `${n}, esto es contenido de enganche para tus fans: fotos pensadas para traer tráfico, sumar suscriptores y mantener tu página viva — sin sesión, sin viajes, sin logística. Elegí los looks que quieras para tu feed.`,
  }),
  normal: (n) => ({
    name: 'Selección editorial',
    subtitle: 'Verano · 2026',
    intro: `${n}, esto es para tu marca personal: fotos editoriales para redes, prensa y colaboraciones. Sentí el estilo antes de confirmar la sesión y contanos qué te gusta.`,
  }),
};

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
const pad2 = (n) => String(n).padStart(2, '0');

export default function PropuestaAdmin() {
  const t = useProp();

  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState({ ...DEMO_RECIPIENT });
  const [phoneCountry, setPhoneCountry] = useState('CO');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [template, setTemplate] = useState('exclusive');
  const [coverUrl, setCoverUrl] = useState(DEMO_COVER);
  const [closingUrl, setClosingUrl] = useState(DEMO_CLOSING);

  const [name, setName] = useState(TEMPLATES.exclusive('Valentina').name);
  const [subtitle, setSubtitle] = useState(TEMPLATES.exclusive('Valentina').subtitle);
  const [intro, setIntro] = useState(TEMPLATES.exclusive('Valentina').intro);
  const [days, setDays] = useState(10);
  const [lang, setLang] = useState('es');
  const [code] = useState('JP-VE26-A31F');
  const [looks, setLooks] = useState(DEMO_LOOKS.map((l) => ({ ...l })));
  const [selectedId, setSelectedId] = useState(DEMO_LOOKS[0]?.id ?? null);

  const [picker, setPicker] = useState(null);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerKind, setPickerKind] = useState('all');
  const [copied, setCopied] = useState(false);
  const [copyTouched, setCopyTouched] = useState(false);

  // El link/preview usa SIEMPRE el origen actual (el draft vive en localStorage
  // de este origen); la IP LAN queda solo para el QR del teléfono en local.
  const [proto, setProto] = useState('http:');
  const [host, setHost] = useState(LAN_HOST);
  const [isLocal, setIsLocal] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHost(window.location.host);
    setIsLocal(/^(localhost|127\.)/.test(window.location.host));
    setProto(window.location.protocol);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d?.v !== 1) return;
      if (typeof d.name === 'string') setName(d.name);
      if (typeof d.subtitle === 'string') setSubtitle(d.subtitle);
      if (typeof d.intro === 'string') setIntro(d.intro);
      setCopyTouched(true);
      if ([3, 7, 10, 14, 30].includes(d.days)) setDays(d.days);
      if (PROP_LANGS.includes(d.lang)) setLang(d.lang);
      if (d.template === 'exclusive' || d.template === 'normal') setTemplate(d.template);
      if (typeof d.coverUrl === 'string' || d.coverUrl === null) setCoverUrl(d.coverUrl);
      if (typeof d.closingUrl === 'string' || d.closingUrl === null) setClosingUrl(d.closingUrl);
      if (d.recipient && typeof d.recipient.name === 'string') {
        setRecipient({
          name: d.recipient.name,
          email: typeof d.recipient.email === 'string' ? d.recipient.email : '',
          kind: ['prospect', 'client', 'model'].includes(d.recipient.kind) ? d.recipient.kind : 'prospect',
        });
        if (typeof d.recipient.phone === 'string' && d.recipient.phone.trim()) {
          const ph = d.recipient.phone.trim();
          const match = [...COUNTRIES]
            .sort((a, b) => b.dial.length - a.dial.length)
            .find((c) => ph.startsWith(c.dial));
          if (match) {
            setPhoneCountry(match.code);
            setPhoneLocal(ph.slice(match.dial.length).trim());
          } else {
            setPhoneCountry('CO');
            setPhoneLocal(ph);
          }
        }
      }
      if (Array.isArray(d.looks) && d.looks.length > 0) {
        const seeded = d.looks.map((l) => ({
          id: l.id, caption: l.caption || '',
          inspiration: l.inspiration || null, real: l.real || null, result: l.result || null,
        }));
        setLooks(seeded);
        setSelectedId(seeded[0]?.id ?? null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const firstName = (recipient.name || '').trim().split(/\s+/)[0] || '';
  const publicUrl = `${proto}//${host}/p/demo?lang=${lang}`;
  const qrTarget = isLocal ? `${proto}//${LAN_HOST}/p/demo?lang=${lang}` : publicUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(qrTarget)}`;
  const greet = firstName ? `Hola ${firstName}!` : 'Hola!';
  const dial = COUNTRIES.find((c) => c.code === phoneCountry)?.dial ?? '+57';
  const fullPhone = phoneLocal.trim() ? `${dial} ${phoneLocal.trim()}` : '';
  const phoneDigits = fullPhone.replace(/\D/g, '');
  const waText = encodeURIComponent(`${greet} Te preparé una propuesta: ${name}. Mirala acá: ${publicUrl}`);
  const waHref = phoneDigits ? `https://wa.me/${phoneDigits}?text=${waText}` : `https://wa.me/?text=${waText}`;
  const mailHref = `mailto:${recipient.email.trim()}?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(`${greet}\n\nTe preparé una propuesta: ${name}.\nMirala acá: ${publicUrl}`)}`;

  const setLook = (id, patch) => setLooks((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLook = (id) => setLooks((s) => s.filter((l) => l.id !== id));
  const moveUp = (i) => setLooks((s) => { if (i === 0) return s; const a = [...s]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });
  const moveDown = (i) => setLooks((s) => { if (i === s.length - 1) return s; const a = [...s]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; return a; });
  const addLook = () => {
    const id = `lk-${Math.random().toString(36).slice(2, 8)}`;
    setLooks((s) => [...s, { id, caption: '', inspiration: null, real: null, result: null }]);
    setSelectedId(id);
  };

  // Mientras el dueño no toque los textos a mano, el preset del molde se
  // regenera solo al cambiar de destinatario o de molde (nombre siempre actual).
  // El primer run se saltea: en el mount este effect encolaría el preset demo
  // DESPUÉS de los setState de la rehidratación y pisaría el draft guardado.
  const firstRegen = useRef(true);
  useEffect(() => {
    if (firstRegen.current) { firstRegen.current = false; return; }
    if (copyTouched) return;
    const preset = TEMPLATES[template](firstName || 'Hola');
    setName(preset.name);
    setSubtitle(preset.subtitle);
    setIntro(preset.intro);
  }, [copyTouched, template, firstName]);

  const pickTemplate = (tpl) => {
    setTemplate(tpl);
    setCopyTouched(false);
    const preset = TEMPLATES[tpl](firstName || 'Hola');
    setName(preset.name);
    setSubtitle(preset.subtitle);
    setIntro(preset.intro);
  };

  const openPicker = (lookId, slot) => {
    setPicker({ target: 'look', lookId, slotKey: slot.key, slotLabel: t[slot.tKey] });
    setPickerKind(slot.kind);
    setPickerQ('');
  };
  const openFramePicker = (target) => {
    setPicker({ target, slotLabel: target === 'cover' ? t.coverPhoto : t.closingPhoto });
    setPickerKind('ia');
    setPickerQ('');
  };
  const assign = (src) => {
    if (picker) {
      if (picker.target === 'cover') setCoverUrl(src);
      else if (picker.target === 'closing') setClosingUrl(src);
      else setLook(picker.lookId, { [picker.slotKey]: src });
    }
    setPicker(null);
  };

  const pickerItems = useMemo(() => BAUL.filter((p) => {
    if (pickerKind !== 'all' && p.kind !== pickerKind) return false;
    if (pickerQ && !p.caption.toLowerCase().includes(pickerQ.toLowerCase())) return false;
    return true;
  }), [pickerKind, pickerQ]);

  const completeCount = looks.filter(isComplete).length;
  const selIdx = looks.findIndex((l) => l.id === selectedId);
  const selected = looks[selIdx >= 0 ? selIdx : 0];
  const lookNo = selected ? pad2((selIdx >= 0 ? selIdx : 0) + 1) : '00';

  const saveDraft = () => {
    if (completeCount === 0) return;
    const draft = {
      v: 1,
      name, subtitle, intro, lang, days, code,
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      model: { name: 'Julia Parker', agency: 'Kash Agency' },
      recipient: { name: recipient.name.trim(), email: recipient.email.trim(), phone: fullPhone, kind: recipient.kind },
      template,
      coverUrl: coverUrl || null,
      closingUrl: closingUrl || null,
      looks: looks.filter(isComplete).map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
    };
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
  };

  useEffect(() => {
    if (step === 4) saveDraft();
  }, [step]);

  // Respuestas de la persona: en el paso 4 leemos el feedback que la vista
  // pública dejó en localStorage y refrescamos cada 5s (si responde en otra
  // pestaña, el admin lo ve sin recargar).
  useEffect(() => {
    if (step !== 4) return;
    const load = () => {
      try {
        const raw = localStorage.getItem(FEEDBACK_KEY);
        if (!raw) { setFeedback(null); return; }
        const f = JSON.parse(raw);
        setFeedback(f?.v === 1 && Array.isArray(f.items) ? f : null);
      } catch { setFeedback(null); }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [step]);

  const fbItems = feedback?.items ?? [];
  const fbLiked = fbItems.filter((i) => i.status === 'liked').length;
  const fbRejected = fbItems.filter((i) => i.status === 'rejected').length;
  const fbNotes = fbItems.filter((i) => (i.note || '').trim()).length;

  const canNext = step === 1
    ? recipient.name.trim().length > 0
    : step === 3
      ? completeCount > 0
      : step < 4;

  const goNext = () => {
    if (step >= 4 || !canNext) return;
    if (step === 3) saveDraft();
    setStep(step + 1);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const steps = [t.stepWho, t.stepMold, t.stepPhotos, t.stepLink];

  return (
    <div className="min-h-screen bg-ink text-paper">

      <header className="sticky top-0 z-30 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute sm:inline">Propuesta</span>
                <span className="hidden whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand sm:inline">{code}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">
                  <span className={`h-1.5 w-1.5 rounded-full ${step === 4 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {step === 4 ? t.published : t.draft}
                </span>
              </div>
              <h1 className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-paper">{name}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {steps.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { if (done) setStep(n); }}
                    className={`flex items-center gap-2 rounded-full px-1 transition-opacity ${active || done ? '' : 'pointer-events-none opacity-45'}`}
                  >
                    <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] font-bold transition-all ${
                      active ? 'bg-brand text-on-accent shadow-glow-sm' : done ? 'bg-brand/20 text-brand' : 'border border-line text-paper-mute'
                    }`}>
                      {done ? <Check size={13} /> : n}
                    </span>
                    <span className={`text-sm font-semibold ${active ? 'text-paper' : 'text-paper-mute'}`}>{label}</span>
                  </button>
                  {n < 4 && <div className={`h-px w-5 ${done ? 'bg-brand/40' : 'bg-line'}`} />}
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {step === 3 && (
              <span className="hidden items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute sm:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${completeCount === looks.length && looks.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {completeCount}/{looks.length} {t.looks}
              </span>
            )}
            {(step === 2 || step === 3) && (
              <button
                type="button"
                onClick={() => { saveDraft(); window.open(publicUrl, '_blank', 'noopener'); }}
                disabled={completeCount === 0}
                className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold disabled:pointer-events-none disabled:opacity-40 sm:px-4 sm:text-sm"
              >
                <Eye size={14} /> <span className="hidden sm:inline">{t.viewAsClient}</span><span className="sm:hidden">{t.previewLbl}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {step === 1 && (
        <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-10">
          <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-paper">{t.whoTitle}</h2>
            <p className="mt-1.5 text-sm text-paper-mute">{t.whoSub}</p>
            <div className="mt-6 space-y-4">
              <Field label={t.recipName}>
                <input
                  value={recipient.name}
                  onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))}
                  placeholder={t.recipNamePh}
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </Field>
              <Field label={t.recipEmail}>
                <input
                  value={recipient.email}
                  onChange={(e) => setRecipient((r) => ({ ...r, email: e.target.value }))}
                  placeholder={t.recipEmailPh}
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </Field>
              <Field label={t.phone}>
                <div className="flex items-center gap-2">
                  <div className="relative w-[110px] shrink-0">
                    <select
                      value={phoneCountry}
                      onChange={(e) => setPhoneCountry(e.target.value)}
                      aria-label={t.country}
                      className="w-full appearance-none rounded-xl border border-line bg-ink-2 py-2.5 pl-3 pr-7 text-sm text-paper outline-none focus:border-brand/60"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                  </div>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^\d\s+]/g, '');
                      const dial = COUNTRIES.find((c) => c.code === phoneCountry)?.dial;
                      if (dial && v.trim().startsWith(dial)) v = v.trim().slice(dial.length).trim();
                      setPhoneLocal(v.replace(/\+/g, ''));
                    }}
                    placeholder="300 123 4567"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                  />
                </div>
              </Field>
              <Field label={t.recipKind}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip active={recipient.kind === 'prospect'} onClick={() => setRecipient((r) => ({ ...r, kind: 'prospect' }))}>{t.kindProspect}</Chip>
                  <Chip active={recipient.kind === 'client'} onClick={() => setRecipient((r) => ({ ...r, kind: 'client' }))}>{t.kindClient}</Chip>
                  <Chip active={recipient.kind === 'model'} onClick={() => setRecipient((r) => ({ ...r, kind: 'model' }))}>{t.kindModel}</Chip>
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
        </div>
      )}

      {step === 2 && (
        <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-paper">{t.moldTitle}</h2>
            <p className="mt-1.5 text-sm text-paper-mute">{t.moldSub}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['exclusive', 'normal'].map((tpl) => {
              const active = template === tpl;
              return (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => pickTemplate(tpl)}
                  className={`card3d relative rounded-3xl border bg-card p-5 text-left transition-all ${
                    active ? 'border-brand ring-1 ring-brand/50 shadow-glow-sm' : 'border-line hover:border-hair'
                  }`}
                >
                  {active && (
                    <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand text-on-accent">
                      <Check size={13} />
                    </span>
                  )}
                  <div className="font-display text-base font-bold text-paper">{tpl === 'exclusive' ? t.tplExclusive : t.tplNormal}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-paper-mute">{tpl === 'exclusive' ? t.tplExclusiveSub : t.tplNormalSub}</div>
                </button>
              );
            })}
          </div>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="space-y-3.5">
              <Field label={t.pkgTitle}>
                <input value={name} onChange={(e) => { setName(e.target.value); setCopyTouched(true); }} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.subtitle}>
                <input value={subtitle} onChange={(e) => { setSubtitle(e.target.value); setCopyTouched(true); }} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.introduction}>
                <textarea value={intro} onChange={(e) => { setIntro(e.target.value); setCopyTouched(true); }} rows={3} className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
            </div>
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t.langField}>
                <div className="flex flex-wrap gap-1.5">
                  {PROP_LANGS.map((l) => (
                    <Chip key={l} active={lang === l} onClick={() => setLang(l)}>
                      {PROP_LANG_FLAG[l]} {PROP_LANG_LABELS[l]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label={t.expiresField}>
                <div className="flex items-center gap-1.5">
                  {[3, 7, 10, 14, 30].map((n) => (
                    <Chip key={n} active={days === n} onClick={() => setDays(n)} grow>{n}d</Chip>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="flex flex-wrap gap-6">
              <FrameSlot
                label={t.coverPhoto}
                url={coverUrl}
                changeLbl={t.change}
                removeLbl={t.remove}
                pickLbl={t.pickFromVault}
                onPick={() => openFramePicker('cover')}
                onClear={() => setCoverUrl(null)}
              />
              <FrameSlot
                label={t.closingPhoto}
                url={closingUrl}
                changeLbl={t.change}
                removeLbl={t.remove}
                pickLbl={t.pickFromVault}
                onPick={() => openFramePicker('closing')}
                onClear={() => setClosingUrl(null)}
              />
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <div className="mx-auto flex w-full max-w-[1200px] items-start gap-6 px-4 py-8 lg:px-8">
          <main className="min-w-0 flex-1">
            <div className="mb-4 flex items-end justify-between gap-3 px-1">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-paper">{t.photosTitle}</h2>
                <p className="mt-1 hidden text-[12px] italic text-paper-dim sm:block">{t.formula}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
                {pad2(looks.length)} {t.looks}
              </span>
            </div>

            <div className="space-y-3">
              {looks.map((l, i) => (
                <article
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`card3d cursor-pointer rounded-3xl border bg-card p-3.5 transition-colors ${
                    selected?.id === l.id ? 'border-brand/60' : 'border-line hover:border-hair'
                  }`}
                >
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="shrink-0 font-mono text-[11px] font-bold text-paper-dim">{pad2(i + 1)}</span>
                    <input
                      value={l.caption}
                      onChange={(e) => setLook(l.id, { caption: e.target.value })}
                      placeholder={t.captionPh}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-paper placeholder:text-paper-dim outline-none transition-colors focus:border-brand"
                    />
                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconBtn onClick={() => moveUp(i)} disabled={i === 0}><ChevronUp size={14} /></IconBtn>
                      <IconBtn onClick={() => moveDown(i)} disabled={i === looks.length - 1}><ChevronDown size={14} /></IconBtn>
                      <IconBtn danger onClick={() => removeLook(l.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                  </div>

                  <div className="flex items-stretch">
                    {SLOTS.map((slot, si) => (
                      <SlotFragment key={slot.key} first={si === 0} sign={si === 1 ? '+' : '='} small>
                        <div className="mb-1 flex items-center gap-1 px-0.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${slot.dot}`} />
                          <span className="truncate font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-paper-mute">{t[slot.tKey]}</span>
                        </div>
                        {l[slot.key] ? (
                          <div className="group relative h-28 overflow-hidden rounded-xl border border-line bg-ink-2 sm:h-32">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l[slot.key]} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <button type="button" onClick={(e) => { e.stopPropagation(); openPicker(l.id, slot); }} className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold text-ink">
                                {t.change}
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setLook(l.id, { [slot.key]: null }); }} className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white/85">
                                {t.remove}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openPicker(l.id, slot); }}
                            className="grid h-28 w-full place-items-center rounded-xl border-2 border-dashed border-line text-paper-dim transition-colors hover:border-brand/50 hover:text-paper-mute sm:h-32"
                          >
                            <span className="flex flex-col items-center gap-1 px-2 text-center">
                              <ImagePlus size={15} />
                              <span className="text-[9px] font-medium leading-tight">{t.pickFromVault}</span>
                            </span>
                          </button>
                        )}
                      </SlotFragment>
                    ))}
                  </div>

                  {!isComplete(l) && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t.lookEmpty}
                    </div>
                  )}
                </article>
              ))}

              <button
                type="button"
                onClick={addLook}
                className="grid w-full place-items-center rounded-3xl border-2 border-dashed border-line py-6 text-paper-mute transition-colors hover:border-brand/50 hover:text-paper"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold"><Plus size={16} /> {t.addLook}</span>
              </button>
            </div>
          </main>

          <aside className="hidden w-[340px] shrink-0 lg:block">
            <div className="lg:sticky lg:top-[97px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.livePreview}</span>
                <span className="font-mono text-[10px] text-paper-dim">{t.look} {lookNo}</span>
              </div>
              <div className="card3d overflow-hidden rounded-3xl border border-line bg-black p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.24em] text-white/40">{t.privateSel}</span>
                  <span className="font-mono text-[8px] text-white/30">Julia Parker</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {SLOTS.map((slot, si) => (
                    <div key={slot.key} className="contents">
                      {si > 0 && (
                        <span className="mt-4 shrink-0 font-mono text-[10px] font-bold text-white/40">{si === 1 ? '+' : '='}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-1">
                          <span className={`h-1 w-1 shrink-0 rounded-full ${slot.dot}`} />
                          <span className="truncate font-mono text-[7px] font-semibold uppercase tracking-[0.18em] text-white/45">{t[slot.tKey]}</span>
                        </div>
                        {selected?.[slot.key] ? (
                          <div className="h-14 overflow-hidden rounded-lg bg-white/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selected[slot.key]} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="grid h-14 place-items-center rounded-lg bg-white/5 text-white/20">
                            <ImagePlus size={12} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl bg-white/5">
                  {selected?.result ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.result} alt="" className="aspect-[4/5] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[4/5] w-full place-items-center text-white/20">
                      <ImagePlus size={22} />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-semibold text-white">{selected?.caption || '—'}</span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                    {t.look} {lookNo} · {pad2(looks.length)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {step === 4 && (
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <h2 className="font-display text-2xl font-bold tracking-tight text-paper">{t.linkTitle}</h2>
            </div>
            <p className="mt-1.5 text-sm text-paper-mute">{t.linkSub}</p>
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
              {t.preparedFor} <span className="text-brand">{recipient.name}</span>
            </p>
          </div>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
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

            <div className="mb-4 rounded-2xl border border-line bg-ink p-4">
              <div className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                <Smartphone size={11} /> {t.scanPhone}
              </div>
              <div className="grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" className="h-40 w-40 rounded-lg" />
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
            <div className="grid grid-cols-2 gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="btn3d-ghost inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold"
              >
                <MessageCircle size={14} /> {t.sendWhatsApp}
              </a>
              <a
                href={mailHref}
                className="btn3d-ghost inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold"
              >
                <Mail size={14} /> {t.sendEmail}
              </a>
            </div>
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate font-display text-base font-bold text-paper">
                {t.responsesOf} {feedback?.recipientName || recipient.name}
              </h3>
              {feedback && (
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">
                  {new Date(feedback.at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {!feedback ? (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper-mute">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" /> {t.noResponses}
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2 font-mono text-[11px] font-bold tabular-nums text-paper">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {fbLiked}
                  </span>
                  <span className="text-paper-dim">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> {fbRejected}
                  </span>
                  <span className="text-paper-dim">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> {fbNotes}
                  </span>
                </div>
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {fbItems.map((it) => (
                    <div key={it.id} className="flex items-start gap-3 rounded-xl border border-line bg-ink-2 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.result} alt="" className="h-12 w-10 shrink-0 rounded-md object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-paper">{it.caption || '—'}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-paper-mute">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            it.status === 'liked' ? 'bg-emerald-400' : it.status === 'rejected' ? 'bg-rose-400' : 'bg-zinc-400'
                          }`} />
                          {it.status === 'liked' ? t.like : it.status === 'rejected' ? t.reject : t.noMark}
                        </div>
                        {(it.note || '').trim() && (
                          <p className="mt-1 text-[12px] italic leading-relaxed text-paper-mute">{it.note.trim()}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="space-y-2">
              <StatRow dot="bg-brand" label={t.looks} value={String(completeCount)} />
              <StatRow dot="bg-amber-400" label={t.expiresField} value={`${days}d · ${new Date(Date.now() + days * 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`} />
              <StatRow dot="bg-zinc-400" label={t.langField} value={`${PROP_LANG_FLAG[lang]} ${PROP_LANG_LABELS[lang]}`} />
            </div>
          </section>
        </div>
      )}

      <div className="sticky bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-paper-mute transition-colors hover:border-brand/40 hover:text-paper disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft size={15} /> {t.back}
          </button>
          <div className="hidden font-mono text-[10px] uppercase tracking-[0.24em] text-paper-dim sm:block">
            {steps[step - 1]} — <span className="text-brand">{step}/4</span>
          </div>
          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
            >
              {step === 3 ? t.publishNow : t.next} <ArrowRight size={15} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t.savedOk}
            </span>
          )}
        </div>
      </div>

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

function FrameSlot({ label, url, changeLbl, removeLbl, pickLbl, onPick, onClear }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{label}</div>
      {url ? (
        <div className="group relative h-40 aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-ink-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={onPick} className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-ink">{changeLbl}</button>
            <button type="button" onClick={onClear} className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/85">{removeLbl}</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="grid h-40 aspect-[4/5] place-items-center rounded-2xl border-2 border-dashed border-line text-paper-dim transition-colors hover:border-brand/50 hover:text-paper-mute"
        >
          <span className="flex flex-col items-center gap-1.5 px-2 text-center">
            <ImagePlus size={16} />
            <span className="text-[9px] font-medium leading-tight">{pickLbl}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function SlotFragment({ first, sign, small, children }) {
  return (
    <>
      {!first && (
        <div className={`z-10 self-center ${small ? '-mx-2' : '-mx-3'}`}>
          <span className={`grid place-items-center rounded-full border border-line bg-ink font-mono font-bold text-paper-mute ${
            small ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-sm'
          }`}>
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
      onClick={(e) => { e.stopPropagation(); onClick(); }}
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

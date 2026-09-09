'use client';

// ─────────────────────────────────────────────────────────────────────────
// Editor de PROPUESTA (admin) — wizard de 4 pasos: Destinatario → Molde →
// Fotos → Link. Al publicar genera un CODE nuevo (link único por publicación),
// escribe la propuesta en 'ls_prop_<CODE>' + 'ls_prop_last', y la vista
// pública /p/<CODE> renderiza exactamente lo que el dueño armó. El draft de
// trabajo sigue en 'ls_propuesta_draft' (preview /p/demo en pasos 2-3).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, Trash2, Plus,
  ImagePlus, Search, X, Copy, Eye, ExternalLink, Link as LinkIcon,
  Smartphone, Mail,
} from 'lucide-react';
import { useProp, propDict, PROP_LANGS, PROP_LANG_LABELS, PROP_LANG_FLAG } from '@/lib/propuesta-i18n';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';

const DRAFT_KEY = 'ls_propuesta_draft';
const LAST_KEY = 'ls_prop_last';
const LAN_HOST = '10.0.0.67:3001';

// CODE de propuesta: uno NUEVO por cada publicación (el link cambia cada vez).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCode = () =>
  'JP-' + Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

const EMAIL_RE = /.+@.+\..+/;

// Fotos reales de /public — mismo mapeo que la vista pública /p/[linkId].
const DEMO_LOOKS = [
  { id: 'lk1', caption: 'Miami · Ocean Drive · golden hour', inspiration: '/card-locacion.jpg',      real: '/ba-before-1.jpg',        result: '/model-latina.jpg' },
  { id: 'lk2', caption: 'Resort · piscina · lifestyle',      inspiration: '/card-localizacion.jpg',  real: '/result-5.jpg',           result: '/model-resort.jpg' },
  { id: 'lk3', caption: 'Noche urbana · neón',               inspiration: '/card-hd.jpg',            real: '/hero-real.jpg',          result: '/model-noche.jpg' },
  { id: 'lk4', caption: 'Editorial · moda',                  inspiration: '/card-moda.jpg',          real: '/ba-after-1.jpg',         result: '/model-europea.jpg' },
  { id: 'lk5', caption: 'Estudio · estilista',               inspiration: '/card-estilista.jpg',     real: '/ba-after-2.jpg',         result: '/result-4.jpg' },
  { id: 'lk6', caption: 'Cinemática · IA',                   inspiration: '/hero-poster.jpg',        real: '/hero-miami-poster.jpg',  result: '/hero-ia.jpg' },
];

// Portada por defecto = lifestyle Miami (fallback si la modelo no tiene foto).
const DEMO_COVER = '/model-latina.jpg';   // Miami · golden hour
const DEMO_CLOSING = '/model-resort.jpg'; // resort · piscina · lifestyle

// Molde de textos: hoy hay UN solo tipo — "Contenido de redes". El copy sale
// del diccionario en el IDIOMA DEL LINK (propDict(lang)), así los textos por
// defecto cambian con el idioma. Sin nombre del destinatario ni de la modelo.
// (El "contenido exclusivo" queda para más adelante.)
const presetFor = (lang) => {
  const d = propDict(lang);
  return { name: d.redesName, subtitle: d.redesSubtitle, intro: d.redesIntro };
};

const BAUL_EXTRAS = [
  ['/hero-stage-1.jpg', 'ia', 'Cinemática · escena 1'],
  ['/hero-stage-2.jpg', 'ia', 'Cinemática · escena 2'],
  ['/hero-stage-3.jpg', 'ia', 'Cinemática · escena 3'],
  ['/hero-stage-4.jpg', 'ia', 'Cinemática · escena 4'],
  ['/hero-stage-5.jpg', 'ia', 'Cinemática · escena 5'],
  ['/result-2.jpg',     'ia', 'Editorial · resultado IA'],
  ['/ba-before-2.jpg',  'selfie', 'Selfie · estudio'],
];

const BAUL = [
  ...DEMO_LOOKS.flatMap((l) => [
    { id: `b-in-${l.id}`, src: l.inspiration, kind: 'ref',    caption: l.caption },
    { id: `b-re-${l.id}`, src: l.real,        kind: 'selfie', caption: l.caption },
    { id: `b-ai-${l.id}`, src: l.result,      kind: 'ia',     caption: l.caption },
  ]),
  ...BAUL_EXTRAS.map(([src, kind, caption]) => ({
    id: `b-x${src.replace(/[^\w]/g, '')}`, src, kind, caption,
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
  // El wizard es herramienta interna del equipo → SIEMPRE en español (el idioma
  // del LINK que ve la creadora se elige aparte, en el paso Molde).
  const t = useProp('es');

  // Acceso: admin, o empleado con la capability 'proposals' (Crear propuestas).
  const [access, setAccess] = useState('loading'); // 'loading' | 'ok' | 'denied'
  // Nombre del empleado logueado — se sella en cada propuesta como createdBy
  // (así el dueño ve en /admin › Propuestas quién armó cada una).
  const [authorName, setAuthorName] = useState('');
  // id del perfil logueado — se sella como created_by en la propuesta (uuid
  // de profiles) para que RLS is_staff lo acepte y el dueño sepa quién la armó.
  const [authorId, setAuthorId] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const up = await getUserProfile();
        const p = up?.profile;
        // Crear propuestas es función base de todo el equipo: admin o empleado.
        const ok = !!p && (p.role === 'admin' || p.role === 'supervisor');
        setAccess(ok ? 'ok' : 'denied');
        if (p) {
          setAuthorName(p.full_name || p.stage_name || p.email || '');
          setAuthorId(p.id || '');
        }
      } catch { setAccess('denied'); }
    })();
  }, []);

  // Creadoras ACTIVAS del equipo (para elegir destinataria activa del dropdown).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().rpc('team_creators');
        if (Array.isArray(data)) setActiveCreators(data.filter((m) => m?.id && m?.full_name && m.onboarding_status === 'active'));
      } catch {}
    })();
  }, []);

  const [step, setStep] = useState(1);
  // Destinatario VACÍO al crear una nueva (nada de datos demo pre-llenados).
  // kind: 'new' (creadora nueva, se escribe a mano) | 'active' (ya activa, se elige).
  const [recipient, setRecipient] = useState({ name: '', email: '', kind: 'new' });
  const [creatorId, setCreatorId] = useState(''); // creadora activa elegida del dropdown
  const [activeCreators, setActiveCreators] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [template] = useState('redes'); // hoy: un solo tipo (contenido de redes)
  const [coverUrl, setCoverUrl] = useState(DEMO_COVER);
  const [closingUrl, setClosingUrl] = useState(DEMO_CLOSING);

  const [name, setName] = useState(presetFor('es').name);
  const [subtitle, setSubtitle] = useState(presetFor('es').subtitle);
  const [intro, setIntro] = useState(presetFor('es').intro);
  // Encabezado de dedicatoria editable ("Preparada para" por defecto). Vacío =
  // usar el default del idioma en la portada.
  const [dedication, setDedication] = useState('');
  const [days, setDays] = useState(30);
  const [lang, setLang] = useState('es');
  // CODE de la última publicación (vacío hasta publicar; se rehidrata de
  // 'ls_prop_last' para que el header y las respuestas apunten al último link).
  const [code, setCode] = useState('');
  // id (uuid) de la propuesta recién insertada en Supabase — lo usa el paso 4
  // para leer su feedback. pubError: mensaje visible si el insert falla.
  const [proposalId, setProposalId] = useState(null);
  const [pubError, setPubError] = useState('');
  const [publishing, setPublishing] = useState(false);
  // Arranca con looks VACÍOS (nada de fotos placeholder). El equipo llena la
  // primera y va agregando con "Agregar look".
  const INITIAL_LOOKS = [
    { id: 'lk1', caption: '', inspiration: null, real: null, result: null },
    { id: 'lk2', caption: '', inspiration: null, real: null, result: null },
    { id: 'lk3', caption: '', inspiration: null, real: null, result: null },
  ];
  const [looks, setLooks] = useState(INITIAL_LOOKS.map((l) => ({ ...l })));
  const [selectedId, setSelectedId] = useState(INITIAL_LOOKS[0].id);

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
    // Una propuesta NUEVA arranca en LIMPIO. Ya no restauramos el borrador viejo
    // (arrastraba datos demo: destinatario, textos y fotos de una sesión pasada).
    // Limpiamos el draft local para que el preview /p/demo tampoco muestre algo
    // anterior; se reescribe al guardar / "ver como cliente" o al publicar.
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  }, []);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  const firstName = (recipient.name || '').trim().split(/\s+/)[0] || '';
  // publicUrl apunta al CODE publicado; el preview de pasos 2-3 sigue en /p/demo
  // (renderiza el draft de trabajo). El QR usa la IP LAN en local, mismo path.
  const pubPath = `/p/${code}?lang=${lang}`;
  const publicUrl = `${proto}//${host}${pubPath}`;
  const previewUrl = `${proto}//${host}/p/demo?lang=${lang}`;
  const qrTarget = isLocal ? `${proto}//${LAN_HOST}${pubPath}` : publicUrl;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(qrTarget)}`;
  const greet = firstName ? `Hola ${firstName}!` : 'Hola!';
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

  // Mientras el dueño no toque los textos a mano, los textos por defecto se
  // regeneran al cambiar el IDIOMA DEL LINK (título/subtítulo/intro traducidos).
  // El primer run se saltea para no pisar el estado inicial.
  const firstRegen = useRef(true);
  useEffect(() => {
    if (firstRegen.current) { firstRegen.current = false; return; }
    if (copyTouched) return;
    const preset = presetFor(lang);
    setName(preset.name);
    setSubtitle(preset.subtitle);
    setIntro(preset.intro);
  }, [copyTouched, lang]);

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

  // ── Subida desde la computadora del operador ──
  // Las fotos se comprimen a JPEG y se SUBEN al bucket público 'proposal-photos'
  // (Supabase Storage); en la propuesta se guarda solo la URL pública. Antes se
  // incrustaban como base64 en la fila → propuestas de 6+ MB, lentísimas en el
  // teléfono. 'ls_prop_uploads' ahora solo guarda URLs (liviano).
  const [uploads, setUploads] = useState([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileInputRef = useRef(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ls_prop_uploads');
      if (raw) {
        const u = JSON.parse(raw);
        // Solo URLs (http/https). Descarta base64 viejo para no re-incrustarlo.
        if (Array.isArray(u)) setUploads(u.filter((x) => x?.id && typeof x.src === 'string' && !x.src.startsWith('data:')));
      }
    } catch {}
  }, []);

  // Comprime a un Blob JPEG (máx 1400px, calidad 0.82). Ya no vive en
  // localStorage, así que puede ir un poco más grande sin problema.
  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

  const onFilesPicked = async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    const kind = picker?.target === 'look' ? (SLOTS.find((s) => s.key === picker.slotKey)?.kind || 'ia') : 'ia';
    setUploadBusy(true);
    setUploadErr('');
    const sb = getSupabase();
    const nuevos = [];
    for (const f of files) {
      const blob = await compressImage(f);
      if (!blob) continue;
      // Sube al bucket público y guarda la URL (NO base64) en la propuesta.
      const path = `${authorId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: upErr } = await sb.storage.from('proposal-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) { setUploadErr(upErr.message || 'No se pudo subir la foto. Reintentá.'); continue; }
      const src = sb.storage.from('proposal-photos').getPublicUrl(path)?.data?.publicUrl;
      if (!src) { setUploadErr('No se pudo obtener la URL de la foto.'); continue; }
      nuevos.push({
        id: `up-${Math.random().toString(36).slice(2, 9)}`,
        src, kind,
        caption: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 40) || 'Subida',
        uploaded: true,
      });
    }
    setUploadBusy(false);
    if (!nuevos.length) return;
    setUploads((prev) => {
      const next = [...nuevos, ...prev];
      try { localStorage.setItem('ls_prop_uploads', JSON.stringify(next)); } catch {}
      return next;
    });
    // Si subió una sola, asignarla directo al slot que estaba eligiendo.
    if (nuevos.length === 1 && picker) assign(nuevos[0].src);
  };

  const pickerItems = useMemo(() => [...uploads, ...BAUL].filter((p) => {
    if (pickerKind !== 'all' && p.kind !== pickerKind) return false;
    if (pickerQ && !p.caption.toLowerCase().includes(pickerQ.toLowerCase())) return false;
    return true;
  }), [uploads, pickerKind, pickerQ]);

  const completeCount = looks.filter(isComplete).length;
  const selIdx = looks.findIndex((l) => l.id === selectedId);
  const selected = looks[selIdx >= 0 ? selIdx : 0];
  const lookNo = selected ? pad2((selIdx >= 0 ? selIdx : 0) + 1) : '00';

  // La propuesta completa (shape v1) con el code que corresponda. El draft de
  // trabajo conserva también los looks incompletos (para no perder un look a
  // medio armar al recargar); lo publicado lleva solo los completos.
  const buildProposal = (codeArg, { includeIncomplete = false } = {}) => ({
    v: 1,
    name, subtitle, intro, dedication, lang, days, code: codeArg,
    expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
    model: { name: '', agency: '' },
    recipient: { name: recipient.name.trim(), email: recipient.email.trim(), kind: recipient.kind },
    template,
    coverUrl: coverUrl || null,
    closingUrl: closingUrl || null,
    createdBy: authorName || '',
    looks: (includeIncomplete ? looks : looks.filter(isComplete))
      .map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
  });

  const saveDraft = () => {
    if (completeCount === 0) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(buildProposal(code, { includeIncomplete: true }))); } catch {}
  };

  // Publicar = CODE nuevo cada vez (link único por publicación). Inserta la
  // propuesta en Supabase (public.photo_proposals) con el cliente autenticado;
  // RLS is_staff() permite la escritura. Guarda el id devuelto (para leer su
  // feedback en el paso 4) y marca 'ls_prop_last' + draft (header/preview).
  // Devuelve true si el insert funcionó; false si falló (con pubError visible).
  const publish = async () => {
    if (completeCount === 0) return false;
    setPubError('');
    setPublishing(true);
    const newCode = genCode();
    const payload = {
      link_id: newCode,
      created_by: authorId || null,
      created_by_name: authorName || '',
      model_name: null,
      model_agency: null,
      name,
      subtitle,
      intro,
      dedication: dedication.trim() || null,
      lang,
      template,
      cover_url: coverUrl || null,
      closing_url: closingUrl || null,
      looks: looks
        .filter(isComplete)
        .map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
      recipient_name: recipient.name.trim(),
      recipient_email: recipient.email.trim(),
      recipient_kind: recipient.kind,
      status: 'published',
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
    };
    try {
      const { data, error } = await getSupabase()
        .from('photo_proposals')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      setProposalId(data?.id ?? null);
      setCode(newCode);
      // Draft/last en localStorage solo para el header y el preview /p/demo;
      // la vista pública /p/<CODE> ahora se sirve por RPC desde Supabase.
      try {
        localStorage.setItem(LAST_KEY, newCode);
        localStorage.setItem(DRAFT_KEY, JSON.stringify(buildProposal(newCode, { includeIncomplete: true })));
      } catch {}
      setPublishing(false);
      return true;
    } catch (e) {
      setPubError(e?.message || 'No se pudo publicar la propuesta. Revisá la conexión e intentá de nuevo.');
      setPublishing(false);
      return false;
    }
  };

  // Respuestas de la persona: en el paso 4 leemos el feedback desde Supabase
  // (public.photo_proposal_feedback) por el id de la propuesta recién insertada
  // y refrescamos cada 5s (si responde desde su teléfono, se ve sin recargar).
  useEffect(() => {
    if (step !== 4 || !proposalId) { setFeedback(null); return; }
    let alive = true;
    const load = async () => {
      try {
        const { data, error } = await getSupabase()
          .from('photo_proposal_feedback')
          .select('items, recipient_name, updated_at')
          .eq('proposal_id', proposalId)
          .order('updated_at', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (!alive) return;
        const row = Array.isArray(data) ? data[0] : data;
        if (row && Array.isArray(row.items)) {
          setFeedback({ items: row.items, recipientName: row.recipient_name, at: row.updated_at });
        } else {
          setFeedback(null);
        }
      } catch { if (alive) setFeedback(null); }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [step, proposalId]);

  const fbItems = feedback?.items ?? [];
  const fbLiked = fbItems.filter((i) => i.status === 'liked').length;
  const fbRejected = fbItems.filter((i) => i.status === 'rejected').length;
  const fbNotes = fbItems.filter((i) => (i.note || '').trim()).length;

  const canNext = step === 1
    ? recipient.name.trim().length > 0 && EMAIL_RE.test(recipient.email.trim())
    : step === 3
      ? completeCount > 0
      : step < 4;

  const goNext = async () => {
    if (step >= 4 || !canNext || publishing) return;
    if (step === 3) {
      const ok = await publish();
      if (!ok) return; // el insert falló → quedate en el paso 3 con el error visible
    }
    setStep(step + 1);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const steps = [t.stepWho, t.stepMold, t.stepPhotos, t.stepLink];

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
        <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
          <span className="mx-auto mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Sin acceso
          </span>
          <h1 className="font-display text-xl font-bold text-paper">Necesitás el permiso «Crear propuestas»</h1>
          <p className="mt-2 text-sm text-paper-mute">Pedile a un administrador que te lo active en Equipo → accesos.</p>
          <Link href="/admin" className="btn3d-ghost mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
            <ArrowLeft size={15} /> Volver
          </Link>
        </div>
      </div>
    );
  }

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
                {code && (
                  <span className="hidden whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-brand sm:inline">{code}</span>
                )}
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
                onClick={() => { saveDraft(); window.open(previewUrl, '_blank', 'noopener'); }}
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
              <Field label={t.recipKind}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip active={recipient.kind === 'new'} onClick={() => { setRecipient((r) => ({ ...r, kind: 'new' })); setCreatorId(''); }}>Creadora nueva</Chip>
                  <Chip active={recipient.kind === 'active'} onClick={() => setRecipient((r) => ({ ...r, kind: 'active' }))}>Creadora activa</Chip>
                </div>
              </Field>

              {recipient.kind === 'active' && (
                <Field label="Elegí la creadora activa">
                  <div className="relative">
                    <select
                      value={creatorId}
                      onChange={(e) => {
                        const c = activeCreators.find((x) => x.id === e.target.value);
                        setCreatorId(e.target.value);
                        if (c) setRecipient((r) => ({ ...r, name: c.full_name || '' }));
                      }}
                      className="w-full appearance-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-8 text-sm text-paper outline-none focus:border-brand/60"
                    >
                      <option value="">{activeCreators.length ? '— Elegí una creadora activa —' : 'No hay creadoras activas todavía'}</option>
                      {activeCreators.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                    <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                  </div>
                </Field>
              )}

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
                  type="email"
                  value={recipient.email}
                  onChange={(e) => setRecipient((r) => ({ ...r, email: e.target.value }))}
                  placeholder={t.recipEmailPh}
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                />
              </Field>
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

          {/* Hoy hay UN solo tipo de contenido: redes. (El exclusivo, más adelante.) */}
          <div className="card3d relative rounded-3xl border border-brand bg-card p-5 text-left ring-1 ring-brand/50 shadow-glow-sm">
            <span className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand text-on-accent">
              <Check size={13} />
            </span>
            <div className="font-display text-base font-bold text-paper">{t.tplRedes}</div>
            <div className="mt-1 text-[12px] leading-relaxed text-paper-mute">{t.tplRedesSub}</div>
          </div>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="space-y-3.5">
              <Field label={t.dedication}>
                <input value={dedication} onChange={(e) => { setDedication(e.target.value); setCopyTouched(true); }} placeholder={propDict(lang).preparedFor} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none placeholder:text-paper-dim focus:border-brand/60" />
              </Field>
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
                  <span className="font-mono text-[8px] text-white/30">{t.privateSel}</span>
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
              {dedication.trim() || t.preparedFor} <span className="text-brand">{recipient.name}</span>
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
            <a
              href={mailHref}
              className="btn3d-ghost inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold"
            >
              <Mail size={14} /> {t.sendEmail}
            </a>
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
              disabled={!canNext || publishing}
              className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold disabled:pointer-events-none disabled:opacity-40"
            >
              {step === 3 ? (publishing ? t.publishing || 'Publicando…' : t.publishNow) : t.next} <ArrowRight size={15} />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t.savedOk}
            </span>
          )}
        </div>
      </div>

      {pubError && step === 3 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <div className="flex max-w-md items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/90 px-4 py-2.5 text-sm text-rose-100 shadow-lg backdrop-blur">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
            <span className="min-w-0">{pubError}</span>
            <button
              type="button"
              onClick={() => setPubError('')}
              className="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-rose-200/70 transition-colors hover:bg-white/10 hover:text-rose-100"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

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
                <div className="text-[11px] text-paper-mute">{BAUL.length} {t.files}</div>
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadBusy}
                className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                <ImagePlus size={13} /> {uploadBusy ? 'Subiendo…' : 'Subir de tu computadora'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={onFilesPicked} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {uploadErr && <p className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{uploadErr}</p>}
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

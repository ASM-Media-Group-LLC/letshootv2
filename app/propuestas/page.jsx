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
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, Trash2, Plus,
  ImagePlus, Search, X, Copy, Eye, ExternalLink, Link as LinkIcon,
  Smartphone, Mail, User, Users,
} from 'lucide-react';
import { useProp, propDict, PROP_LANGS, PROP_LANG_LABELS, PROP_LANG_FLAG } from '@/lib/propuesta-i18n';
import { PROPOSAL_LOGOS, DEFAULT_PROPOSAL_LOGOS } from '@/lib/proposal-logos';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';

const DRAFT_KEY = 'ls_propuesta_draft';
const LAST_KEY = 'ls_prop_last';
const LAN_HOST = '10.0.0.67:3001';
// Los links QUE SE COMPARTEN (propuesta / aprobación) SIEMPRE apuntan a producción
// —aunque el equipo esté armando en localhost—, así funcionan para quien los recibe.
// (Las propuestas viven en el mismo Supabase que producción.)
const SHARE_ORIGIN = 'https://letshoot.ai';

// CODE de propuesta: uno NUEVO por cada publicación (el link cambia cada vez).
// Dos segmentos (JP-XXXXXX-xxxxxx) → largo y NO adivinable (candado de link):
// ~31^6 · 32^6 combinaciones. Sin caracteres confundibles (I/L/O/0/1).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_TAIL = 'abcdefghijkmnpqrstuvwxyz23456789';
const randFrom = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
const genCode = () => `JP-${randFrom(CODE_ALPHABET, 6)}-${randFrom(CODE_TAIL, 6)}`;

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

// Portada/cierre por defecto = lifestyle Miami (generadas en Higgsfield:
// Ocean Drive golden hour + playa). Fotos verticales 9:16.
const DEMO_COVER = '/prop-miami-1.jpg';   // Miami · Ocean Drive · golden hour
const DEMO_CLOSING = '/prop-miami-2.jpg'; // Miami · playa · lifestyle

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
  const router = useRouter();
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

  // Equipo interno (para elegir a quién se le manda una propuesta INTERNA).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().rpc('team_staff');
        if (Array.isArray(data)) setStaff(data.filter((m) => m?.id && m?.full_name));
      } catch {}
    })();
  }, []);

  const [step, setStep] = useState(1);
  // Destinatario VACÍO al crear una nueva (nada de datos demo pre-llenados).
  // kind: 'new' (creadora nueva, se escribe a mano) | 'active' (ya activa, se elige).
  const [recipient, setRecipient] = useState({ name: '', email: '', kind: 'new' });
  const [creatorId, setCreatorId] = useState(''); // creadora activa elegida del dropdown
  const [activeCreators, setActiveCreators] = useState([]);
  // Propuesta INTERNA: se le manda a un integrante del equipo (revisor logueado)
  // para revisión/aprobación; NO va a una creadora hasta que se apruebe y se
  // reenvíe desde /admin.
  const [staff, setStaff] = useState([]);
  const [internalReviewerId, setInternalReviewerId] = useState('');
  const [internalReviewerName, setInternalReviewerName] = useState('');
  // Interna: PARA QUÉ modelo es. Nueva (con Instagram obligatorio) o activa (de la lista).
  const [subjectKind, setSubjectKind] = useState('new'); // 'new' | 'active'
  const [subjectName, setSubjectName] = useState('');
  const [subjectInstagram, setSubjectInstagram] = useState('');
  const [subjectCreatorId, setSubjectCreatorId] = useState('');
  // Aprobación: si el empleado marca el chulito, la propuesta va primero al que
  // aprueba (approverEmail); recién si él aprueba, se le manda a la creadora.
  const [needsApproval, setNeedsApproval] = useState(false);
  // Pueden aprobar VARIOS correos (cualquiera con el link aprueba). Chips + buffer.
  const [approverEmails, setApproverEmails] = useState([]);
  const [approverInput, setApproverInput] = useState('');
  const addApprover = (raw) => {
    const parts = String(raw || '').split(/[,;\s]+/).map((s) => s.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e));
    if (!parts.length) return;
    setApproverEmails((s) => Array.from(new Set([...s, ...parts])));
    setApproverInput('');
  };
  const removeApprover = (e) => setApproverEmails((s) => s.filter((x) => x !== e));
  const [approvalState, setApprovalState] = useState(''); // '' | 'sending' | 'sent' | 'error'
  const [approvalMsg, setApprovalMsg] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [template] = useState('redes'); // hoy: un solo tipo (contenido de redes)
  const [coverUrl, setCoverUrl] = useState(DEMO_COVER);
  const [closingUrl, setClosingUrl] = useState(DEMO_CLOSING);
  // Logo de la AGENCIA (KASH, etc.): se muestra junto a LetShoot en la propuesta
  // para que la creadora sienta que se la da su agencia. Por defecto trae el de
  // KASH (bundle en /public); si se sube otro se recuerda ('ls_prop_agency_logo')
  // y pisa el default. Se puede quitar con el botón.
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('/prop-agency-kash.png');
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef(null);
  // Logos de PLATAFORMAS que salen al final de la propuesta (OnlyFans + redes).
  // Por defecto todos (igual que la home); el operador destilda los que no van.
  const [logos, setLogos] = useState(DEFAULT_PROPOSAL_LOGOS);
  const toggleLogo = (key) =>
    setLogos((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  // Tipo de propuesta: 'visual' (fotos), 'audio' (voces de ElevenLabs) o 'both'.
  // La bóveda de audios vive acá: cada uno { id, label, src } (URL del bucket
  // público 'proposal-audios'). El equipo sube el mp3 y le pone nombre.
  const [proposalType, setProposalType] = useState('visual');
  const [audios, setAudios] = useState([]);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioErr, setAudioErr] = useState('');
  const audioInputRef = useRef(null);
  const setAudio = (id, patch) => setAudios((s) => s.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAudio = (id) => setAudios((s) => s.filter((a) => a.id !== id));
  const wantsVisual = proposalType === 'visual' || proposalType === 'both';
  const wantsAudio = proposalType === 'audio' || proposalType === 'both';

  const [name, setName] = useState(presetFor('es').name);
  const [subtitle, setSubtitle] = useState(presetFor('es').subtitle);
  const [intro, setIntro] = useState(presetFor('es').intro);
  const [days, setDays] = useState(30);
  const [lang, setLang] = useState('es');
  // CODE de la última publicación (vacío hasta publicar; se rehidrata de
  // 'ls_prop_last' para que el header y las respuestas apunten al último link).
  const [code, setCode] = useState('');
  // Si viene ?edit=<link_id>, editamos esa propuesta (update, mismo link).
  const [editCode, setEditCode] = useState('');
  // id (uuid) de la propuesta recién insertada en Supabase — lo usa el paso 4
  // para leer su feedback. pubError: mensaje visible si el insert falla.
  const [proposalId, setProposalId] = useState(null);
  // Token de aprobación (viene de la fila) para armar el LINK que se comparte con
  // el/los que aprueban — así no depende de que llegue un correo.
  const [approvalToken, setApprovalToken] = useState('');
  const [pubError, setPubError] = useState('');
  const [publishing, setPublishing] = useState(false);
  // Envío de invitación por email (creadora NUEVA): '' | 'sending' | 'sent' | 'error'
  const [inviteState, setInviteState] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
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
  // Qué textos tocó el dueño a mano (por campo). Los NO tocados se re-traducen
  // solos al cambiar el idioma del link; los tocados se respetan.
  const [touched, setTouched] = useState({ name: false, subtitle: false, intro: false });

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

  // Modo EDICIÓN: ?edit=<link_id> → carga la propuesta publicada en el formulario.
  // Con &tocreator=1 (desde una interna aprobada) NO editamos la misma: cargamos
  // el contenido y publicamos una COPIA nueva para la creadora — la interna queda
  // intacta como registro.
  useEffect(() => {
    let editParam = '';
    let toCreator = false;
    try {
      const q = new URLSearchParams(window.location.search);
      editParam = q.get('edit') || '';
      toCreator = q.get('tocreator') === '1';
    } catch {}
    if (!editParam) return;
    (async () => {
      try {
        const { data } = await getSupabase().from('photo_proposals').select('*').eq('link_id', editParam).maybeSingle();
        if (!data) return;
        if (!toCreator) { setEditCode(data.link_id); setCode(data.link_id); }
        if (typeof data.name === 'string') setName(data.name);
        if (typeof data.subtitle === 'string') setSubtitle(data.subtitle);
        if (typeof data.intro === 'string') setIntro(data.intro);
        // No re-traducir al cambiar idioma: respetamos lo cargado.
        setTouched({ name: true, subtitle: true, intro: true });
        if (PROP_LANGS.includes(data.lang)) setLang(data.lang);
        if (typeof data.cover_url === 'string' || data.cover_url === null) setCoverUrl(data.cover_url);
        if (typeof data.closing_url === 'string' || data.closing_url === null) setClosingUrl(data.closing_url);
        // Solo pisa el logo recordado si esta propuesta ya trae uno (si no, deja el prefill).
        if (typeof data.agency_logo_url === 'string' && data.agency_logo_url) setAgencyLogoUrl(data.agency_logo_url);
        if (Array.isArray(data.logos)) setLogos(data.logos);
        if (['visual', 'audio', 'both'].includes(data.proposal_type)) setProposalType(data.proposal_type);
        if (Array.isArray(data.audios)) setAudios(data.audios.filter((a) => a?.src).map((a) => ({ id: a.id || `au-${Math.random().toString(36).slice(2, 9)}`, label: a.label || 'Audio', src: a.src })));
        if (data.expires_at) {
          const rem = Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 86400000);
          const snap = [3, 7, 10, 14, 30].reduce((a, b) => (Math.abs(b - rem) < Math.abs(a - rem) ? b : a), 30);
          setDays(snap);
        }
        // ?tocreator=1 (calculado arriba) → arrancamos en Creadora nueva (limpio)
        // para llenar la creadora y mandarle la copia.
        const loadedKind = data.recipient_kind === 'active' ? 'active' : data.recipient_kind === 'internal' ? 'internal' : 'new';
        setRecipient({
          name: toCreator ? '' : (data.recipient_name || ''),
          email: toCreator ? '' : (data.recipient_email || ''),
          kind: toCreator ? 'new' : loadedKind,
        });
        if (!toCreator) {
          if (data.recipient_user_id) setCreatorId(data.recipient_user_id);
          if (data.internal_reviewer_id) setInternalReviewerId(data.internal_reviewer_id);
          if (typeof data.internal_reviewer_name === 'string') setInternalReviewerName(data.internal_reviewer_name || '');
          // Interna: para qué modelo es (nueva con Instagram o activa por id).
          if (data.recipient_kind === 'internal') {
            setSubjectName(data.recipient_name || '');
            if (data.recipient_user_id) { setSubjectKind('active'); setSubjectCreatorId(data.recipient_user_id); }
            else if (data.recipient_instagram) { setSubjectKind('new'); setSubjectInstagram(data.recipient_instagram || ''); }
          }
          setNeedsApproval(!!data.approval_required && data.recipient_kind !== 'internal');
          if (typeof data.approver_email === 'string') setApproverEmails(data.approver_email.split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
        }
        if (Array.isArray(data.looks) && data.looks.length > 0) {
          const seeded = data.looks.map((l) => ({
            id: l.id, caption: l.caption || '',
            inspiration: l.inspiration || null, real: l.real || null, result: l.result || null,
          }));
          setLooks(seeded);
          setSelectedId(seeded[0]?.id ?? null);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!picker) return;
    const onKey = (e) => { if (e.key === 'Escape') setPicker(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker]);

  // publicUrl apunta al CODE publicado; el preview de pasos 2-3 sigue en /p/demo
  // (renderiza el draft de trabajo). El QR usa la IP LAN en local, mismo path.
  const pubPath = `/p/${code}?lang=${lang}`;
  // Link a COMPARTIR → siempre producción (para quien lo recibe). El preview
  // "/p/demo" del molde sí usa el origen actual (es el borrador local).
  const publicUrl = `${SHARE_ORIGIN}${pubPath}`;
  const previewUrl = `${proto}//${host}/p/demo?lang=${lang}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(publicUrl)}`;
  // Link de APROBACIÓN (con token) para compartir con el/los que aprueban — no
  // hace falta correo: se manda por WhatsApp/link. Cualquiera con él puede aprobar.
  const approvalUrl = approvalToken ? `${SHARE_ORIGIN}/p/${code}?approve=${approvalToken}&lang=${lang}` : '';
  const approvalQr = approvalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=4&color=EEF2F8&bgcolor=0B0F17&data=${encodeURIComponent(approvalUrl)}` : '';

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
    const preset = presetFor(lang);
    if (!touched.name) setName(preset.name);
    if (!touched.subtitle) setSubtitle(preset.subtitle);
    if (!touched.intro) setIntro(preset.intro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

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
  // Logo de la agencia recordado (última vez que se subió). Prefill para no
  // re-subirlo en cada propuesta; el modo edición lo pisa si esa propuesta trae uno.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ls_prop_agency_logo');
      if (saved && /^https?:\/\//.test(saved)) setAgencyLogoUrl(saved);
    } catch {}
  }, []);

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

  // Limpia + re-codifica a WebP alta calidad. Al redibujar en un <canvas> se cae
  // TODA la metadata (EXIF/XMP/C2PA de Higgsfield) — queda "como un screenshot".
  // WebP q0.95 + tope alto (2560px, casi nunca achica) = sin perder calidad al ojo.
  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 2560;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // Preferimos WebP (limpio + liviano); si el navegador no lo soporta, JPEG q0.95.
      canvas.toBlob(
        (blob) => (blob ? resolve({ blob, ext: 'webp', type: 'image/webp' })
          : canvas.toBlob((b) => resolve(b ? { blob: b, ext: 'jpg', type: 'image/jpeg' } : null), 'image/jpeg', 0.95)),
        'image/webp', 0.95,
      );
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
      const out = await compressImage(f);
      if (!out?.blob) continue;
      // Sube al bucket público y guarda la URL (NO base64) en la propuesta.
      const path = `${authorId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${out.ext}`;
      const { error: upErr } = await sb.storage.from('proposal-photos').upload(path, out.blob, { contentType: out.type, upsert: false });
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

  // ── Subir AUDIOS a la bóveda (mp3/wav de ElevenLabs) ──
  // Van tal cual al bucket público 'proposal-audios' (sin comprimir; los mp3 son
  // livianos) y en la propuesta se guarda solo la URL + el nombre editable.
  // Tope de 50 MB (el máximo del storage): más que suficiente para una voz. Un
  // archivo más grande se rechaza con mensaje claro (antes fallaba en silencio).
  const AUDIO_MAX_MB = 50;
  const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|oga|opus|weba|flac|aif|aiff|mp4)$/i;
  const onAudiosPicked = async (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    // Aceptar por MIME de audio O por extensión (algunos teléfonos/navegadores no
    // reportan el type del m4a/mp3).
    const audioFiles = picked.filter((f) => (f.type && f.type.startsWith('audio/')) || AUDIO_EXT.test(f.name));
    if (!audioFiles.length) { setAudioErr('Ese archivo no parece un audio. Subí un mp3, wav o m4a.'); return; }
    const okFiles = audioFiles.filter((f) => f.size <= AUDIO_MAX_MB * 1024 * 1024);
    const tooBig = audioFiles.filter((f) => f.size > AUDIO_MAX_MB * 1024 * 1024);
    if (!okFiles.length) {
      const f = tooBig[0];
      setAudioErr(`"${f.name}" pesa ${(f.size / 1048576).toFixed(0)} MB. El máximo es ${AUDIO_MAX_MB} MB — usá el MP3 de ElevenLabs (pesa mucho menos) o comprimilo.`);
      return;
    }
    setAudioBusy(true);
    setAudioErr('');
    const sb = getSupabase();
    const nuevos = [];
    let failMsg = '';
    for (const f of okFiles) {
      const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'mp3').toLowerCase();
      const path = `${authorId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb.storage.from('proposal-audios').upload(path, f, { contentType: f.type || 'audio/mpeg', upsert: false });
      if (upErr) { failMsg = `No se pudo subir "${f.name}": ${upErr.message || 'error de subida'}. Reintentá.`; continue; }
      const src = sb.storage.from('proposal-audios').getPublicUrl(path)?.data?.publicUrl;
      if (!src) { failMsg = `No se pudo obtener la URL de "${f.name}".`; continue; }
      // Nombre por defecto LIMPIO: si el archivo viene con nombre genérico
      // (WhatsApp, grabación, fecha…) usamos "Audio N" en vez del choclo feo.
      // Igual siempre es editable en el campo "Nombre del audio".
      const cleanName = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
      const isGeneric = !cleanName || /whatsapp|^aud\b|^ptt|grabaci|record|voice|nota de voz|audio\s*\d|\d{4}[-.\s]\d{1,2}[-.\s]\d{1,2}|\d{1,2}[.\s:]\d{2}[.\s:]\d{2}/i.test(cleanName);
      const label = isGeneric ? `Audio ${audios.length + nuevos.length + 1}` : cleanName.slice(0, 60);
      nuevos.push({ id: `au-${Math.random().toString(36).slice(2, 9)}`, src, label });
    }
    setAudioBusy(false);
    if (nuevos.length) setAudios((prev) => [...prev, ...nuevos]);
    if (tooBig.length) setAudioErr(`${tooBig.length} audio(s) pasan de ${AUDIO_MAX_MB} MB y no se subieron. Usá el MP3 de ElevenLabs (más liviano).`);
    else if (failMsg) setAudioErr(failMsg);
  };

  // ── Subir el LOGO de la agencia ──
  // Se guarda como PNG (conserva transparencia, a diferencia de las fotos que van
  // a JPEG) en el bucket público 'proposal-photos/logos'. Se recuerda el último
  // en localStorage para reusarlo en la próxima propuesta.
  const compressLogo = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });

  const onLogoPicked = async (e) => {
    const file = Array.from(e.target.files || []).find((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setUploadErr('');
    try {
      const blob = await compressLogo(file);
      if (!blob) { setUploadErr('No se pudo leer el logo. Probá con un PNG.'); return; }
      const sb = getSupabase();
      const path = `logos/${authorId || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const { error: upErr } = await sb.storage.from('proposal-photos').upload(path, blob, { contentType: 'image/png', upsert: false });
      if (upErr) { setUploadErr(upErr.message || 'No se pudo subir el logo. Reintentá.'); return; }
      const src = sb.storage.from('proposal-photos').getPublicUrl(path)?.data?.publicUrl;
      if (!src) { setUploadErr('No se pudo obtener la URL del logo.'); return; }
      setAgencyLogoUrl(src);
      try { localStorage.setItem('ls_prop_agency_logo', src); } catch {}
    } finally {
      setLogoBusy(false);
    }
  };

  const pickerItems = useMemo(() => [...uploads, ...BAUL].filter((p) => {
    if (pickerKind !== 'all' && p.kind !== pickerKind) return false;
    if (pickerQ && !p.caption.toLowerCase().includes(pickerQ.toLowerCase())) return false;
    return true;
  }), [uploads, pickerKind, pickerQ]);

  const completeCount = looks.filter(isComplete).length;
  const audioCount = audios.filter((a) => a?.src).length;
  // ¿Hay contenido suficiente para el tipo elegido? (visual→fotos, audio→audios,
  // ambas→al menos una de cada una).
  const hasContent =
    (wantsVisual || wantsAudio) &&
    (wantsVisual ? completeCount > 0 : true) &&
    (wantsAudio ? audioCount > 0 : true);
  const selIdx = looks.findIndex((l) => l.id === selectedId);
  const selected = looks[selIdx >= 0 ? selIdx : 0];
  const lookNo = selected ? pad2((selIdx >= 0 ? selIdx : 0) + 1) : '00';

  // La propuesta completa (shape v1) con el code que corresponda. El draft de
  // trabajo conserva también los looks incompletos (para no perder un look a
  // medio armar al recargar); lo publicado lleva solo los completos.
  const buildProposal = (codeArg, { includeIncomplete = false } = {}) => ({
    v: 1,
    name, subtitle, intro, lang, days, code: codeArg,
    expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
    model: { name: '', agency: '' },
    recipient: { name: recipient.name.trim(), email: recipient.email.trim(), kind: recipient.kind },
    template,
    coverUrl: coverUrl || null,
    closingUrl: closingUrl || null,
    agencyLogoUrl: agencyLogoUrl || null,
    logos,
    proposalType,
    audios: audios.filter((a) => a?.src).map(({ id, label, src }) => ({ id, label, src })),
    createdBy: authorName || '',
    looks: (includeIncomplete ? looks : looks.filter(isComplete))
      .map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
  });

  const saveDraft = () => {
    if (completeCount === 0 && audioCount === 0) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(buildProposal(code, { includeIncomplete: true }))); } catch {}
  };

  // Publicar = CODE nuevo cada vez (link único por publicación). Inserta la
  // propuesta en Supabase (public.photo_proposals) con el cliente autenticado;
  // RLS is_staff() permite la escritura. Guarda el id devuelto (para leer su
  // feedback en el paso 4) y marca 'ls_prop_last' + draft (header/preview).
  // Devuelve true si el insert funcionó; false si falló (con pubError visible).
  const publish = async () => {
    if (!hasContent) return false;
    setPubError('');
    setPublishing(true);
    const editing = !!editCode;
    const newCode = editing ? editCode : genCode();
    // Campos de CONTENIDO (se escriben tanto al crear como al editar).
    const content = {
      model_name: null,
      model_agency: null,
      name,
      subtitle,
      intro,
      lang,
      template,
      cover_url: coverUrl || null,
      closing_url: closingUrl || null,
      agency_logo_url: agencyLogoUrl || null,
      logos,
      proposal_type: proposalType,
      audios: audios.filter((a) => a?.src).map(({ id, label, src }) => ({ id, label, src })),
      looks: looks
        .filter(isComplete)
        .map(({ id, caption, inspiration, real, result }) => ({ id, caption, inspiration, real, result })),
      // Para una INTERNA, el "destinatario" mostrado es la MODELO (subject); el
      // revisor va aparte. Para creadora nueva/activa, es la creadora normal.
      recipient_name: recipient.kind === 'internal' ? subjectName.trim() : recipient.name.trim(),
      recipient_email: recipient.email.trim(),
      recipient_kind: recipient.kind,
      recipient_instagram: (recipient.kind === 'internal' && subjectKind === 'new') ? (subjectInstagram.trim() || null) : null,
      // Creadora activa → sellamos su id para que la propuesta le aparezca en su
      // cuenta ("Mis propuestas") apenas se publica. Interna sobre creadora activa
      // también la liga a su id.
      recipient_user_id: recipient.kind === 'active'
        ? (creatorId || null)
        : (recipient.kind === 'internal' && subjectKind === 'active') ? (subjectCreatorId || null) : null,
      // Propuesta interna → revisor del equipo (logueado); no lleva creadora todavía.
      internal_reviewer_id: recipient.kind === 'internal' ? (internalReviewerId || null) : null,
      internal_reviewer_name: recipient.kind === 'internal' ? (internalReviewerName || null) : null,
      // Aprobación: con chulito (externa) O si es interna (siempre pasa por revisión).
      approval_required: needsApproval || recipient.kind === 'internal',
      approver_email: (needsApproval && recipient.kind !== 'internal') ? approverEmails.join(', ') : null,
      approval_status: (needsApproval || recipient.kind === 'internal') ? 'pending' : null,
      status: 'published',
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
    };
    try {
      const sb = getSupabase();
      if (editing) {
        // EDITAR: actualiza la MISMA propuesta (mismo link, mismo autor).
        const { error } = await sb.from('photo_proposals').update(content).eq('link_id', editCode);
        if (error) throw error;
        const { data: idRow } = await sb.from('photo_proposals').select('id, approval_token').eq('link_id', editCode).maybeSingle();
        setProposalId(idRow?.id ?? null);
        setApprovalToken(idRow?.approval_token || '');
      } else {
        // CREAR: link_id nuevo + autor.
        const { data, error } = await sb
          .from('photo_proposals')
          .insert({ link_id: newCode, created_by: authorId || null, created_by_name: authorName || '', ...content })
          .select('id, approval_token')
          .single();
        if (error) throw error;
        setProposalId(data?.id ?? null);
        setApprovalToken(data?.approval_token || '');
      }
      setCode(newCode);
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

  const isInternal = recipient.kind === 'internal';
  const canNext = step === 1
    ? (isInternal
        ? (!!internalReviewerId && (subjectKind === 'active'          // interna: revisor + para qué modelo
            ? !!subjectCreatorId
            : (subjectName.trim().length > 0 && subjectInstagram.trim().length > 0)))
        : ((recipient.kind === 'active'
            ? !!creatorId && recipient.name.trim().length > 0        // activa: elegí creadora (sin correo)
            : recipient.name.trim().length > 0 && EMAIL_RE.test(recipient.email.trim())) // nueva: nombre + correo
            && (!needsApproval || approverEmails.length > 0)))       // si va a aprobación, al menos un aprobador
    : step === 3
      ? hasContent
      : step < 4;

  const goNext = async () => {
    if (step >= 4 || !canNext || publishing) return;
    if (step === 3) {
      const ok = await publish();
      if (!ok) return; // el insert falló → quedate en el paso 3 con el error visible
    }
    setStep(step + 1);
  };

  const doCopy = async (text) => {
    // navigator.clipboard se bloquea en navegadores embebidos / sin foco → usamos
    // un fallback con execCommand para que el botón Copiar SIEMPRE funcione.
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); ok = true; }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const copyLink = () => doCopy(publicUrl);

  // Creadora NUEVA: se manda por INVITACIÓN por correo (edge function
  // proposal-invite → crea su cuenta / le pide contraseña → cae en la propuesta,
  // que queda ligada a su cuenta). El link crudo/WhatsApp es solo para activas.
  const sendInvite = async () => {
    if (inviteState === 'sending' || !code) return;
    setInviteState('sending'); setInviteMsg('');
    try {
      const { data, error } = await getSupabase().functions.invoke('proposal-invite', {
        body: { link_id: code, email: recipient.email.trim(), full_name: recipient.name.trim(), lang },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar la invitación.');
      setInviteState('sent');
    } catch (e) {
      setInviteState('error'); setInviteMsg(e?.message || 'No se pudo enviar la invitación.');
    }
  };

  // Enviar a APROBACIÓN: la propuesta va al que decide (approverEmail) con un link
  // de revisión; cuando aprueba, la edge function invita sola a la creadora.
  const sendApproval = async () => {
    if (approvalState === 'sending' || !code) return;
    setApprovalState('sending'); setApprovalMsg('');
    try {
      const { data, error } = await getSupabase().functions.invoke('proposal-approval', {
        body: { action: 'send', link_id: code },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'No se pudo enviar a aprobación.');
      setApprovalState('sent');
    } catch (e) {
      setApprovalState('error'); setApprovalMsg(e?.message || 'No se pudo enviar a aprobación.');
    }
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
            <button
              type="button"
              onClick={() => { if (step > 1) setStep((s) => Math.max(1, s - 1)); else router.push('/admin?tab=propuestas'); }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper"
              title={step > 1 ? 'Paso anterior' : 'Volver a Propuestas'}
            >
              <ArrowLeft size={17} />
            </button>
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
                <span className={`h-1.5 w-1.5 rounded-full ${hasContent ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {[wantsVisual ? `${completeCount}/${looks.length} ${t.looks}` : null, wantsAudio ? `${audioCount} audios` : null].filter(Boolean).join(' · ')}
              </span>
            )}
            {(step === 2 || step === 3) && (
              <button
                type="button"
                onClick={() => { saveDraft(); window.open(previewUrl, '_blank', 'noopener'); }}
                disabled={!hasContent}
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
            <p className="mt-1.5 text-sm text-paper-mute">La propuesta es para una creadora. Si necesita revisión antes, marcá «Necesita aprobación» abajo.</p>

            {/* Un solo camino: a la creadora (nueva/activa) + opción de aprobación. */}
            <div className="mt-6 space-y-4">
              {!isInternal ? (
                <>
                  <Field label="¿Creadora nueva o activa?">
                    <Seg
                      value={recipient.kind === 'active' ? 'active' : 'new'}
                      onChange={(v) => {
                        if (v === 'new') { setRecipient((r) => ({ ...r, kind: 'new' })); setCreatorId(''); }
                        else setRecipient((r) => ({ ...r, kind: 'active' }));
                      }}
                      options={[{ value: 'new', label: 'Creadora nueva' }, { value: 'active', label: 'Creadora activa' }]}
                    />
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

                  {/* El correo SOLO para creadora nueva (la activa ya tiene cuenta → va por link). */}
                  {recipient.kind === 'new' && (
                    <Field label={t.recipEmail}>
                      <input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => setRecipient((r) => ({ ...r, email: e.target.value }))}
                        placeholder={t.recipEmailPh}
                        className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60"
                      />
                    </Field>
                  )}

                  {/* Chulito de aprobación externa. */}
                  <div className="rounded-xl border border-line bg-ink-2/40 p-3.5">
                    <button type="button" onClick={() => setNeedsApproval((v) => !v)} className="flex w-full items-start gap-3 text-left">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${needsApproval ? 'border-brand bg-brand text-on-accent' : 'border-line'}`}>
                        {needsApproval && <Check size={13} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-paper">Necesita aprobación</span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-paper-mute">Alguien la revisa y aprueba antes de que le llegue a la creadora.</span>
                      </span>
                    </button>
                    {needsApproval && (
                      <div className="mt-3.5">
                        <Field label="Correos que pueden aprobar">
                          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-ink-2 px-2.5 py-2 focus-within:border-brand/60">
                            {approverEmails.map((e) => (
                              <span key={e} className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-paper">
                                {e}
                                <button type="button" onClick={() => removeApprover(e)} className="text-paper-mute transition-colors hover:text-rose-300"><X size={12} /></button>
                              </span>
                            ))}
                            <input
                              type="email"
                              value={approverInput}
                              onChange={(e) => setApproverInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addApprover(approverInput); } }}
                              onBlur={() => addApprover(approverInput)}
                              placeholder={approverEmails.length ? 'Agregar otro…' : 'quien-aprueba@correo.com'}
                              className="min-w-[150px] flex-1 bg-transparent px-1 py-1 text-sm text-paper placeholder:text-paper-dim outline-none"
                            />
                          </div>
                        </Field>
                        <p className="mt-1.5 text-[11px] text-paper-dim">Enter o coma para agregar. Cualquiera de ellos puede aprobar.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Field label="Elegí a quién revisa (equipo)">
                    <div className="relative">
                      <select
                        value={internalReviewerId}
                        onChange={(e) => {
                          const s = staff.find((x) => x.id === e.target.value);
                          setInternalReviewerId(e.target.value);
                          setInternalReviewerName(s?.full_name || '');
                        }}
                        className="w-full appearance-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-8 text-sm text-paper outline-none focus:border-brand/60"
                      >
                        <option value="">{staff.length ? '— Elegí a quién revisa —' : 'Cargando equipo…'}</option>
                        {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.job_title ? ` · ${s.job_title}` : ''}</option>)}
                      </select>
                      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                    </div>
                  </Field>

                  {/* Para QUÉ modelo es la propuesta interna. */}
                  <Field label="¿Para qué modelo es?">
                    <Seg
                      value={subjectKind}
                      onChange={(v) => { if (v === 'new') { setSubjectKind('new'); setSubjectCreatorId(''); } else setSubjectKind('active'); }}
                      options={[{ value: 'new', label: 'Creadora nueva' }, { value: 'active', label: 'Creadora activa' }]}
                    />
                  </Field>
                  {subjectKind === 'active' ? (
                    <Field label="Elegí la creadora activa">
                      <div className="relative">
                        <select
                          value={subjectCreatorId}
                          onChange={(e) => { const c = activeCreators.find((x) => x.id === e.target.value); setSubjectCreatorId(e.target.value); setSubjectName(c?.full_name || ''); }}
                          className="w-full appearance-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-8 text-sm text-paper outline-none focus:border-brand/60"
                        >
                          <option value="">{activeCreators.length ? '— Elegí una creadora activa —' : 'No hay creadoras activas todavía'}</option>
                          {activeCreators.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-paper-dim" />
                      </div>
                    </Field>
                  ) : (
                    <>
                      <Field label="Nombre de la modelo">
                        <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Ej: Valentina Ríos"
                          className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                      </Field>
                      <Field label="Instagram de la modelo (obligatorio)">
                        <input value={subjectInstagram} onChange={(e) => setSubjectInstagram(e.target.value)} placeholder="instagram.com/usuaria  ·  @usuaria"
                          className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                      </Field>
                    </>
                  )}

                  <div className="flex items-start gap-2 rounded-xl border border-line bg-ink-2/40 px-3.5 py-3 text-[12px] leading-relaxed text-paper-mute">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    Propuesta interna: la revisa y aprueba tu equipo (con su feedback aparte). Cuando esté aprobada, desde el admin la mandás a la creadora.
                  </div>
                </>
              )}
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

          {/* Tipo de propuesta: visual (fotos), audio (voces) o ambas. */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">¿Qué le vas a mandar?</div>
              <p className="mt-1 text-[12px] leading-relaxed text-paper-mute">Fotos, audios (voces de ElevenLabs) o las dos cosas. En «Ambas» salen en secciones separadas.</p>
            </div>
            <Seg
              value={proposalType}
              onChange={setProposalType}
              options={[
                { value: 'visual', label: 'Visual (fotos)' },
                { value: 'audio', label: 'Audio (voces)' },
                { value: 'both', label: 'Ambas' },
              ]}
            />
          </section>

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
              <Field label={t.pkgTitle}>
                <input value={name} onChange={(e) => { setName(e.target.value); setTouched((t2) => ({ ...t2, name: true })); }} className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
              <Field label={t.introduction}>
                <textarea value={intro} onChange={(e) => { setIntro(e.target.value); setTouched((t2) => ({ ...t2, intro: true })); }} rows={3} className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-paper outline-none focus:border-brand/60" />
              </Field>
            </div>
          </section>

          {/* Logo de la AGENCIA — sale junto a LetShoot en la propuesta (la creadora
              siente que se la da su agencia). Se recuerda el último subido. */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.agencyLogo}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-paper-mute">{t.agencyLogoHint}</p>
            </div>
            <div className="flex items-center gap-4">
              {agencyLogoUrl ? (
                <>
                  <div className="grid h-16 w-40 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-black px-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={agencyLogoUrl} alt="" className="max-h-12 max-w-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoBusy}
                      className="btn3d-ghost inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      <ImagePlus size={13} /> {logoBusy ? 'Subiendo…' : t.agencyLogoChange}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAgencyLogoUrl(''); try { localStorage.removeItem('ls_prop_agency_logo'); } catch {} }}
                      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-paper-mute transition-colors hover:text-rose-300"
                    >
                      <Trash2 size={13} /> {t.agencyLogoRemove}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoBusy}
                  className="grid h-16 w-40 place-items-center rounded-2xl border-2 border-dashed border-line text-paper-dim transition-colors hover:border-brand/50 hover:text-paper-mute disabled:opacity-50"
                >
                  <span className="flex flex-col items-center gap-1 text-center">
                    <ImagePlus size={16} />
                    <span className="text-[10px] font-semibold">{logoBusy ? 'Subiendo…' : t.agencyLogoAdd}</span>
                  </span>
                </button>
              )}
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={onLogoPicked} />
            </div>
          </section>

          {/* Logos de plataformas (los mismos de la home) — salen al final de la
              propuesta. Casillas para elegir cuáles: OnlyFans + redes. */}
          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">{t.proposalLogos}</div>
              <p className="mt-1 text-[12px] leading-relaxed text-paper-mute">{t.proposalLogosHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROPOSAL_LOGOS.map((l) => {
                const on = logos.includes(l.key);
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => toggleLogo(l.key)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                      on ? 'border-brand/60 bg-brand/10 text-paper shadow-glow-sm' : 'border-line text-paper-dim hover:border-hair'
                    }`}
                  >
                    <span className={`inline-flex items-center transition-opacity ${on ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                      {l.png ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.png} alt="" className="h-3.5 w-auto" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill={l.color} aria-hidden><path d={l.path} /></svg>
                      )}
                    </span>
                    {l.label}
                    {on && <Check size={12} className="text-brand" />}
                  </button>
                );
              })}
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
          <main className="min-w-0 flex-1 space-y-8">
            {wantsVisual && (
            <div>
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
            </div>
            )}

            {/* ── Bóveda de AUDIO: subís los mp3 de ElevenLabs, les ponés nombre
                 y los escuchás. Igual que las fotos pero en audio. ── */}
            {wantsAudio && (
            <div>
              <div className="mb-4 flex items-end justify-between gap-3 px-1">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-paper">Audios</h2>
                  <p className="mt-1 hidden text-[12px] italic text-paper-dim sm:block">Voces de ElevenLabs. La creadora las escucha y elige las que le gustan.</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
                  {pad2(audios.length)} audios
                </span>
              </div>

              <div className="space-y-3">
                {audios.map((a, i) => (
                  <article key={a.id} className="card3d rounded-3xl border border-line bg-card p-3.5">
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="shrink-0 font-mono text-[11px] font-bold text-paper-dim">{pad2(i + 1)}</span>
                      <input
                        value={a.label}
                        onChange={(e) => setAudio(a.id, { label: e.target.value })}
                        placeholder="Nombre del audio (ej: Saludo coqueto)"
                        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-paper placeholder:text-paper-dim outline-none transition-colors focus:border-brand"
                      />
                      <IconBtn danger onClick={() => removeAudio(a.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <audio src={a.src} controls preload="none" className="w-full" />
                  </article>
                ))}

                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={audioBusy}
                  className="grid w-full place-items-center rounded-3xl border-2 border-dashed border-line py-6 text-paper-mute transition-colors hover:border-brand/50 hover:text-paper disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Plus size={16} /> {audioBusy ? 'Subiendo…' : 'Agregar audio'}
                  </span>
                </button>
                {audioErr && <p className="px-1 text-[12px] text-rose-300">{audioErr}</p>}
                <input ref={audioInputRef} type="file" accept="audio/*" multiple hidden onChange={onAudiosPicked} />
              </div>
            </div>
            )}
          </main>

          {wantsVisual && (
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
          )}
        </div>
      )}

      {step === 4 && (
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-10">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-ink-2/60 px-3.5 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                {isInternal ? 'Revisión interna' : 'Link listo'}
              </span>
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-paper">{t.linkTitle}</h2>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-paper-mute">
              {isInternal ? 'Compartilo con quien revisa. Vos ves todo su feedback.' : t.linkSub}
            </p>
            {recipient.name && (
              <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-dim">
                {isInternal ? 'Modelo' : t.preparedFor} <span className="text-brand">{recipient.name}</span>
              </p>
            )}
          </div>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            {(needsApproval || isInternal) ? (
              <>
                {/* Va PRIMERO a revisión/aprobación. Se comparte un LINK (con token).
                    Interna → la revisa el equipo y, una vez aprobada, la mandás a la
                    creadora desde el admin. Externa → al aprobar, se manda sola. */}
                <div className="mb-5 rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.09] to-amber-500/[0.02] px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-300"><Eye size={13} /></span>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                      {isInternal ? 'Revisión interna' : 'Necesita aprobación'}
                    </span>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-amber-100/80">
                    {isInternal
                      ? <>Compartí este link con <span className="font-semibold text-amber-50">{internalReviewerName || 'tu equipo'}</span>. Cuando lo apruebe, la mandás a la creadora desde el admin.</>
                      : <>Compartí este link con quien decide. Cuando apruebe, se le manda sola a la creadora.</>}
                  </p>
                </div>
                {approvalUrl ? (
                  <>
                    <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-dim">Link de revisión</div>
                    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-ink-2/50 py-2 pl-3.5 pr-2">
                      <LinkIcon size={13} className="shrink-0 text-paper-dim" />
                      <input readOnly value={approvalUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-paper outline-none" />
                      <button type="button" onClick={() => doCopy(approvalUrl)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-brand text-on-accent hover:scale-105'}`}>
                        {copied ? <><Check size={13} /> {t.copied}</> : <><Copy size={13} /> {t.copy}</>}
                      </button>
                    </div>
                    <div className="mb-4 flex flex-col items-center rounded-2xl border border-line bg-gradient-to-b from-white/[0.03] to-transparent p-5">
                      <div className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-paper-mute">
                        <Smartphone size={11} /> {t.scanPhone}
                      </div>
                      <div className="overflow-hidden rounded-2xl ring-1 ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={approvalQr} alt="QR" className="h-44 w-44" />
                      </div>
                    </div>
                    <a href={approvalUrl} target="_blank" rel="noreferrer"
                      className="btn3d inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold">
                      <Eye size={15} /> Abrir para revisar <ExternalLink size={12} className="opacity-60" />
                    </a>
                  </>
                ) : (
                  <p className="mb-3 text-center text-[12px] text-paper-mute">Publicá para generar el link de aprobación.</p>
                )}
                {approverEmails.length > 0 && (
                  <>
                    <button type="button" onClick={sendApproval} disabled={approvalState === 'sending' || approvalState === 'sent'}
                      className={`mt-1 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${approvalState === 'sent' ? 'bg-emerald-500 text-white' : 'btn3d-ghost'}`}>
                      {approvalState === 'sent'
                        ? <><Check size={15} /> Enviado por email</>
                        : approvalState === 'sending'
                          ? <>Enviando…</>
                          : <><Mail size={15} /> También enviar por email</>}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-paper-dim">
                      {approvalState === 'error'
                        ? <span className="text-rose-300">{approvalMsg}</span>
                        : <>Correo (opcional) a: <span className="text-paper-mute">{approverEmails.join(', ')}</span></>}
                    </p>
                  </>
                )}
              </>
            ) : recipient.kind === 'active' ? (
              <>
                {/* Creadora ACTIVA → compartir link / QR (WhatsApp). Ella inicia sesión y la ve en su cuenta. */}
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-ink px-3 py-2">
                  <LinkIcon size={13} className="shrink-0 text-paper-dim" />
                  <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-paper outline-none" />
                  <button type="button" onClick={copyLink}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-brand text-on-accent hover:scale-105'}`}>
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
                <a href={publicUrl} target="_blank" rel="noreferrer" onClick={saveDraft}
                  className="btn3d mb-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold">
                  <Eye size={15} /> {t.viewAsClient} <ExternalLink size={12} className="opacity-60" />
                </a>
                <p className="mt-1 text-center text-[11px] text-paper-dim">Mandáselo por WhatsApp o link. Ella inicia sesión y la propuesta le aparece en su cuenta.</p>
              </>
            ) : (
              <>
                {/* Creadora NUEVA → entra por INVITACIÓN por correo (crea contraseña). */}
                <a href={publicUrl} target="_blank" rel="noreferrer" onClick={saveDraft}
                  className="btn3d-ghost mb-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold">
                  <Eye size={15} /> {t.viewAsClient} <ExternalLink size={12} className="opacity-60" />
                </a>
                <button type="button" onClick={sendInvite} disabled={inviteState === 'sending' || inviteState === 'sent'}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all disabled:opacity-70 ${inviteState === 'sent' ? 'bg-emerald-500 text-white' : 'btn3d'}`}>
                  {inviteState === 'sent'
                    ? <><Check size={15} /> Invitación enviada</>
                    : inviteState === 'sending'
                      ? <>Enviando…</>
                      : <><Mail size={15} /> Enviar invitación por email</>}
                </button>
                <p className="mt-2 text-center text-[11px] text-paper-dim">
                  {inviteState === 'error'
                    ? <span className="text-rose-300">{inviteMsg}</span>
                    : <>Se env&iacute;a a <span className="text-paper-mute">{recipient.email || 'su correo'}</span>. Crea su contrase&ntilde;a y la propuesta queda en su cuenta.</>}
                </p>
              </>
            )}
          </section>

          <section className="card3d rounded-3xl border border-line bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate font-display text-base font-bold text-paper">
                {t.responsesOf} {feedback?.recipientName || recipient.name || (isInternal ? 'la revisión' : 'el link')}
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
              {wantsVisual && <StatRow dot="bg-brand" label={t.looks} value={String(completeCount)} />}
              {wantsAudio && <StatRow dot="bg-brand" label="Audios" value={String(audioCount)} />}
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
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-paper-mute sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t.savedOk}
              </span>
              <button
                type="button"
                onClick={() => router.push('/admin?tab=propuestas')}
                className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold"
              >
                <Check size={15} /> Terminar
              </button>
            </div>
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

// Tarjeta grande de decisión (destino de la propuesta): ícono + título + una
// línea. La elegida se resalta con borde brand + chulito. A prueba de confusión.
function PathCard({ active, onClick, icon, title, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-brand/70 bg-brand/[0.07] shadow-glow-sm'
          : 'border-line bg-ink-2/40 hover:border-hair hover:bg-ink-2/70'
      }`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors ${
        active ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line bg-ink-2 text-paper-mute group-hover:text-paper'
      }`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-paper">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-paper-mute">{desc}</span>
      </span>
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all ${
        active ? 'border-brand bg-brand text-on-accent' : 'border-line text-transparent'
      }`}>
        <Check size={12} />
      </span>
    </button>
  );
}

// Control segmentado (dos o más opciones que llenan el ancho). Reemplaza los
// chips sueltos para la sub-decisión y se ve más ordenado / boutique.
function Seg({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-ink-2/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
            value === o.value ? 'bg-brand text-on-accent shadow-glow-sm' : 'text-paper-mute hover:text-paper'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
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

'use client';

// /conexion — Área de conexión con el motor de imágenes (Higgsfield).
// Fase 1: verificar la conexión al API y generar una foto de prueba.
// La llave vive SOLO en el servidor (edge function 'higgsfield'); acá nunca se ve.
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, Plug, Zap, CheckCircle2, XCircle, Loader2, Sparkles, KeyRound, ImageIcon, IdCard, Eye, EyeOff,
  Copy, Check, Laptop, Lock, AlertTriangle, RefreshCw,
} from 'lucide-react';

const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933'; // Cuenta 1 = login de siempre del cocinero (solo Julia)
// "hace 3 min" / "hace 2 h" / "hace 4 d" (para el saldo y el último latido del cocinero).
const ago = (ts) => {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
};
// El cocinero manda su latido ~cada minuto: más de 15 min sin verlo = el cocinero está apagado (o esa cuenta dejó de andar).
const STALE_MS = 15 * 60 * 1000;
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { /* fallback abajo */ }
  try { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; } catch { return false; }
}

// Rescata el JSON de una edge function tanto en éxito como en error (patrón del repo).
async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}
// Voz clonada (ElevenLabs): su propia edge function 'voice'; la llave también vive solo en el servidor.
async function callVoice(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('voice', { body: { action, ...(extra || {}) } });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  return out || {};
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ConexionPage() {
  const [access, setAccess] = useState('loading'); // 'loading' | 'ok' | 'denied'
  useEffect(() => {
    (async () => {
      try {
        const up = await getUserProfile();
        const p = up?.profile;
        setAccess(p && (p.role === 'admin' || p.role === 'supervisor') ? 'ok' : 'denied');
      } catch { setAccess('denied'); }
    })();
  }, []);

  // ── Cuentas de Higgsfield (multi-cuenta) — todo se maneja acá, solo dueño/admin ──
  const callHf = async (action, extra) => {
    const { data, error } = await getSupabase().functions.invoke('hf-accounts', { body: { action, ...(extra || {}) } });
    let out = data; if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
    return out || {};
  };
  const [accounts, setAccounts] = useState([]);
  const [models, setModels] = useState([]);
  const [acctForm, setAcctForm] = useState({ id: '', label: '', key_id: '', key_secret: '', is_default: false });
  const [acctBusy, setAcctBusy] = useState(false);
  const [acctMsg, setAcctMsg] = useState('');
  const [showFormKey, setShowFormKey] = useState(false);
  const loadAccounts = async () => { const out = await callHf('list'); if (out.ok) setAccounts(out.accounts || []); };
  const loadModels = async () => { const out = await callHf('models'); if (out.ok) setModels(out.models || []); };
  useEffect(() => { if (access !== 'ok') return; loadAccounts(); loadModels(); }, [access]);

  const saveAccount = async () => {
    if (!acctForm.label.trim()) { setAcctMsg('Ponle un nombre a la cuenta.'); return; }
    if (!acctForm.id && (!acctForm.key_id.trim() || !acctForm.key_secret.trim())) { setAcctMsg('Pegá las dos partes de la llave.'); return; }
    setAcctBusy(true); setAcctMsg('');
    const out = await callHf('save', { id: acctForm.id || undefined, label: acctForm.label, key_id: acctForm.key_id, key_secret: acctForm.key_secret, is_default: acctForm.is_default });
    setAcctBusy(false);
    if (!out.ok) { setAcctMsg(out.error || 'No se pudo guardar.'); return; }
    setAcctForm({ id: '', label: '', key_id: '', key_secret: '', is_default: false }); setAcctMsg('Guardada ✓');
    loadAccounts(); loadModels();
  };
  const setDefaultAccount = async (id) => { await callHf('set_default', { id }); loadAccounts(); };
  const deleteAccount = async (id, label) => {
    if (!confirm(`¿Borrar la cuenta "${label}"? Los modelos que apuntaban a ella quedan sin cuenta.`)) return;
    const out = await callHf('delete', { id });
    if (!out.ok) { setAcctMsg(out.error || 'No se pudo borrar.'); return; }
    loadAccounts(); loadModels();
  };
  const editAccount = (a) => { setAcctForm({ id: a.id, label: a.label, key_id: '', key_secret: '', is_default: a.is_default }); setAcctMsg(''); };
  const [modelMsg, setModelMsg] = useState({}); // creator_id → { kind: 'ok'|'err'|'warn', text }
  const [soulDraft, setSoulDraft] = useState({}); // creator_id → ID de Soul pegado a mano
  const [soulBusy, setSoulBusy] = useState('');   // creator_id guardando
  const [copied, setCopied] = useState('');       // account_id cuyo comando se copió
  const setModelAccount = async (creator_id, account_id) => {
    const prev = models;
    setModels((m) => m.map((x) => (x.id === creator_id ? { ...x, account_id } : x)));
    const out = await callHf('set_model_account', { creator_id, account_id: account_id || null });
    if (!out.ok) { setModels(prev); setModelMsg((s) => ({ ...s, [creator_id]: { kind: 'err', text: out.error || 'No se pudo cambiar la cuenta.' } })); return; }
    setModelMsg((s) => ({ ...s, [creator_id]: out.soul_cleared ? { kind: 'warn', text: 'Cambió de cuenta: su Soul vieja era de la otra cuenta, así que la desenlacé. Elegí su Soul de esta cuenta.' } : { kind: 'ok', text: 'Cuenta guardada ✓' } }));
    loadAccounts(); loadModels();
  };
  const setModelSoul = async (m, character_id) => {
    const cid = String(character_id || '').trim();
    setSoulBusy(m.id);
    const out = await callHf('set_model_soul', { creator_id: m.id, character_id: cid, account_id: m.account_id || undefined });
    setSoulBusy('');
    if (!out.ok) { setModelMsg((s) => ({ ...s, [m.id]: { kind: 'err', text: out.error || 'No se pudo enlazar la Soul.' } })); return; }
    setSoulDraft((d) => ({ ...d, [m.id]: '' }));
    setModelMsg((s) => ({ ...s, [m.id]: out.warn ? { kind: 'warn', text: out.warn } : { kind: 'ok', text: cid ? 'Soul enlazada ✓ — ya se puede cocinar.' : 'Soul desenlazada.' } }));
    loadModels();
  };
  const juliaHasSoul = !!models.find((m) => m.id === JULIA_ID)?.has_soul;
  const copyCmd = async (a) => { if (a.login_cmd && await copyText(a.login_cmd)) { setCopied(a.id); setTimeout(() => setCopied((c) => (c === a.id ? '' : c)), 1800); } };
  // Estado del login del CLI de una cuenta en la Mac del cocinero.
  const cliState = (a) => {
    if (a.tracked === undefined) return { tone: 'dim', text: 'Sin dato todavía (falta desplegar la edge hf-accounts nueva).' };
    if (!a.tracked) return { tone: 'dim', text: 'Sin dato todavía (falta aplicar la migración 0130).' };
    const seen = a.cli_seen_at ? new Date(a.cli_seen_at).getTime() : 0;
    const stale = seen && Date.now() - seen > STALE_MS;
    if (a.legacy) return { tone: seen && !stale ? 'ok' : 'dim', text: `el de siempre (Julia)${seen ? ` · visto ${ago(a.cli_seen_at)}` : ''}${stale ? ' — ¿el cocinero está apagado?' : ''}` };
    if (a.cli_error) return { tone: 'err', text: a.cli_error };
    if (!seen) return { tone: 'err', text: 'falta — esta cuenta todavía no está conectada en la Mac del cocinero.' };
    return { tone: stale ? 'warn' : 'ok', text: `listo · visto ${ago(a.cli_seen_at)}${stale ? ' — ¿el cocinero está apagado?' : ''}` };
  };

  // ── Otras llaves: Apify (scraper) y Anthropic (visión del cocinero) ──
  const [cfg, setCfg] = useState({ apify: null, anthropic: null });
  const [apifyVal, setApifyVal] = useState('');
  const [anthropicVal, setAnthropicVal] = useState('');
  const [cfgBusy, setCfgBusy] = useState('');
  const [cfgMsg, setCfgMsg] = useState('');
  const [showApify, setShowApify] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  useEffect(() => {
    if (access !== 'ok') return;
    (async () => { const out = await callFn('config_status'); if (out.ok) setCfg({ apify: !!out.apify, anthropic: !!out.anthropic }); })();
  }, [access]);
  const saveCfg = async (k, val, setVal) => {
    if (!val.trim()) { setCfgMsg('Pegá la llave primero.'); return; }
    setCfgBusy(k); setCfgMsg('');
    const out = await callFn('set_config', { k, v: val });
    setCfgBusy('');
    if (!out.ok) { setCfgMsg(out.error || 'No se pudo guardar.'); return; }
    setVal(''); setCfg((c) => ({ ...c, [k === 'apify_token' ? 'apify' : 'anthropic']: true })); setCfgMsg('Guardada ✓');
  };

  // ── ElevenLabs (voz clonada) — se valida contra ElevenLabs antes de guardarla ──
  const [elStatus, setElStatus] = useState(null);
  const [elVal, setElVal] = useState('');
  const [showEl, setShowEl] = useState(false);
  const [elBusy, setElBusy] = useState(false);
  const [elMsg, setElMsg] = useState('');
  const elInputRef = useRef(null);
  useEffect(() => {
    if (access !== 'ok') return;
    (async () => {
      const out = await callVoice('status');
      if (out.ok) setElStatus(out);
      // Sin key todavía → el cursor ya queda en el campo: solo pegar (Cmd+V) y Enter.
      if (out.ok && !out.configured) setTimeout(() => elInputRef.current?.focus(), 50);
    })();
  }, [access]);
  const saveEl = async () => {
    if (!elVal.trim()) { setElMsg('Pegá la API key primero.'); return; }
    setElBusy(true); setElMsg('');
    const out = await callVoice('set_key', { api_key: elVal });
    setElBusy(false);
    if (!out.ok) { setElMsg(out.error || 'No se pudo guardar.'); return; }
    setElVal(''); setElMsg('Guardada ✓');
    const st = await callVoice('status'); if (st.ok) setElStatus(st);
  };

  // ── Conexión ──
  const [conn, setConn] = useState(null); // {state:'checking'|'ok'|'bad'|'needsKey', ...}
  const verify = async () => {
    setConn({ state: 'checking' });
    const out = await callFn('verify');
    if (out.needsKey) setConn({ state: 'needsKey', msg: out.error });
    else if (out.connected) setConn({ state: 'ok', quote: out.quote, note: out.note, base: out.base });
    else setConn({ state: 'bad', msg: out.error || 'No se pudo conectar.', detail: out.detail });
  };

  // ── Foto de prueba ──
  const [gen, setGen] = useState(null); // {state, images, msg, tick}
  const testPhoto = async () => {
    setGen({ state: 'submitting' });
    const out = await callFn('generate');
    const res = out.result || {};
    const reqId = res.request_id || res.id;
    if (!out.ok || !reqId) {
      setGen({ state: 'error', msg: out.error || (res && Object.keys(res).length ? JSON.stringify(res).slice(0, 400) : 'No se pudo iniciar la generación.') });
      return;
    }
    for (let i = 0; i < 50; i++) {
      setGen({ state: 'polling', reqId, tick: i });
      await sleep(3000);
      const so = await callFn('status', { request_id: reqId });
      const sr = so.result || {};
      const st = sr.status;
      if (st === 'completed') {
        const imgs = (sr.images || []).map((x) => x?.url).filter(Boolean);
        setGen({ state: imgs.length ? 'done' : 'error', images: imgs, msg: imgs.length ? '' : 'Terminó sin imágenes.' });
        return;
      }
      if (st === 'failed' || st === 'nsfw' || st === 'canceled') {
        setGen({ state: 'error', msg: `La generación terminó en «${st}».` });
        return;
      }
    }
    setGen({ state: 'error', msg: 'Se agotó el tiempo de espera (2–3 min).' });
  };

  // ── Identidad API-nativa de Julia (recrea el personaje que el API SÍ encuentra) ──
  const [idn, setIdn] = useState(null); // {state:'working'|'done'|'error', characterId, msg}
  const createJuliaIdentity = async () => {
    setIdn({ state: 'working', step: 'Juntando sus fotos reales…' });
    // Fotos reales de Julia desde su baúl (creator_vault).
    const { data: rows } = await getSupabase()
      .from('creator_vault').select('url').eq('creator_id', JULIA_ID).eq('kind', 'real').limit(20);
    const urls = (rows || []).map((r) => r.url).filter(Boolean);
    if (urls.length < 3) { setIdn({ state: 'error', msg: `Julia tiene ${urls.length} foto(s) real(es) en su baúl. Se necesitan al menos 3–5 fotos de su cara. Subí más en Propuestas → baúl → "Real de la modelo".` }); return; }
    setIdn({ state: 'working', step: `Creando el personaje con ${urls.length} fotos…` });
    const out = await callFn('create_character', { name: 'Julia Parker', image_urls: urls });
    const res = out.result || {};
    const cid = res.id || res.character_id;
    if (!out.ok || !cid) { setIdn({ state: 'error', msg: out.error || JSON.stringify(res).slice(0, 400) }); return; }
    setIdn({ state: 'done', characterId: cid, count: urls.length });
  };

  if (access === 'loading') return <div className="min-h-screen bg-ink" />;
  if (access === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-6 text-paper">
        <div className="card3d w-full max-w-md rounded-3xl border border-line bg-card p-8 text-center">
          <span className="mx-auto mb-4 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Sin acceso
          </span>
          <h1 className="font-display text-xl font-bold text-paper">Solo admin o supervisor</h1>
          <p className="mt-2 text-sm text-paper-mute">Esta área es para el equipo. Pedile acceso a un administrador.</p>
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
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 lg:px-6">
          <Link href="/admin" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-paper-mute transition-colors hover:border-brand/40 hover:text-paper" title="Volver al admin">
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-paper-mute">
              <Plug size={12} className="text-brand" /> Conexión
            </div>
            <h1 className="mt-0.5 truncate font-display text-xl font-bold tracking-tight text-paper">Motor de imágenes</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 lg:px-6">
        {/* ElevenLabs — voz clonada. ARRIBA de todo: se pega una vez y listo (el dueño no la encontraba abajo). */}
        <section className={`card3d rounded-3xl border ${elStatus?.configured ? 'border-line' : 'border-brand/50'} bg-card p-6 sm:p-7`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><KeyRound size={18} className="text-brand" /> ElevenLabs — la voz clonada</h2>
              <p className="mt-1 text-sm text-paper-mute">Para que cada modelo hable con SU voz (siempre la misma) desde la cocina. Pegá acá la key <b className="text-paper">LetShoot</b> de ElevenLabs y tocá Guardar — se prueba sola antes de guardarse.</p>
            </div>
            {elStatus?.configured && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">✓ conectada {elStatus.masked}</span>}
          </div>
          {elStatus?.configured && (
            <p className="mt-2 text-xs text-paper-mute">
              Motor: <b className="text-paper">{elStatus.model_label}</b>
              {elStatus.sub && <> · te quedan <b className="text-paper">{Number(elStatus.sub.remaining).toLocaleString('es')}</b> de {Number(elStatus.sub.limit).toLocaleString('es')} créditos{elStatus.sub.tier ? ` (plan ${elStatus.sub.tier})` : ''}</>}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[260px] flex-1">
              <input ref={elInputRef} value={elVal} onChange={(e) => setElVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEl(); }}
                type={showEl ? 'text' : 'password'} placeholder={elStatus?.configured ? 'Pegá una key nueva para reemplazarla' : 'Pegá acá la key de ElevenLabs (sk_…)'}
                className="w-full rounded-xl border border-line bg-ink-2 px-3 py-3 pr-10 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              <button type="button" onClick={() => setShowEl((s) => !s)} title={showEl ? 'Ocultar' : 'Mostrar'}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:text-paper">{showEl ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
            <button type="button" onClick={saveEl} disabled={elBusy}
              className="btn3d inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50">
              {elBusy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {elBusy ? 'Verificando…' : 'Guardar'}
            </button>
          </div>
          {elMsg && <p className={`mt-2 text-xs ${elMsg.includes('✓') ? 'text-emerald-300' : 'text-rose-300'}`}>{elMsg}</p>}
        </section>

        {/* Cuentas de Higgsfield — multi-cuenta, solo dueño/admin */}
        <section className="card3d rounded-3xl border border-brand/30 bg-card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><KeyRound size={18} className="text-brand" /> Cuentas de Higgsfield</h2>
          <p className="mt-1 text-sm text-paper-mute">Tus cuentas y sus llaves. El cocinero cocina a <b className="text-paper">cada modelo con SU cuenta</b> (la que le elegís abajo en «Modelos → cuenta»), usando el login del CLI de esa cuenta en la Mac. La marcada <b className="text-paper">por defecto</b> solo se usa para las pruebas de esta página. Las llaves se guardan en el servidor — <b>nunca</b> quedan en el navegador.</p>

          <div className="mt-4 space-y-2">
            {accounts.map((a) => {
              const cs = cliState(a);
              const toneCls = cs.tone === 'ok' ? 'text-emerald-300' : cs.tone === 'err' ? 'text-rose-300' : cs.tone === 'warn' ? 'text-amber-300' : 'text-paper-dim';
              const needsLogin = !a.legacy && a.tracked && cs.tone !== 'ok';
              return (
              <div key={a.id} className="rounded-2xl border border-line bg-ink-2/40 px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-paper">{a.label}</span>
                      {a.is_default && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">Por defecto</span>}
                      {a.legacy && <span className="rounded-full bg-paper/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-paper-mute">Solo Julia</span>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-paper-dim">Llave {a.has_key ? a.key_hint : '— sin llave'} · {a.models} modelo{a.models === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {!a.is_default && <button onClick={() => setDefaultAccount(a.id)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-paper-mute hover:text-paper" title="Solo cambia la llave de las pruebas de esta página: no mueve a ninguna modelo ni cambia el saldo que ve cada cuenta (Julia sigue en la Cuenta 1)">Hacer default</button>}
                    <button onClick={() => editAccount(a)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-paper-mute hover:text-paper">Cambiar llave</button>
                    {!a.is_default && !a.legacy && <button onClick={() => deleteAccount(a.id, a.label)} className="rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-rose-300/80 hover:text-rose-200">Borrar</button>}
                  </div>
                </div>
                {/* Saldo real + login del CLI en la Mac del cocinero */}
                <div className="mt-2.5 grid gap-1.5 border-t border-line/60 pt-2.5 text-[12px] sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <span className="text-paper-dim">Saldo</span>
                  <span className="text-paper">
                    {a.balance != null ? <><b className="tabular-nums text-emerald-300">{Number(a.balance).toFixed(1)}</b> créd</> : <span className="text-paper-dim">— sin dato</span>}
                    {a.balance_at && <span className="text-paper-dim"> · {ago(a.balance_at)}</span>}
                  </span>
                  <span className="inline-flex items-center gap-1 text-paper-dim"><Laptop size={12} /> Login en la Mac</span>
                  <span className={`min-w-0 break-words ${toneCls}`}>
                    {cs.text}
                    {a.cli_email && <span className="text-paper-dim"> · {a.cli_email}</span>}
                  </span>
                </div>
                {!a.legacy && a.login_cmd && (
                  <div className="mt-2">
                    {needsLogin && <p className="mb-1 text-[11px] text-paper-mute">Para conectarla, en la Mac del cocinero (en la carpeta del proyecto) corré esto y entrá con <b className="text-paper">la cuenta nueva</b> (no la de Julia):</p>}
                    <div className="flex items-center gap-1.5">
                      <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-ink px-2.5 py-1.5 font-mono text-[11px] text-paper" title={a.login_cmd}>{a.login_cmd}</code>
                      <button type="button" onClick={() => copyCmd(a)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-paper-mute hover:text-paper" title="Copiar el comando">
                        {copied === a.id ? <><Check size={12} className="text-emerald-300" /> Copiado</> : <><Copy size={12} /> Copiar</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <button type="button" onClick={() => { loadAccounts(); loadModels(); }} className="inline-flex items-center gap-1 text-[11px] text-paper-dim hover:text-paper"><RefreshCw size={11} /> Actualizar estado</button>
          </div>

          <div className="mt-4 rounded-2xl border border-line bg-ink-2/30 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-paper-dim">{acctForm.id ? 'Cambiar la llave de esta cuenta' : 'Agregar una cuenta'}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={acctForm.label} onChange={(e) => setAcctForm((f) => ({ ...f, label: e.target.value }))} placeholder="Nombre (ej. Cuenta 2)"
                className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60 sm:col-span-2" />
              <input value={acctForm.key_id} onChange={(e) => setAcctForm((f) => ({ ...f, key_id: e.target.value }))} placeholder={acctForm.id ? 'KEY_ID nuevo (vacío = no cambiar)' : 'Pegá el KEY_ID'}
                className="rounded-xl border border-line bg-ink-2 px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
              <div className="relative">
                <input value={acctForm.key_secret} onChange={(e) => setAcctForm((f) => ({ ...f, key_secret: e.target.value }))} type={showFormKey ? 'text' : 'password'} placeholder={acctForm.id ? 'KEY_SECRET nuevo (opcional)' : 'Pegá el KEY_SECRET'}
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-10 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                <button type="button" onClick={() => setShowFormKey((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:text-paper">{showFormKey ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-[12px] text-paper-mute">
                <input type="checkbox" checked={acctForm.is_default} onChange={(e) => setAcctForm((f) => ({ ...f, is_default: e.target.checked }))} className="accent-brand" /> Usar esta para las pruebas de esta página (default — no mueve a ninguna modelo ni cambia saldos; dejala sin marcar)
              </label>
              <button onClick={saveAccount} disabled={acctBusy} className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
                {acctBusy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} {acctForm.id ? 'Guardar cambios' : 'Agregar cuenta'}
              </button>
              {acctForm.id && <button onClick={() => { setAcctForm({ id: '', label: '', key_id: '', key_secret: '', is_default: false }); setAcctMsg(''); }} className="text-[12px] text-paper-dim hover:text-paper">Cancelar</button>}
              {acctMsg && <span className={`text-xs ${acctMsg.includes('✓') ? 'text-emerald-300' : 'text-rose-300'}`}>{acctMsg}</span>}
            </div>
          </div>
        </section>

        {/* Modelos → cuenta */}
        <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><IdCard size={18} className="text-brand" /> Modelos → cuenta</h2>
          <p className="mt-1 text-sm text-paper-mute">Elegí en qué cuenta de Higgsfield vive cada modelo y enlazá <b className="text-paper">su Soul de ESA cuenta</b>. Julia queda fija en la Cuenta 1; todas las demás van a la cuenta nueva. Sin cuenta o sin Soul, la modelo no se cocina (nunca se le cobra a otra cuenta).</p>
          <div className="mt-4 space-y-2">
            {models.length === 0 && <p className="text-sm text-paper-dim">No hay modelos todavía.</p>}
            {models.map((m) => {
              const acc = accounts.find((a) => a.id === m.account_id) || null;
              const souls = Array.isArray(acc?.souls) ? acc.souls : [];
              const known = m.character_id ? souls.find((s) => s.id === m.character_id) : null;
              const mm = modelMsg[m.id];
              const draft = soulDraft[m.id] ?? '';
              const locked = !!m.locked || m.id === JULIA_ID; // Julia fija en la Cuenta 1 (también si el servidor es viejo)
              return (
              <div key={m.id} className="rounded-2xl border border-line bg-ink-2/40 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-paper">{m.name}{m.has_soul && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">soul ✓</span>}</span>
                    {m.handle && <span className="block truncate text-[11px] text-paper-dim">@{m.handle}</span>}
                  </div>
                  {locked ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-paper-mute" title="Julia queda fija en la Cuenta 1 (su Soul vive ahí)">
                      <Lock size={12} /> {acc?.label || 'Cuenta 1'}
                    </span>
                  ) : (
                    <select value={m.account_id || ''} onChange={(e) => setModelAccount(m.id, e.target.value)}
                      className="shrink-0 rounded-lg border border-line bg-ink-2 px-2.5 py-1.5 text-[12px] font-semibold text-paper outline-none focus:border-brand/60">
                      <option value="" className="bg-ink">— sin asignar</option>
                      {accounts.filter((a) => !(a.legacy || a.id === LEGACY_HF_ACCOUNT) || a.id === m.account_id).map((a) => <option key={a.id} value={a.id} className="bg-ink">{a.label}</option>)}
                    </select>
                  )}
                </div>
                {locked && <p className="mt-1 text-[11px] text-paper-dim">Fija en {acc?.label || 'la Cuenta 1'} con su Soul de siempre. No se cambia desde acá.</p>}
                {!locked && m.account_id && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-paper-dim">Soul:</span>
                    {souls.length > 0 && (
                      <select value={known ? m.character_id : ''} disabled={soulBusy === m.id} onChange={(e) => { if (e.target.value) setModelSoul(m, e.target.value); }}
                        className="min-w-0 max-w-full rounded-lg border border-line bg-ink-2 px-2 py-1 text-[11px] text-paper outline-none focus:border-brand/60 disabled:opacity-50">
                        <option value="" className="bg-ink">{m.character_id && !known ? 'otra (pegada a mano)' : '— elegí su Soul —'}</option>
                        {souls.map((s) => <option key={s.id} value={s.id} className="bg-ink">{s.name || s.id.slice(0, 8)}{s.status && s.status !== 'completed' ? ` (${s.status})` : ''}</option>)}
                      </select>
                    )}
                    <input value={draft} onChange={(e) => setSoulDraft((d) => ({ ...d, [m.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) setModelSoul(m, draft); }}
                      placeholder={m.character_id ? m.character_id : (souls.length ? 'o pegá el ID de su Soul' : 'pegá el ID de su Soul (de esta cuenta)')}
                      className="min-w-[160px] flex-1 rounded-lg border border-line bg-ink-2 px-2 py-1 font-mono text-[11px] text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                    <button type="button" onClick={() => setModelSoul(m, draft)} disabled={!draft.trim() || soulBusy === m.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-paper-mute hover:text-paper disabled:opacity-40">
                      {soulBusy === m.id ? <Loader2 size={11} className="animate-spin" /> : null} Enlazar
                    </button>
                    {m.character_id && <button type="button" onClick={() => { if (confirm(`¿Desenlazar la Soul de ${m.name}? No se va a poder cocinar hasta enlazar otra.`)) setModelSoul(m, ''); }} className="text-[11px] text-paper-dim hover:text-rose-300">Quitar</button>}
                  </div>
                )}
                {!locked && m.account_id && souls.length === 0 && acc && acc.tracked && !acc.legacy && (
                  <p className="mt-1 text-[11px] text-paper-dim">La lista de Souls de «{acc.label}» aparece sola cuando esa cuenta esté conectada en la Mac (el cocinero la trae).</p>
                )}
                {mm && <p className={`mt-1.5 inline-flex items-start gap-1 text-[11px] ${mm.kind === 'ok' ? 'text-emerald-300' : mm.kind === 'warn' ? 'text-amber-300' : 'text-rose-300'}`}>{mm.kind !== 'ok' && <AlertTriangle size={11} className="mt-0.5 shrink-0" />}{mm.text}</p>}
              </div>
              );
            })}
          </div>
        </section>

        {/* Otras llaves: Apify (scraper) + Anthropic (visión del cocinero) */}
        <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-7">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><KeyRound size={18} className="text-brand" /> Otras conexiones</h2>
          <p className="mt-1 text-sm text-paper-mute">Se guardan en el servidor, nunca en el navegador. Pegalas vos (yo no puedo tocarlas).</p>

          <div className="mt-5 rounded-2xl border border-line bg-ink-2/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold text-paper">Apify — el scraper de virales</h3>
                <p className="mt-0.5 text-xs text-paper-mute">Trae fotos virales de Instagram por nicho, con su fuente y sus likes/vistas. Copiá tu token de <span className="font-mono text-paper-mute">console.apify.com/settings/integrations</span> y pegalo acá.</p>
              </div>
              {cfg.apify === true && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">✓ conectada</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px] flex-1">
                <input value={apifyVal} onChange={(e) => setApifyVal(e.target.value)} type={showApify ? 'text' : 'password'} placeholder="Pegá tu token de Apify (apify_api_…)"
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-10 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                <button type="button" onClick={() => setShowApify((s) => !s)} title={showApify ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:text-paper">{showApify ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              <button type="button" onClick={() => saveCfg('apify_token', apifyVal, setApifyVal)} disabled={cfgBusy === 'apify_token'}
                className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold disabled:opacity-50">
                {cfgBusy === 'apify_token' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Guardar
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-line bg-ink-2/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold text-paper">Anthropic — la visión del cocinero</h3>
                <p className="mt-0.5 text-xs text-paper-mute">Para que el cocinero mire cada viral y escriba el prompt exacto (pose clavada) solo, sin vos. Token de <span className="font-mono text-paper-mute">console.anthropic.com</span> → API Keys.</p>
              </div>
              {cfg.anthropic === true && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">✓ conectada</span>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[260px] flex-1">
                <input value={anthropicVal} onChange={(e) => setAnthropicVal(e.target.value)} type={showAnthropic ? 'text' : 'password'} placeholder="Pegá tu API key de Anthropic (sk-ant-…)"
                  className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 pr-10 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
                <button type="button" onClick={() => setShowAnthropic((s) => !s)} title={showAnthropic ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-paper-dim hover:text-paper">{showAnthropic ? <EyeOff size={15} /> : <Eye size={15} />}</button>
              </div>
              <button type="button" onClick={() => saveCfg('anthropic_api_key', anthropicVal, setAnthropicVal)} disabled={cfgBusy === 'anthropic_api_key'}
                className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold disabled:opacity-50">
                {cfgBusy === 'anthropic_api_key' ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Guardar
              </button>
            </div>
          </div>
          {cfgMsg && <p className={`mt-3 text-xs ${cfgMsg.includes('✓') ? 'text-emerald-300' : 'text-rose-300'}`}>{cfgMsg}</p>}
        </section>

        {/* 1 · Conexión */}
        <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-paper">1 · Conexión con Higgsfield</h2>
              <p className="mt-1 text-sm text-paper-mute">Verifica que la llave del API esté bien configurada. No gasta créditos.</p>
            </div>
            <button type="button" onClick={verify} disabled={conn?.state === 'checking'} className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
              {conn?.state === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {conn?.state === 'checking' ? 'Verificando…' : 'Verificar conexión'}
            </button>
          </div>

          {conn?.state === 'ok' && (
            <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 size={16} /> Conectado</div>
              {conn.quote && <p className="mt-1 text-xs text-paper-mute">Costo por foto (Soul v2): <b className="text-paper">{conn.quote.credits} créditos</b>{conn.quote.usd ? ` · US$${conn.quote.usd}` : ''}.</p>}
              {conn.note && <p className="mt-1 text-[11px] text-amber-300/90">{conn.note}</p>}
              <p className="mt-1 text-[11px] text-paper-dim">Base: {conn.base}</p>
            </div>
          )}
          {conn?.state === 'needsKey' && (
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300"><KeyRound size={16} /> Falta la llave</div>
              <p className="mt-1 text-xs text-paper-mute">Todavía no está configurada la llave de Higgsfield en el servidor. Mirá los pasos abajo.</p>
            </div>
          )}
          {conn?.state === 'bad' && (
            <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300"><XCircle size={16} /> No conecta</div>
              <p className="mt-1 text-xs text-paper-mute">{conn.msg}</p>
              {conn.detail && <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/30 p-2 text-[10px] text-paper-dim">{JSON.stringify(conn.detail, null, 2)}</pre>}
            </div>
          )}

          {/* Pasos para configurar la llave (una sola vez) */}
          <details className="mt-4 rounded-2xl border border-line bg-ink-2/40 p-4">
            <summary className="cursor-pointer text-xs font-semibold text-paper">¿Cómo configuro la llave? (una vez)</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-paper-mute">
              <li>Entrá al panel de Supabase → <b>Edge Functions</b> → <b>Secrets</b> (o Project Settings → Functions).</li>
              <li>Agregá dos secretos: <code className="text-paper">HIGGSFIELD_KEY_ID</code> y <code className="text-paper">HIGGSFIELD_KEY_SECRET</code> con los valores de tu cuenta de Higgsfield.</li>
              <li>Guardá y volvé acá a <b>Verificar conexión</b>.</li>
            </ol>
            <p className="mt-2 text-[11px] text-paper-dim">Por seguridad, la llave la pegás vos ahí — nunca viaja al navegador ni queda en el código.</p>
          </details>
        </section>

        {/* 2 · Foto de prueba */}
        <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-paper">2 · Foto de prueba</h2>
              <p className="mt-1 text-sm text-paper-mute">Genera una foto real por el API para ver el motor andando. Gasta créditos (el costo exacto sale al verificar).</p>
            </div>
            <button type="button" onClick={testPhoto} disabled={gen?.state === 'submitting' || gen?.state === 'polling'} className="btn3d inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
              {(gen?.state === 'submitting' || gen?.state === 'polling') ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {gen?.state === 'submitting' ? 'Enviando…' : gen?.state === 'polling' ? 'Generando…' : 'Generar foto de prueba'}
            </button>
          </div>

          {(gen?.state === 'submitting' || gen?.state === 'polling') && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-ink-2/40 p-4 text-sm text-paper-mute">
              <Loader2 size={16} className="animate-spin text-brand" />
              {gen.state === 'submitting' ? 'Mandando la orden al motor…' : `Generando la foto… (revisando, intento ${(gen.tick || 0) + 1})`}
            </div>
          )}
          {gen?.state === 'done' && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 size={16} /> ¡Foto generada!</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {gen.images.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a key={u} href={u} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-line bg-ink-2">
                    <img src={u} alt="Foto de prueba" className="aspect-[3/4] w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {gen?.state === 'error' && (
            <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300"><XCircle size={16} /> No se pudo generar</div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-paper-mute">{gen.msg}</p>
            </div>
          )}
        </section>

        {/* 3 · Identidad de la modelo (Julia) */}
        <section className="card3d rounded-3xl border border-line bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><IdCard size={18} className="text-brand" /> 3 · Identidad de Julia (para hacer SU cara)</h2>
              <p className="mt-1 text-sm text-paper-mute">La Julia entrenada en la web NO la ve el API. Esto crea un personaje <b>nuevo, API-nativo</b> con sus fotos reales — ese sí sirve para generar su cara en automático.</p>
            </div>
            <button type="button" onClick={createJuliaIdentity} disabled={idn?.state === 'working' || juliaHasSoul} title={juliaHasSoul ? 'Julia ya tiene su Soul real enlazada: no se pisa' : undefined} className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
              {idn?.state === 'working' ? <Loader2 size={14} className="animate-spin" /> : <IdCard size={14} />}
              {idn?.state === 'working' ? 'Creando…' : 'Crear identidad de Julia'}
            </button>
          </div>
          {juliaHasSoul && <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90"><Lock size={11} /> Julia ya tiene su Soul real enlazada (Cuenta 1). Este botón queda bloqueado para no pisarla.</p>}
          {idn?.state === 'working' && <p className="mt-3 text-xs text-paper-mute">{idn.step}</p>}
          {idn?.state === 'done' && (
            <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><CheckCircle2 size={16} /> Identidad creada</div>
              <p className="mt-1 text-xs text-paper-mute">Personaje creado con {idn.count} fotos. ID: <code className="break-all text-paper">{idn.characterId}</code></p>
              <p className="mt-1 text-[11px] text-paper-dim">Guardalo: con este ID el motor genera la cara de Julia en automático.</p>
            </div>
          )}
          {idn?.state === 'error' && (
            <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300"><XCircle size={16} /> No se pudo</div>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs text-paper-mute">{idn.msg}</p>
            </div>
          )}
          <p className="mt-3 text-[11px] text-paper-dim">Nota: crear/entrenar identidad puede requerir un plan pago de Higgsfield. Si da error de plan o de endpoint, lo resolvemos en el siguiente paso.</p>
        </section>

        <p className="px-1 text-center text-[11px] text-paper-dim">Próximo: buscador de fotos de referencia (scraper) → generar en automático. Primero dejamos la conexión firme.</p>
      </main>
    </div>
  );
}

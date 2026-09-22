'use client';

// /conexion — Área de conexión con el motor de imágenes (Higgsfield).
// Fase 1: verificar la conexión al API y generar una foto de prueba.
// La llave vive SOLO en el servidor (edge function 'higgsfield'); acá nunca se ve.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUserProfile } from '@/lib/supabase/session';
import { getSupabase } from '@/lib/supabase/client';
import {
  ArrowLeft, Plug, Zap, CheckCircle2, XCircle, Loader2, Sparkles, KeyRound, ImageIcon, IdCard,
} from 'lucide-react';

const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';

// Rescata el JSON de una edge function tanto en éxito como en error (patrón del repo).
async function callFn(action, extra) {
  const { data, error } = await getSupabase().functions.invoke('higgsfield', { body: { action, ...(extra || {}) } });
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

  // ── Configurar la llave (se guarda en el servidor vía set_key, NO en el navegador) ──
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [keySaving, setKeySaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');
  const [keyOk, setKeyOk] = useState(null); // null | true | false
  useEffect(() => {
    if (access !== 'ok') return;
    (async () => { const out = await callFn('key_status'); setKeyOk(!!out.configured); })();
  }, [access]);
  const saveKey = async () => {
    if (!keyId.trim() || !keySecret.trim()) { setKeyMsg('Pegá las dos partes de la llave.'); return; }
    setKeySaving(true); setKeyMsg('');
    const out = await callFn('set_key', { key_id: keyId, key_secret: keySecret });
    setKeySaving(false);
    if (!out.ok) { setKeyMsg(out.error || 'No se pudo guardar.'); return; }
    setKeyOk(true); setKeyId(''); setKeySecret(''); setKeyMsg('Llave guardada ✓');
    verify();
  };

  // ── Otras llaves: Apify (scraper) y Anthropic (visión del cocinero) ──
  const [cfg, setCfg] = useState({ apify: null, anthropic: null });
  const [apifyVal, setApifyVal] = useState('');
  const [anthropicVal, setAnthropicVal] = useState('');
  const [cfgBusy, setCfgBusy] = useState('');
  const [cfgMsg, setCfgMsg] = useState('');
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
        {/* 0 · Configurar la llave — se pega ACÁ, en tu app (no en Supabase). */}
        <section className="card3d rounded-3xl border border-brand/30 bg-card p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-paper"><KeyRound size={18} className="text-brand" /> Llave de Higgsfield</h2>
              <p className="mt-1 text-sm text-paper-mute">Pegá acá tu KEY_ID y KEY_SECRET (de tu cuenta de Higgsfield). Se guarda en el servidor — <b>nunca</b> queda en el navegador.</p>
            </div>
            {keyOk === true && <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">✓ configurada</span>}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-paper-dim">KEY_ID</span>
              <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="Pegá tu KEY_ID"
                className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-paper-dim">KEY_SECRET</span>
              <input value={keySecret} onChange={(e) => setKeySecret(e.target.value)} type="password" placeholder="Pegá tu KEY_SECRET"
                className="w-full rounded-xl border border-line bg-ink-2 px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={saveKey} disabled={keySaving}
              className="btn3d inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
              {keySaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {keySaving ? 'Guardando…' : 'Guardar llave'}
            </button>
            {keyMsg && <span className={`text-xs ${keyMsg.includes('✓') ? 'text-emerald-300' : 'text-rose-300'}`}>{keyMsg}</span>}
          </div>
          <p className="mt-2 text-[11px] text-paper-dim">Los valores están en tu archivo <code className="text-paper-mute">letshoot-internal/.env</code> (líneas HIGGSFIELD_KEY_ID / HIGGSFIELD_KEY_SECRET).</p>
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
              <input value={apifyVal} onChange={(e) => setApifyVal(e.target.value)} type="password" placeholder="Pegá tu token de Apify (apify_api_…)"
                className="min-w-[260px] flex-1 rounded-xl border border-line bg-ink-2 px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
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
              <input value={anthropicVal} onChange={(e) => setAnthropicVal(e.target.value)} type="password" placeholder="Pegá tu API key de Anthropic (sk-ant-…)"
                className="min-w-[260px] flex-1 rounded-xl border border-line bg-ink-2 px-3 py-2.5 font-mono text-sm text-paper placeholder:text-paper-dim outline-none focus:border-brand/60" />
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
            <button type="button" onClick={createJuliaIdentity} disabled={idn?.state === 'working'} className="btn3d-ghost inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-50">
              {idn?.state === 'working' ? <Loader2 size={14} className="animate-spin" /> : <IdCard size={14} />}
              {idn?.state === 'working' ? 'Creando…' : 'Crear identidad de Julia'}
            </button>
          </div>
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

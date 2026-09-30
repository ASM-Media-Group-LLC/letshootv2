// Voz clonada (ElevenLabs) — cartilla de la modelo + audio en /kitchen.
// Cada modelo = UNA voz fija (creator_voice.voice_id): siempre la misma voz, mismos ajustes y mismo motor
// → la voz sale idéntica siempre. La llave vive SOLO acá: app_config 'elevenlabs_api_key' → secreto ELEVENLABS_API_KEY.
// Todo mp3 que sale de acá va LIMPIO (sin ID3/APE/Xing-LAME) antes de guardarse. Solo admin/supervisor.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function clean(v: unknown) {
  let s = String(v ?? '').replace(/[\r\n\t]+/g, '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s.trim();
}

const EL_BASE = 'https://api.elevenlabs.io';
const DEFAULT_MODEL = 'eleven_v4';
const FALLBACK_MODEL = 'eleven_multilingual_v2';
const MODEL_LABELS: Record<string, string> = {
  eleven_v4: 'ElevenLabs v4', eleven_v4_turbo: 'ElevenLabs v4 Turbo', eleven_v3: 'ElevenLabs v3',
  eleven_multilingual_v2: 'ElevenLabs Multilingual v2', eleven_flash_v2_5: 'ElevenLabs Flash v2.5',
};
const modelLabel = (m: string) => MODEL_LABELS[m] || `ElevenLabs ${m}`;
// Ajustes FIJOS por modelo (se guardan en creator_voice.settings): misma voz, siempre igual.
const DEFAULT_SETTINGS = { preset: 'natural', stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 1 };
// Solo los campos que entiende ElevenLabs (settings guarda además el nombre del preset), en rango.
const clamp = (v: unknown, lo: number, hi: number, def: number) => { const n = Number(v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
function pickSettings(s: any) {
  const d = DEFAULT_SETTINGS;
  return {
    stability: clamp(s?.stability, 0, 1, d.stability), similarity_boost: clamp(s?.similarity_boost, 0, 1, d.similarity_boost),
    style: clamp(s?.style, 0, 1, d.style), use_speaker_boost: s?.use_speaker_boost !== false, speed: clamp(s?.speed, 0.7, 1.2, d.speed),
  };
}
// Comparativo de voz en la propuesta: saludo con IA (por idioma) y, para modelos SIN voz real, una toma de su voz como "real".
const firstName = (s: string) => { const w = String(s || '').trim().split(/\s+/)[0] || ''; return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''; };
const GREETING: Record<string, (n: string) => string> = {
  es: (n) => `Hola, soy ${n}. Esta es mi voz… y te preparé algo muy especial.`,
  en: (n) => `Hi, it's ${n}. This is my voice… and I made something really special for you.`,
  pt: (n) => `Oi, eu sou ${n}. Essa é a minha voz… e eu preparei algo muito especial pra você.`,
  fr: (n) => `Salut, c'est ${n}. Voici ma voix… et je t'ai préparé quelque chose de très spécial.`,
  de: (n) => `Hi, ich bin ${n}. Das ist meine Stimme… und ich habe etwas ganz Besonderes für dich.`,
  it: (n) => `Ciao, sono ${n}. Questa è la mia voce… e ho preparato qualcosa di molto speciale per te.`,
};
const REAL_LINE: Record<string, (n: string) => string> = {
  es: (n) => `Hola, ¿cómo estás? Soy yo, ${n}… qué bueno que estés por acá.`,
  en: (n) => `Hey, how are you? It's me, ${n}… I'm so glad you're here.`,
  pt: (n) => `Oi, tudo bem? Sou eu, ${n}… que bom que você está aqui.`,
  fr: (n) => `Coucou, ça va ? C'est moi, ${n}… je suis contente que tu sois là.`,
  de: (n) => `Hey, wie geht's? Ich bin's, ${n}… schön, dass du da bist.`,
  it: (n) => `Ehi, come stai? Sono io, ${n}… che bello che tu sia qui.`,
};
const TYPES = ['bienvenida', 'ppv', 'coqueto', 'explicito', 'personalizado'];
const LANGS = ['es', 'en', 'pt', 'fr', 'de', 'it'];
const MAX_TEXT = 5000;
const AUDIO_BUCKET = 'proposal-audios';
const VOICE_COLS = 'creator_id, voice_id, voice_name, source, preview_url, settings, real_url, real_source, real_text, greeting_url, greeting_text, greeting_lang, updated_at';
const SAMPLE_BUCKET = 'voice-samples';

// ── ElevenLabs HTTP ──
async function el(path: string, key: string, init: RequestInit = {}) {
  const res = await fetch(`${EL_BASE}${path}`, { ...init, headers: { 'xi-api-key': key, ...(init.headers || {}) } });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}
// Mensaje legible de un error de ElevenLabs ({detail:{status,message}} o validación {detail:[{msg}]}).
function elError(status: number, j: any): string {
  const d = j?.detail;
  let msg = '';
  if (typeof d === 'string') msg = d;
  else if (Array.isArray(d)) msg = d.map((x: any) => x?.msg || JSON.stringify(x)).join(' · ');
  else if (d && typeof d === 'object') msg = [d.status, d.message].filter(Boolean).join(': ');
  else if (j?.raw) msg = String(j.raw).slice(0, 300);
  const st = String(d?.status || '');
  if (status === 401 && /quota|credit/i.test(st + msg)) return `ElevenLabs sin créditos: ${msg}`;
  if (status === 401) return `La llave de ElevenLabs no sirve o no tiene permiso para esto (${msg || 'unauthorized'}).`;
  if (status === 429) return `ElevenLabs está saturado o llegaste al límite de pedidos. Probá en un minuto. (${msg})`;
  return `ElevenLabs respondió ${status}${msg ? `: ${msg}` : ''}`;
}
async function subscriptionOf(key: string) {
  const r = await el('/v1/user/subscription', key);
  if (!r.ok) return null;
  const j = r.json || {};
  const used = Number(j.character_count ?? 0), limit = Number(j.character_limit ?? 0);
  const reset = Number(j.next_character_count_reset_unix || 0);
  return { tier: j.tier || null, used, limit, remaining: Math.max(0, limit - used), resets_at: reset ? new Date(reset * 1000).toISOString() : null };
}

// TTS robusto: si el modelo rechaza un parámetro (language_code / voice_settings) lo sacamos y reintentamos;
// si el modelo no está disponible en el plan, caemos a Multilingual v2. Devuelve el mp3 crudo.
async function tts(key: string, voiceId: string, text: string, opts: { model: string; lang?: string; settings?: any }) {
  const attempts: Array<{ model: string; lang?: string; settings?: any }> = [
    { model: opts.model, lang: opts.lang, settings: opts.settings },
    { model: opts.model, settings: opts.settings },
    { model: opts.model },
  ];
  if (opts.model !== FALLBACK_MODEL) attempts.push({ model: FALLBACK_MODEL, settings: opts.settings }, { model: FALLBACK_MODEL });
  let lastErr = '';
  for (const a of attempts) {
    const body: any = { text, model_id: a.model };
    if (a.lang) body.language_code = a.lang;
    if (a.settings) body.voice_settings = pickSettings(a.settings);
    const res = await fetch(`${EL_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      const cost = Number(res.headers.get('character-cost') || res.headers.get('x-character-count') || 0);
      // used = qué parámetros aceptó de verdad (si cayó a un intento sin ajustes, afinar no tendría efecto).
      return { ok: true as const, bytes, model: a.model, chars: cost > 0 ? cost : text.length, request_id: res.headers.get('request-id') || null, used: { lang: !!a.lang, settings: !!a.settings } };
    }
    const t = await res.text(); let j: any = null; try { j = JSON.parse(t); } catch { j = { raw: t }; }
    lastErr = elError(res.status, j);
    // Solo degradamos ante rechazos de PARÁMETROS/modelo. Llave, créditos, voz, política de contenido o límite → no tiene sentido reintentar.
    const paramIssue = [400, 404, 422].includes(res.status) || /model/i.test(t);
    if (!paramIssue || res.status === 401 || res.status === 429) break;
    if (/voice_not_found|voice.*not.*found|policy|moderat|safety|blocked|prohibit/i.test(t)) break;
  }
  return { ok: false as const, error: lastErr || 'ElevenLabs no devolvió audio.' };
}

// ── Limpieza del mp3: fuera ID3v2 (todas), ID3v1, APEv2 y el cuadro Xing/Info/LAME (firma del encoder). ──
const BR_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const BR_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SR: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function frameAt(b: Uint8Array, i: number) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const ver = (b[i + 1] >> 3) & 3, layer = (b[i + 1] >> 1) & 3;
  if (ver === 1 || layer !== 1) return null; // solo Layer III
  const bri = (b[i + 2] >> 4) & 0xf, sri = (b[i + 2] >> 2) & 3, pad = (b[i + 2] >> 1) & 1;
  if (bri === 0 || bri === 15 || sri === 3) return null;
  const kbps = (ver === 3 ? BR_V1 : BR_V2)[bri], sr = SR[ver][sri];
  const len = Math.floor(((ver === 3 ? 144000 : 72000) * kbps) / sr) + pad;
  return { len, kbps, sr };
}
const ascii = (b: Uint8Array, s: number, n: number) => String.fromCharCode(...b.subarray(s, Math.min(b.length, s + n)));
function stripMp3(buf: Uint8Array) {
  let s = 0, e = buf.length; const removed: string[] = [];
  while (e - s > 10 && ascii(buf, s, 3) === 'ID3') {
    const size = ((buf[s + 6] & 0x7f) << 21) | ((buf[s + 7] & 0x7f) << 14) | ((buf[s + 8] & 0x7f) << 7) | (buf[s + 9] & 0x7f);
    s += 10 + size + ((buf[s + 5] & 0x10) ? 10 : 0); removed.push('id3v2');
  }
  if (e - s > 128 && ascii(buf, e - 128, 3) === 'TAG') { e -= 128; removed.push('id3v1'); }
  if (e - s > 32 && ascii(buf, e - 32, 8) === 'APETAGEX') {
    const size = buf[e - 20] | (buf[e - 19] << 8) | (buf[e - 18] << 16) | (buf[e - 17] << 24);
    const hasHeader = (buf[e - 9] & 0x80) !== 0;
    e -= size + (hasHeader ? 32 : 0); removed.push('ape');
  }
  // Algunos encoders meten basura antes del primer cuadro: buscamos el primer sync válido.
  let f = frameAt(buf, s), guard = 0;
  while (!f && s < e - 4 && guard++ < 4096) { s++; f = frameAt(buf, s); }
  if (f) {
    const head = ascii(buf, s + 4, 40);
    if (/Xing|Info/.test(head)) { s += f.len; removed.push('xing/lame'); f = frameAt(buf, s); }
  }
  const out = buf.slice(s, Math.max(s, e));
  const duration = f && f.kbps ? Math.round(((out.length * 8) / (f.kbps * 1000)) * 10) / 10 : null;
  return { out, removed, duration };
}
// Qué marcas quedan en un buffer (para el diagnóstico).
function scanMarks(b: Uint8Array) {
  const lim = Math.min(b.length, 400000); let txt = '';
  for (let i = 0; i < lim; i += 8192) txt += ascii(b, i, Math.min(8192, lim - i));
  return {
    starts_with: Array.from(b.subarray(0, 4)).map((x) => x.toString(16).padStart(2, '0')).join(' '),
    id3v2: ascii(b, 0, 3) === 'ID3',
    id3v1: b.length > 128 && ascii(b, b.length - 128, 3) === 'TAG',
    ape: /APETAGEX/.test(txt), xing: /Xing|Info/.test(ascii(b, 0, 64)), lame: /LAME|Lavf|Lavc/.test(txt),
    c2pa: /c2pa|jumb|C2PA|contentauth/i.test(txt),
  };
}
const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 60);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });
    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body: any = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    // Llave + modelo (app_config → entorno).
    const { data: cfgRows } = await svc.from('app_config').select('key, value').in('key', ['elevenlabs_api_key', 'elevenlabs_model']);
    const cfg: Record<string, string> = {};
    (Array.isArray(cfgRows) ? cfgRows : []).forEach((r: any) => { cfg[r.key] = r.value; });
    let apiKey = clean(cfg.elevenlabs_api_key || '');
    if (!apiKey && Deno.env.get('ELEVENLABS_API_KEY')) apiKey = clean(Deno.env.get('ELEVENLABS_API_KEY'));
    const model = clean(cfg.elevenlabs_model || '') || DEFAULT_MODEL;
    const masked = apiKey ? `…${apiKey.slice(-4)}` : null;

    const storeMp3 = async (path: string, bytes: Uint8Array) => {
      const { error } = await svc.storage.from(AUDIO_BUCKET).upload(path, bytes, { contentType: 'audio/mpeg', upsert: true });
      if (error) throw new Error(`No se pudo guardar el audio: ${error.message}`);
      const { data: pub } = svc.storage.from(AUDIO_BUCKET).getPublicUrl(path);
      return (pub as any)?.publicUrl as string;
    };

    // ── Diagnóstico (sin usuario; protegido por el secreto del cocinero) ──
    // Lista modelos, saldo y hace UNA prueba de TTS mostrando qué metadata trae el mp3 crudo y qué queda tras limpiarlo.
    if (action === 'diag') {
      const { data: sc } = await svc.from('app_config').select('value').eq('key', 'kitchen_worker_secret').maybeSingle();
      const secret = clean(body?.worker_secret);
      if (!secret || !(sc as any)?.value || secret !== clean((sc as any).value)) return reply({ ok: false, error: 'No autorizado.' });
      if (!apiKey) return reply({ ok: false, needsKey: true, error: 'Falta la llave de ElevenLabs.' });
      const m = await el('/v1/models', apiKey);
      const models = Array.isArray(m.json) ? m.json.filter((x: any) => x?.can_do_text_to_speech !== false).map((x: any) => ({ id: x.model_id, name: x.name, langs: Array.isArray(x.languages) ? x.languages.length : null, max_chars: x.maximum_text_length_per_request ?? null })) : { status: m.status, err: m.ok ? null : elError(m.status, m.json) };
      const sub = await subscriptionOf(apiKey);
      let voiceId = clean(body?.voice_id || '');
      if (!voiceId) { const { data: cv } = await svc.from('creator_voice').select('voice_id').limit(1).maybeSingle(); voiceId = (cv as any)?.voice_id || ''; }
      if (!voiceId) { const v = await el('/v1/voices', apiKey); voiceId = v.json?.voices?.[0]?.voice_id || ''; }
      let check: any = null;
      if (voiceId && body?.tts !== false) {
        const r = await tts(apiKey, voiceId, clean(body?.text) || 'Hola, esto es una prueba de voz de LetShoot.', { model: clean(body?.model) || model, lang: 'es', settings: DEFAULT_SETTINGS });
        if (r.ok) {
          const st = stripMp3(r.bytes);
          const cleanUrl = await storeMp3(`diag/${Date.now()}.mp3`, st.out);
          check = { model_used: r.model, used: r.used, chars: r.chars, raw_bytes: r.bytes.length, raw: scanMarks(r.bytes), removed: st.removed, clean_bytes: st.out.length, clean: scanMarks(st.out), duration: st.duration, clean_url: cleanUrl };
        } else check = { error: r.error };
      }
      return reply({ ok: true, masked, model, models, sub, voice_id: voiceId || null, check });
    }

    // ── Auth de usuario (admin/supervisor) para todo lo demás ──
    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || (prof.role !== 'admin' && prof.role !== 'supervisor')) return reply({ ok: false, error: 'Necesitás ser admin o supervisor.' });
    const now = () => new Date().toISOString();

    if (action === 'status') {
      const sub = apiKey ? await subscriptionOf(apiKey) : null;
      return reply({ ok: true, configured: !!apiKey, masked, model_id: model, model_label: modelLabel(model), sub });
    }

    if (action === 'set_key') {
      if (prof.role !== 'admin') return reply({ ok: false, error: 'Solo un admin puede cambiar la llave.' });
      const k = clean(body?.api_key);
      if (!k) return reply({ ok: false, error: 'Pegá la API key de ElevenLabs.' });
      // Validar ANTES de guardar: si la llave no anda, no pisamos la buena.
      const test = await el('/v1/voices', k);
      if (!test.ok) return reply({ ok: false, error: elError(test.status, test.json) });
      const { error } = await svc.from('app_config').upsert({ key: 'elevenlabs_api_key', value: k, updated_at: now(), updated_by: user.id }, { onConflict: 'key' });
      if (error) return reply({ ok: false, error: `No se pudo guardar: ${error.message}` });
      return reply({ ok: true, masked: `…${k.slice(-4)}`, sub: await subscriptionOf(k) });
    }

    if (action === 'summary') {
      const { data: vs } = await svc.from('creator_voice').select('creator_id, voice_id, voice_name, source, preview_url, settings, real_url, real_source, real_text, greeting_url, greeting_text, greeting_lang, updated_at');
      const { data: ps } = await svc.from('profiles').select('id, consent_voice').eq('role', 'creator');
      const consent: Record<string, boolean> = {};
      (Array.isArray(ps) ? ps : []).forEach((p: any) => { consent[p.id] = !!p.consent_voice; });
      return reply({ ok: true, configured: !!apiKey, voices: Array.isArray(vs) ? vs : [], consent });
    }

    if (!apiKey) return reply({ ok: false, needsKey: true, error: 'Falta conectar ElevenLabs. Pegá la API key en Conexión.' });

    if (action === 'list_voices') {
      const r = await el('/v1/voices', apiKey);
      if (!r.ok) return reply({ ok: false, error: elError(r.status, r.json) });
      const order: Record<string, number> = { cloned: 0, professional: 1, generated: 2, premade: 3 };
      const voices = (Array.isArray(r.json?.voices) ? r.json.voices : []).map((v: any) => ({
        voice_id: v.voice_id, name: v.name, category: v.category || null, description: v.description || null, labels: v.labels || {}, preview_url: v.preview_url || null,
      })).sort((a: any, b: any) => ((order[a.category] ?? 9) - (order[b.category] ?? 9)) || String(a.name).localeCompare(String(b.name)));
      return reply({ ok: true, voices });
    }

    // ── Casting: buscar en la biblioteca pública de ElevenLabs (voces compartidas) ──
    if (action === 'search_shared') {
      const qs = new URLSearchParams();
      qs.set('page_size', String(Math.round(clamp(body?.page_size, 1, 100, 30))));
      for (const k of ['gender', 'age', 'accent', 'language', 'use_case', 'search', 'category', 'descriptives', 'sort']) {
        const v = clean(body?.[k]);
        if (v) qs.set(k, v.slice(0, 80));
      }
      if (body?.page != null) qs.set('page', String(Math.max(0, Math.floor(Number(body.page) || 0))));
      const r = await el(`/v1/shared-voices?${qs}`, apiKey);
      if (!r.ok) return reply({ ok: false, error: elError(r.status, r.json) });
      const voices = (Array.isArray(r.json?.voices) ? r.json.voices : []).map((v: any) => ({
        voice_id: v.voice_id, public_owner_id: v.public_owner_id, name: v.name, description: v.description || null,
        accent: v.accent || null, age: v.age || null, gender: v.gender || null, descriptive: v.descriptive || null,
        use_case: v.use_case || null, language: v.language || null, category: v.category || null,
        preview_url: v.preview_url || null, cloned_by_count: v.cloned_by_count ?? null,
        usage_1y: v.usage_character_count_1y ?? null, free_users_allowed: v.free_users_allowed ?? null,
        verified_languages: (Array.isArray(v.verified_languages) ? v.verified_languages : []).map((l: any) => ({
          language: l.language || null, accent: l.accent || null, locale: l.locale || null, preview_url: l.preview_url || null,
        })),
      }));
      return reply({ ok: true, voices, has_more: !!r.json?.has_more });
    }

    // ¿La voz ya está en la cuenta? Si no, se agrega desde la biblioteca (ocupa un lugar de voz en ElevenLabs).
    // Se mira la lista de voces DE LA CUENTA (GET /v1/voices/{id} también responde por voces públicas que no
    // están guardadas, así que no sirve para saber). Una voz de la biblioteca agregada puede quedar con otro id:
    // se reconoce por sharing.original_voice_id.
    const ensureInAccount = async (vid: string, ownerId: string, name: string) => {
      const list = await el('/v1/voices', apiKey);
      if (!list.ok) return { ok: false as const, error: elError(list.status, list.json) };
      const mine = (Array.isArray(list.json?.voices) ? list.json.voices : [])
        .find((v: any) => v?.voice_id === vid || v?.sharing?.original_voice_id === vid);
      if (mine) return { ok: true as const, voice_id: String(mine.voice_id), added: false, info: mine };
      if (!ownerId) return { ok: false as const, error: 'Esa voz no está en tu cuenta y falta su dueño en la biblioteca.' };
      const add = await el(`/v1/voices/add/${encodeURIComponent(ownerId)}/${encodeURIComponent(vid)}`, apiKey, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: `${(name || 'Voz').slice(0, 60)} · LetShoot` }),
      });
      if (!add.ok) return { ok: false as const, error: elError(add.status, add.json) };
      const nid = String(add.json?.voice_id || vid);
      const info = await el(`/v1/voices/${encodeURIComponent(nid)}`, apiKey);
      return { ok: true as const, voice_id: nid, added: true, info: info.ok ? info.json : null };
    };

    // Toma de casting: la voz candidata dice la frase de la modelo (mismo texto para todas → se comparan parejo).
    // Primero intenta directo con la voz de la biblioteca; si ElevenLabs exige tenerla en la cuenta, la agrega.
    if (action === 'cast_take') {
      const vid = clean(body?.voice_id);
      if (!vid) return reply({ ok: false, error: 'Falta la voz.' });
      const text = String(body?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!text) return reply({ ok: false, error: 'Falta la frase.' });
      const lang = LANGS.includes(String(body?.lang)) ? String(body.lang) : 'en';
      const settings = body?.settings && typeof body.settings === 'object' ? body.settings : DEFAULT_SETTINGS;
      let useId = vid, added = false;
      let r = await tts(apiKey, useId, text, { model, lang, settings });
      // Solo se agrega a la cuenta si lo piden explícitamente (el casting nunca: no gasta lugares de voz).
      if (!r.ok && body?.allow_add === true && /voice_not_found|voice.{0,20}not.{0,5}found/i.test(r.error)) {
        const got = await ensureInAccount(vid, clean(body?.public_owner_id), clean(body?.name));
        if (!got.ok) return reply({ ok: false, error: got.error });
        useId = got.voice_id; added = got.added;
        r = await tts(apiKey, useId, text, { model, lang, settings });
      }
      if (!r.ok) return reply({ ok: false, error: r.error });
      const st = stripMp3(r.bytes);
      const out = await storeMp3(`casting/${safe(vid)}-${lang}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`, st.out);
      return reply({ ok: true, url: out, voice_id: useId, added, chars: r.chars, model_label: modelLabel(r.model), used: r.used, duration: st.duration });
    }

    const creatorId = String(body?.creator_id || '');
    const saveVoice = async (row: Record<string, unknown>) => {
      const { data, error } = await svc.from('creator_voice').upsert({ ...row, creator_id: creatorId, model_id: model, settings: DEFAULT_SETTINGS, greeting_url: null, greeting_text: null, greeting_lang: null, updated_at: now(), updated_by: user.id }, { onConflict: 'creator_id' })
        .select(VOICE_COLS).single();
      if (error) throw new Error(`No se pudo guardar la voz: ${error.message}`);
      // Una 'voz real' que era una TOMA de la voz anterior ya no corresponde: se limpia (la subida de verdad se queda).
      if ((data as any)?.real_source === 'voice') {
        const { data: d2 } = await svc.from('creator_voice').update({ real_url: null, real_source: null, real_text: null }).eq('creator_id', creatorId).select(VOICE_COLS).single();
        return d2 || data;
      }
      return data;
    };
    const consentOf = async (cid: string) => {
      const { data } = await svc.from('profiles').select('consent_voice').eq('id', cid).maybeSingle();
      return !!(data as any)?.consent_voice;
    };

    if (action === 'assign_voice') {
      const vid = clean(body?.voice_id);
      if (!creatorId || !vid) return reply({ ok: false, error: 'Falta la modelo o la voz.' });
      const r = await el(`/v1/voices/${encodeURIComponent(vid)}`, apiKey);
      if (!r.ok) return reply({ ok: false, error: elError(r.status, r.json) });
      const voice = await saveVoice({ voice_id: vid, voice_name: r.json?.name || null, source: 'library', preview_url: r.json?.preview_url || null, sample_paths: null });
      return reply({ ok: true, voice });
    }

    // Casting → "Elegir esta": la voz de la biblioteca queda en la cuenta y amarrada a la modelo (con el ajuste elegido, si vino).
    if (action === 'adopt_shared') {
      const vid = clean(body?.voice_id);
      if (!creatorId || !vid) return reply({ ok: false, error: 'Falta la modelo o la voz.' });
      const got = await ensureInAccount(vid, clean(body?.public_owner_id), clean(body?.name));
      if (!got.ok) return reply({ ok: false, error: got.error });
      let voice: any = await saveVoice({ voice_id: got.voice_id, voice_name: got.info?.name || clean(body?.name) || null, source: 'library', preview_url: got.info?.preview_url || clean(body?.preview_url) || null, sample_paths: null });
      if (body?.settings && typeof body.settings === 'object') {
        const preset = String(body?.preset || body.settings?.preset || 'personalizado').slice(0, 30);
        const { data } = await svc.from('creator_voice').update({ settings: { preset, ...pickSettings(body.settings) }, updated_at: now() }).eq('creator_id', creatorId).select(VOICE_COLS).single();
        if (data) voice = data;
      }
      return reply({ ok: true, voice, added: got.added });
    }

    if (action === 'clone_voice') {
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      if (!(await consentOf(creatorId))) return reply({ ok: false, needsConsent: true, error: 'Falta el consentimiento de voz de la creadora. Marcalo en su cartilla antes de clonar.' });
      const paths = (Array.isArray(body?.sample_paths) ? body.sample_paths : []).map((p: unknown) => String(p || '')).filter(Boolean);
      if (!paths.length) return reply({ ok: false, error: 'Subí al menos un clip de su voz.' });
      if (paths.length > 5) return reply({ ok: false, error: 'Máximo 5 clips.' });
      if (paths.some((p: string) => !p.startsWith(`${creatorId}/`))) return reply({ ok: false, error: 'Clip inválido para esta modelo.' });
      const { data: pr } = await svc.from('profiles').select('stage_name, full_name').eq('id', creatorId).maybeSingle();
      const who = clean(body?.name) || (pr as any)?.stage_name || (pr as any)?.full_name || 'Modelo';
      const fd = new FormData();
      fd.append('name', `${who} · LetShoot`);
      fd.append('description', `Voz clonada en LetShoot para ${who} (con consentimiento).`);
      for (const p of paths) {
        const { data: blob, error } = await svc.storage.from(SAMPLE_BUCKET).download(p);
        if (error || !blob) return reply({ ok: false, error: `No pude leer el clip ${p.split('/').pop()}: ${error?.message || 'vacío'}` });
        fd.append('files', blob, p.split('/').pop() || 'sample.mp3');
      }
      const r = await el('/v1/voices/add', apiKey, { method: 'POST', body: fd });
      if (!r.ok || !r.json?.voice_id) return reply({ ok: false, error: r.ok ? 'ElevenLabs no devolvió la voz.' : elError(r.status, r.json) });
      const vid = r.json.voice_id;
      const d = await el(`/v1/voices/${encodeURIComponent(vid)}`, apiKey);
      const voice = await saveVoice({ voice_id: vid, voice_name: d.json?.name || `${who} · LetShoot`, source: 'cloned', preview_url: d.json?.preview_url || null, sample_paths: paths });
      return reply({ ok: true, voice, requires_verification: !!r.json?.requires_verification });
    }

    if (action === 'clear_voice') {
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      await svc.from('creator_voice').delete().eq('creator_id', creatorId);
      return reply({ ok: true });
    }

    if (action === 'preview_voice') {
      // Prueba corta SIN fila en la cocina. Sin 'settings' usa los ajustes FIJOS de la modelo (lo que va a salir en la cocina);
      // con 'settings' prueba otro ajuste (Afinar: 3 tomas de la misma frase).
      let vid = clean(body?.voice_id); let saved: any = null;
      if (creatorId) { const { data: cv } = await svc.from('creator_voice').select('voice_id, settings').eq('creator_id', creatorId).maybeSingle(); saved = (cv as any)?.settings || null; if (!vid) vid = (cv as any)?.voice_id || ''; }
      if (!vid) return reply({ ok: false, needsVoice: true, error: 'Esta modelo todavía no tiene voz.' });
      const text = (clean(body?.text) || 'Hola amor, qué bueno tenerte por acá… te preparé algo que te va a encantar.').slice(0, 200);
      const lang = LANGS.includes(String(body?.lang)) ? String(body.lang) : 'es';
      const settings = body?.settings && typeof body.settings === 'object' ? body.settings : (saved || DEFAULT_SETTINGS);
      const r = await tts(apiKey, vid, text, { model, lang, settings });
      if (!r.ok) return reply({ ok: false, error: r.error });
      const st = stripMp3(r.bytes);
      const out = await storeMp3(`previews/${safe(vid)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.mp3`, st.out);
      return reply({ ok: true, url: out, chars: r.chars, model_label: modelLabel(r.model), used: r.used });
    }

    if (action === 'set_voice_settings') {
      // Fija el ajuste elegido al afinar: desde acá TODO lo de esta modelo sale con estos ajustes.
      if (!creatorId || !body?.settings || typeof body.settings !== 'object') return reply({ ok: false, error: 'Falta la modelo o el ajuste.' });
      const preset = String(body?.preset || body.settings?.preset || 'personalizado').slice(0, 30);
      const settings = { preset, ...pickSettings(body.settings) };
      const { data, error } = await svc.from('creator_voice').update({ settings, greeting_url: null, greeting_text: null, greeting_lang: null, updated_at: now(), updated_by: user.id }).eq('creator_id', creatorId)
        .select(VOICE_COLS).maybeSingle();
      if (error) return reply({ ok: false, error: `No se pudo guardar el ajuste: ${error.message}` });
      if (!data) return reply({ ok: false, needsVoice: true, error: 'Esta modelo todavía no tiene voz.' });
      return reply({ ok: true, voice: data });
    }

    // ── Voz REAL (para el comparativo de la propuesta) ──
    // mode 'upload': el equipo subió un clip suyo (el navegador ya lo pasó a WAV limpio) a proposal-audios/real/{modelo}/.
    // mode 'voice': modelo SIN voz real (p. ej. una modelo IA) → se usa una toma de SU voz fija, con otra frase.
    if (action === 'set_real_voice' || action === 'clear_real_voice') {
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      const { data: cv } = await svc.from('creator_voice').select('voice_id, settings').eq('creator_id', creatorId).maybeSingle();
      if (!cv) return reply({ ok: false, needsVoice: true, error: 'Primero amarrale una voz a la modelo.' });
      let patch: Record<string, unknown>;
      if (action === 'clear_real_voice') patch = { real_url: null, real_source: null, real_text: null };
      else if (String(body?.mode) === 'upload') {
        const u = String(body?.url || '');
        if (!u.includes(`/${AUDIO_BUCKET}/real/${creatorId}/`)) return reply({ ok: false, error: 'Ese clip no es de esta modelo.' });
        patch = { real_url: u, real_source: 'upload', real_text: null };
      } else {
        const { data: pr } = await svc.from('profiles').select('stage_name, full_name').eq('id', creatorId).maybeSingle();
        const lang = LANGS.includes(String(body?.lang)) ? String(body.lang) : 'es';
        const text = (clean(body?.text) || REAL_LINE[lang](firstName((pr as any)?.stage_name || (pr as any)?.full_name || ''))).slice(0, 300);
        const r = await tts(apiKey, (cv as any).voice_id, text, { model, lang, settings: (cv as any).settings || DEFAULT_SETTINGS });
        if (!r.ok) return reply({ ok: false, error: r.error });
        const st = stripMp3(r.bytes);
        patch = { real_url: await storeMp3(`real/${creatorId}/voz-${Date.now()}.mp3`, st.out), real_source: 'voice', real_text: text };
      }
      const { data, error } = await svc.from('creator_voice').update({ ...patch, updated_at: now(), updated_by: user.id }).eq('creator_id', creatorId).select(VOICE_COLS).single();
      if (error) return reply({ ok: false, error: `No se pudo guardar la voz real: ${error.message}` });
      return reply({ ok: true, voice: data });
    }

    // ── Saludo con IA para el comparativo (se guarda en la modelo y se reusa en cada propuesta del mismo idioma) ──
    if (action === 'make_greeting') {
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      const { data: cv } = await svc.from('creator_voice').select('voice_id, settings, greeting_url, greeting_text, greeting_lang').eq('creator_id', creatorId).maybeSingle();
      if (!cv) return reply({ ok: false, needsVoice: true, error: 'Esta modelo todavía no tiene voz.' });
      const lang = LANGS.includes(String(body?.lang)) ? String(body.lang) : 'es';
      const custom = clean(body?.text);
      // Si ya hay uno en ese idioma y no piden otro texto ni forzar, se devuelve el guardado (no se gasta de nuevo).
      if (!custom && !body?.force && (cv as any).greeting_url && (cv as any).greeting_lang === lang)
        return reply({ ok: true, url: (cv as any).greeting_url, text: (cv as any).greeting_text, lang, cached: true });
      const { data: pr } = await svc.from('profiles').select('stage_name, full_name').eq('id', creatorId).maybeSingle();
      const text = (custom || GREETING[lang](firstName((pr as any)?.stage_name || (pr as any)?.full_name || ''))).slice(0, 300);
      const r = await tts(apiKey, (cv as any).voice_id, text, { model, lang, settings: (cv as any).settings || DEFAULT_SETTINGS });
      if (!r.ok) return reply({ ok: false, error: r.error });
      const st = stripMp3(r.bytes);
      const urlOut = await storeMp3(`greeting/${creatorId}/saludo-${lang}-${Date.now()}.mp3`, st.out);
      await svc.from('creator_voice').update({ greeting_url: urlOut, greeting_text: text, greeting_lang: lang, updated_at: now() }).eq('creator_id', creatorId);
      return reply({ ok: true, url: urlOut, text, lang, chars: r.chars, cached: false });
    }

    if (action === 'make_audio') {
      if (!creatorId) return reply({ ok: false, error: 'Falta la modelo.' });
      const regenOf = String(body?.regen_of || '');
      let prev: any = null;
      if (regenOf) {
        const { data } = await svc.from('generations').select('id, creator_id, media_type, prompt, params').eq('id', regenOf).maybeSingle();
        if (!data || (data as any).media_type !== 'audio' || (data as any).creator_id !== creatorId) return reply({ ok: false, error: 'Ese audio no existe.' });
        prev = data;
      }
      const text = String(body?.text ?? prev?.prompt ?? '').trim();
      const type = TYPES.includes(String(body?.type)) ? String(body.type) : (TYPES.includes(prev?.params?.type) ? prev.params.type : 'personalizado');
      const lang = LANGS.includes(String(body?.lang)) ? String(body.lang) : (LANGS.includes(prev?.params?.lang) ? prev.params.lang : 'es');
      if (!text) return reply({ ok: false, error: 'Pegá el guion que va a decir.' });
      if (text.length > MAX_TEXT) return reply({ ok: false, error: `El guion es muy largo (${text.length} / ${MAX_TEXT}).` });
      if (!(await consentOf(creatorId))) return reply({ ok: false, needsConsent: true, error: 'Falta el consentimiento de voz de la creadora (se marca en su cartilla).' });
      const { data: cv } = await svc.from('creator_voice').select('voice_id, voice_name, settings, model_id').eq('creator_id', creatorId).maybeSingle();
      if (!cv) return reply({ ok: false, needsVoice: true, error: 'Esta modelo todavía no tiene voz. Configurala en su cartilla.' });
      const baseParams = { type, lang, voice_id: (cv as any).voice_id, voice_name: (cv as any).voice_name, preset: (cv as any).settings?.preset || 'natural' };
      const writeRow = async (patch: Record<string, unknown>) => {
        const row = { creator_id: creatorId, media_type: 'audio', engine: 'elevenlabs', prompt: text, reference_url: null, credits: null, usd: null, ...patch };
        const q = prev
          ? svc.from('generations').update(row).eq('id', prev.id)
          : svc.from('generations').insert({ ...row, created_by: user.id });
        const { data, error } = await q.select('*').single();
        if (error) throw new Error(`No se pudo guardar el audio: ${error.message}`);
        return data;
      };
      const r = await tts(apiKey, (cv as any).voice_id, text, { model: (cv as any).model_id || model, lang, settings: (cv as any).settings || DEFAULT_SETTINGS });
      if (!r.ok) {
        const generation = await writeRow({ status: 'failed', note: r.error, result_url: null, params: baseParams, model: (cv as any).model_id || model, engine_label: modelLabel((cv as any).model_id || model) });
        return reply({ ok: false, error: r.error, generation });
      }
      const st = stripMp3(r.bytes);
      // Primero reservamos el id (fila nueva) para que el archivo lleve el id de la generación.
      const gid = prev?.id || crypto.randomUUID();
      const resultUrl = await storeMp3(`kitchen/${creatorId}/${gid}-${Date.now()}.mp3`, st.out);
      const params = { ...baseParams, chars: r.chars, model_id: r.model, duration: st.duration, stripped: st.removed };
      const generation = await writeRow({ ...(prev ? {} : { id: gid }), status: 'done', note: null, result_url: resultUrl, params, model: r.model, engine_label: modelLabel(r.model), done_at: now() });
      return reply({ ok: true, generation });
    }

    if (action === 'approve_audio') {
      const gid = String(body?.generation_id || '');
      const approve = body?.approve !== false;
      const { data: g } = await svc.from('generations').select('creator_id, result_url, media_type, prompt, params').eq('id', gid).maybeSingle();
      if (!g || (g as any).media_type !== 'audio') return reply({ ok: false, error: 'Ese audio no existe.' });
      await svc.from('generations').update({ status: approve ? 'approved' : 'rejected' }).eq('id', gid);
      if (approve && (g as any).result_url && (g as any).creator_id) {
        const p = (g as any).params || {};
        // El mp3 ya salió LIMPIO de make_audio: va directo al baúl (carpeta Cocina) como ia/audio.
        const { error } = await svc.from('creator_vault').upsert({
          creator_id: (g as any).creator_id, kind: 'ia', media_type: 'audio', url: (g as any).result_url,
          caption: 'Audio generado en /kitchen', duration: p.duration ?? null,
          meta: { type: p.type || null, lang: p.lang || null, text: (g as any).prompt || '', voice_name: p.voice_name || null, generation_id: gid },
        }, { onConflict: 'creator_id,kind,url', ignoreDuplicates: true });
        if (error) return reply({ ok: false, error: `Se aprobó pero no entró al baúl: ${error.message}` });
      }
      return reply({ ok: true });
    }

    return reply({ ok: false, error: `Acción desconocida: ${action}` });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) });
  }
});

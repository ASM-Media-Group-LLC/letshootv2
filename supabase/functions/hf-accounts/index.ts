// Edge: hf-accounts — gestión (solo dueño/admin) de las cuentas de Higgsfield y
// a qué cuenta pertenece cada modelo. Corre con service_role; las llaves viven en
// higgsfield_accounts (RLS sin políticas) y NUNCA se devuelven al cliente: solo un
// hint (últimos 4). El dueño pega las llaves; nadie más las ve.
//
// Ruteo: cada modelo cocina en SU cuenta (creator_identity.account_id). Julia Parker
// queda FIJA en la Cuenta 1 (el login de siempre del CLI en la Mac) y la Cuenta 1 es
// solo de ella (decisión del dueño): todas las demás van a otra cuenta, con su login
// propio en la Mac (node scripts/hf-login.mjs <account_id>).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
const mask = (s: string | null) => (s && s.length > 4 ? `••••${s.slice(-4)}` : (s ? '••••' : ''));
const LEGACY_HF_ACCOUNT = '06efe22b-68f2-4cfd-b9ca-8a2849d37933'; // Cuenta 1 = login de siempre del CLI (Julia)
const JULIA_ID = '4014e339-ead8-4fb7-bcda-82fee2c7926e';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JULIA_LOCK = 'Julia Parker queda fija en la Cuenta 1 (su Soul vive ahí). No se cambia.';
const LEGACY_ONLY_JULIA = 'La Cuenta 1 es solo de Julia. Asigná esta modelo a la cuenta nueva.';

// La cuenta DEFAULT solo decide la llave REST que usan las pruebas de /conexion (verificar / foto de prueba):
// el edge higgsfield lee app_config.higgsfield_key_*, así que espejamos ahí la llave de la default tras cualquier
// cambio. El COCINERO (worker) NO usa esto: cocina cada modelo con el login del CLI de SU cuenta.
async function syncDefault(svc: ReturnType<typeof createClient>) {
  const { data: def } = await svc.from('higgsfield_accounts').select('key_id, key_secret').eq('is_default', true).maybeSingle();
  if (!def) return;
  const now = new Date().toISOString();
  await svc.from('app_config').upsert([
    { key: 'higgsfield_key_id', value: def.key_id || '', updated_at: now },
    { key: 'higgsfield_key_secret', value: def.key_secret || '', updated_at: now },
  ], { onConflict: 'key' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return reply({ ok: false, error: 'No autenticado.' });

    const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ ok: false, error: 'Sesión inválida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (prof?.role !== 'admin') return reply({ ok: false, error: 'Solo el dueño o un admin puede manejar las cuentas.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    if (action === 'list') {
      // NUNCA se selecciona key_secret acá. key_id solo para el hint enmascarado.
      let accts: any[] = [];
      let tracked = true; // false = migración 0130 sin aplicar (sin saldo/login por cuenta)
      const ra = await svc.from('higgsfield_accounts').select('id, label, is_default, key_id, created_at, balance, balance_at, cli_seen_at, cli_error, cli_email, souls, souls_at').order('created_at');
      if (ra.error) {
        tracked = false;
        const rb = await svc.from('higgsfield_accounts').select('id, label, is_default, key_id, created_at').order('created_at');
        accts = Array.isArray(rb.data) ? rb.data : [];
      } else accts = Array.isArray(ra.data) ? ra.data : [];
      const { data: idents } = await svc.from('creator_identity').select('creator_id, account_id');
      const counts: Record<string, number> = {};
      (idents || []).forEach((r: { creator_id: string; account_id: string | null }) => {
        const a = r.creator_id === JULIA_ID ? LEGACY_HF_ACCOUNT : r.account_id;
        if (a) counts[a] = (counts[a] || 0) + 1;
      });
      // Saldo de la Cuenta 1 (por id fijo, NO por "default") = la global de siempre (app_config.higgsfield_balance),
      // igual que la cabecera de /kitchen de Julia. Cualquier otra cuenta = SOLO el saldo de su fila.
      const { data: gb } = await svc.from('app_config').select('value, updated_at').eq('key', 'higgsfield_balance').maybeSingle();
      const gBal = (gb as any)?.value ? Number((gb as any).value) : null;
      const accounts = accts.map((a: any) => {
        const legacy = a.id === LEGACY_HF_ACCOUNT;
        const own = a.balance != null && isFinite(Number(a.balance)) ? Number(a.balance) : null;
        return {
          id: a.id, label: a.label, is_default: a.is_default, legacy,
          key_hint: mask(a.key_id), has_key: !!(a.key_id && a.key_id.length), models: counts[a.id] || 0,
          balance: legacy ? (gBal ?? own) : own,
          balance_at: legacy ? ((gb as any)?.updated_at || a.balance_at || null) : (a.balance_at || null),
          tracked,
          cli_seen_at: a.cli_seen_at || null, cli_error: a.cli_error || null, cli_email: a.cli_email || null,
          souls: Array.isArray(a.souls) ? a.souls : [], souls_at: a.souls_at || null,
          login_cmd: legacy ? null : `node scripts/hf-login.mjs ${a.id}`,
        };
      });
      return reply({ ok: true, accounts, legacy_account: LEGACY_HF_ACCOUNT });
    }

    if (action === 'save') {
      const label = String(body.label || '').trim();
      if (!label) return reply({ ok: false, error: 'Ponle un nombre a la cuenta.' });
      const patch: Record<string, unknown> = { label };
      if (typeof body.key_id === 'string' && body.key_id.trim()) patch.key_id = body.key_id.trim();
      if (typeof body.key_secret === 'string' && body.key_secret.trim()) patch.key_secret = body.key_secret.trim();
      let id = typeof body.id === 'string' && body.id ? body.id : '';
      if (id) {
        await svc.from('higgsfield_accounts').update(patch).eq('id', id);
      } else {
        patch.created_by = user.id;
        const { data, error } = await svc.from('higgsfield_accounts').insert(patch).select('id').single();
        if (error) return reply({ ok: false, error: error.message });
        id = data!.id;
      }
      if (body.is_default === true && id) {
        await svc.from('higgsfield_accounts').update({ is_default: false }).neq('id', id);
        await svc.from('higgsfield_accounts').update({ is_default: true }).eq('id', id);
      }
      await syncDefault(svc);
      return reply({ ok: true, id });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      if (!id) return reply({ ok: false, error: 'Falta la cuenta.' });
      if (id === LEGACY_HF_ACCOUNT) return reply({ ok: false, error: 'La Cuenta 1 es la de Julia (el login de siempre del cocinero). No se borra.' });
      const { data: acc } = await svc.from('higgsfield_accounts').select('is_default').eq('id', id).maybeSingle();
      if (acc?.is_default) return reply({ ok: false, error: 'No podés borrar la cuenta por defecto. Marcá otra como default primero.' });
      await svc.from('higgsfield_accounts').delete().eq('id', id);
      await syncDefault(svc);
      return reply({ ok: true });
    }

    if (action === 'set_default') {
      const id = String(body.id || '');
      if (!id) return reply({ ok: false, error: 'Falta la cuenta.' });
      await svc.from('higgsfield_accounts').update({ is_default: false }).neq('id', id);
      await svc.from('higgsfield_accounts').update({ is_default: true }).eq('id', id);
      await syncDefault(svc);
      return reply({ ok: true });
    }

    if (action === 'models') {
      // Solo modelos REALES y activas (no registros incompletos ni de prueba).
      const { data: creators } = await svc.from('profiles')
        .select('id, full_name, stage_name, handle, is_test')
        .eq('role', 'creator')
        .in('onboarding_status', ['active', 'paid']);
      const { data: idents } = await svc.from('creator_identity').select('creator_id, account_id, status, character_id');
      const byC: Record<string, { account_id: string | null; status: string; character_id: string | null }> = {};
      (idents || []).forEach((r: { creator_id: string; account_id: string | null; status: string; character_id: string | null }) => { byC[r.creator_id] = { account_id: r.account_id, status: r.status, character_id: r.character_id }; });
      const models = (creators || [])
        .filter((c: { is_test: boolean | null }) => !c.is_test)
        .map((c: { id: string; full_name: string | null; stage_name: string | null; handle: string | null }) => ({
          id: c.id,
          name: c.stage_name || c.full_name || c.handle || 'Modelo',
          handle: c.handle || null,
          account_id: c.id === JULIA_ID ? LEGACY_HF_ACCOUNT : (byC[c.id]?.account_id || null),
          has_soul: byC[c.id]?.status === 'ready',
          character_id: byC[c.id]?.character_id || null,
          locked: c.id === JULIA_ID, // Julia fija en la Cuenta 1
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return reply({ ok: true, models });
    }

    if (action === 'set_model_account') {
      const creator_id = String(body.creator_id || '');
      const account_id = body.account_id ? String(body.account_id) : null;
      if (!creator_id) return reply({ ok: false, error: 'Falta la modelo.' });
      if (creator_id === JULIA_ID) return reply({ ok: false, error: JULIA_LOCK });
      if (account_id === LEGACY_HF_ACCOUNT) return reply({ ok: false, error: LEGACY_ONLY_JULIA });
      if (account_id) {
        const { data: acc } = await svc.from('higgsfield_accounts').select('id').eq('id', account_id).maybeSingle();
        if (!acc) return reply({ ok: false, error: 'Esa cuenta no existe.' });
      }
      const { data: ex } = await svc.from('creator_identity').select('creator_id, account_id, character_id, status').eq('creator_id', creator_id).maybeSingle();
      if (ex) {
        // Una Soul vive en UNA cuenta: si la modelo cambia de cuenta, su Soul vieja ya no sirve → hay que enlazar la nueva.
        const patch: Record<string, unknown> = { account_id, updated_at: new Date().toISOString() };
        const moved = (ex as any).account_id !== account_id && !!(ex as any).character_id;
        if (moved) { patch.character_id = null; patch.status = 'pending'; }
        await svc.from('creator_identity').update(patch).eq('creator_id', creator_id);
        return reply({ ok: true, soul_cleared: moved });
      }
      await svc.from('creator_identity').insert({ creator_id, account_id });
      return reply({ ok: true });
    }

    // Enlazar la Soul (LoRA) de una modelo: la Soul tiene que ser de la cuenta de la modelo.
    // { creator_id, character_id ('' = desenlazar), account_id? (si no viene, la que ya tiene) }
    if (action === 'set_model_soul') {
      const creator_id = String(body.creator_id || '');
      const character_id = String(body.character_id || '').trim().toLowerCase();
      if (!creator_id) return reply({ ok: false, error: 'Falta la modelo.' });
      if (creator_id === JULIA_ID) return reply({ ok: false, error: JULIA_LOCK });
      if (character_id && !UUID_RE.test(character_id)) return reply({ ok: false, error: 'Ese ID de Soul no es válido (es un código largo tipo 47bbea34-2637-…).' });
      const { data: ex } = await svc.from('creator_identity').select('creator_id, account_id').eq('creator_id', creator_id).maybeSingle();
      const account_id = body.account_id ? String(body.account_id) : ((ex as any)?.account_id || null);
      if (character_id && !account_id) return reply({ ok: false, error: 'Primero elegí la cuenta de esta modelo.' });
      if (account_id === LEGACY_HF_ACCOUNT) return reply({ ok: false, error: LEGACY_ONLY_JULIA });
      let warn: string | null = null;
      if (account_id) {
        const ra = await svc.from('higgsfield_accounts').select('id, label, souls').eq('id', account_id).maybeSingle();
        let acc: any = ra.data;
        if (ra.error) { const rb = await svc.from('higgsfield_accounts').select('id, label').eq('id', account_id).maybeSingle(); acc = rb.data; }
        if (!acc) return reply({ ok: false, error: 'Esa cuenta no existe.' });
        // Si ya conocemos las Souls de esa cuenta (las manda el cocinero), chequeamos que esté.
        const souls = Array.isArray(acc.souls) ? acc.souls : null;
        if (character_id && souls && souls.length && !souls.some((s: any) => String(s?.id || '').toLowerCase() === character_id)) {
          warn = `Ojo: esa Soul no aparece en la lista de «${acc.label}». Si no es de esa cuenta, la foto va a fallar.`;
        }
      }
      const row: Record<string, unknown> = {
        creator_id, account_id, updated_at: new Date().toISOString(),
        character_id: character_id || null, status: character_id ? 'ready' : 'pending', engine: 'soul2',
      };
      const { error } = ex
        ? await svc.from('creator_identity').update(row).eq('creator_id', creator_id)
        : await svc.from('creator_identity').insert(row);
      if (error) return reply({ ok: false, error: error.message });
      return reply({ ok: true, warn });
    }

    return reply({ ok: false, error: 'Acción desconocida.' });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});

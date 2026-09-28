// Edge: hf-accounts — gestión (solo dueño/admin) de las cuentas de Higgsfield y
// a qué cuenta pertenece cada modelo. Corre con service_role; las llaves viven en
// higgsfield_accounts (RLS sin políticas) y NUNCA se devuelven al cliente: solo un
// hint (últimos 4). El dueño pega las llaves; nadie más las ve.
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

// La cuenta DEFAULT es la que alimenta el motor hoy (el edge higgsfield + worker
// leen app_config.higgsfield_key_*). Espejamos la llave de la default a app_config
// tras cualquier cambio, para no romper lo que ya anda.
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
      const { data: accts } = await svc.from('higgsfield_accounts').select('id, label, is_default, key_id, created_at').order('created_at');
      const { data: idents } = await svc.from('creator_identity').select('account_id');
      const counts: Record<string, number> = {};
      (idents || []).forEach((r: { account_id: string | null }) => { if (r.account_id) counts[r.account_id] = (counts[r.account_id] || 0) + 1; });
      const accounts = (accts || []).map((a: { id: string; label: string; is_default: boolean; key_id: string | null }) => ({
        id: a.id, label: a.label, is_default: a.is_default, key_hint: mask(a.key_id), has_key: !!(a.key_id && a.key_id.length), models: counts[a.id] || 0,
      }));
      return reply({ ok: true, accounts });
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
      const { data: idents } = await svc.from('creator_identity').select('creator_id, account_id, status');
      const byC: Record<string, { account_id: string | null; status: string }> = {};
      (idents || []).forEach((r: { creator_id: string; account_id: string | null; status: string }) => { byC[r.creator_id] = { account_id: r.account_id, status: r.status }; });
      const models = (creators || [])
        .filter((c: { is_test: boolean | null }) => !c.is_test)
        .map((c: { id: string; full_name: string | null; stage_name: string | null; handle: string | null }) => ({
          id: c.id,
          name: c.stage_name || c.full_name || c.handle || 'Modelo',
          handle: c.handle || null,
          account_id: byC[c.id]?.account_id || null,
          has_soul: byC[c.id]?.status === 'ready',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return reply({ ok: true, models });
    }

    if (action === 'set_model_account') {
      const creator_id = String(body.creator_id || '');
      const account_id = body.account_id ? String(body.account_id) : null;
      if (!creator_id) return reply({ ok: false, error: 'Falta la modelo.' });
      const { data: ex } = await svc.from('creator_identity').select('creator_id').eq('creator_id', creator_id).maybeSingle();
      if (ex) await svc.from('creator_identity').update({ account_id }).eq('creator_id', creator_id);
      else await svc.from('creator_identity').insert({ creator_id, account_id });
      return reply({ ok: true });
    }

    return reply({ ok: false, error: 'Acción desconocida.' });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});

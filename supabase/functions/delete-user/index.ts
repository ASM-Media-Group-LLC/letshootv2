// Edge function: delete-user (v2)
// Hard-deletes an account (admin only). Cleans every FK that would block the delete, wipes
// the account's files from every storage bucket (avatars/kyc/lora/deliveries — otherwise
// they'd orphan), then removes the auth user — which cascades the profile and all CASCADE
// children (assets, folders, kyc rows, notifications, agency links, sales rows, subscription
// events, etc.). Irreversible; the UI must confirm before calling. Guards: cannot delete
// yourself; cannot delete the last admin.
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Removes every object stored under "<userId>/…" in a bucket (paginated).
async function wipeBucketFolder(svc: ReturnType<typeof createClient>, bucket: string, userId: string) {
  try {
    let offset = 0;
    for (let guard = 0; guard < 50; guard++) {
      const { data: files } = await svc.storage.from(bucket).list(userId, { limit: 100, offset });
      if (!files || files.length === 0) break;
      const paths = files.filter((f) => f.name).map((f) => `${userId}/${f.name}`);
      if (paths.length) await svc.storage.from(bucket).remove(paths);
      if (files.length < 100) break;
      offset += 100;
    }
  } catch { /* best-effort: never block the account deletion on storage cleanup */ }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
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
    if (!user) return reply({ ok: false, error: 'Sesion invalida.' });
    const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
    if (prof?.role !== 'admin') return reply({ ok: false, error: 'Solo un administrador puede eliminar cuentas.' });

    const body = await req.json().catch(() => ({}));
    const target = String(body.user_id || '').trim();
    if (!target) return reply({ ok: false, error: 'Falta el usuario a eliminar.' });
    if (target === user.id) return reply({ ok: false, error: 'No puedes eliminar tu propia cuenta.' });

    const svc = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Target must exist; capture its role for the last-admin guard.
    const { data: tgt } = await svc.from('profiles').select('id, role, full_name').eq('id', target).single();
    if (!tgt) return reply({ ok: false, error: 'Esa cuenta ya no existe.' });
    if (tgt.role === 'admin') {
      const { count } = await svc.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
      if ((count || 0) <= 1) return reply({ ok: false, error: 'No puedes eliminar al único administrador.' });
    }

    // Null out every NO-ACTION nullable FK that would otherwise block the delete.
    await Promise.all([
      svc.from('agency_sales').update({ sold_by: null }).eq('sold_by', target),
      svc.from('asset_notes').update({ author_id: null }).eq('author_id', target),
      svc.from('assets').update({ uploaded_by: null }).eq('uploaded_by', target),
      svc.from('audit_log').update({ actor_id: null }).eq('actor_id', target),
      svc.from('audit_log').update({ target_id: null }).eq('target_id', target),
      svc.from('manual_sales').update({ created_by: null }).eq('created_by', target),
      svc.from('profiles').update({ id_reviewed_by: null }).eq('id_reviewed_by', target),
      svc.from('requests').update({ producer_id: null }).eq('producer_id', target),
      svc.from('staff_invites').update({ agency_id: null }).eq('agency_id', target),
      svc.from('staff_invites').update({ created_by: null }).eq('created_by', target),
      svc.from('staff_invites').update({ used_by: null }).eq('used_by', target),
    ]);
    // requests.chatter_id is NOT NULL — hand any of the target's requests to the acting
    // admin so customer work survives the deletion.
    await svc.from('requests').update({ chatter_id: user.id }).eq('chatter_id', target);

    // Wipe the account's files from every bucket so nothing orphans (DB rows cascade,
    // but storage objects do not). Files live under "<userId>/…".
    await Promise.all([
      wipeBucketFolder(svc, 'avatars', target),
      wipeBucketFolder(svc, 'kyc', target),
      wipeBucketFolder(svc, 'lora', target),
      wipeBucketFolder(svc, 'deliveries', target),
    ]);

    // Remove the auth user; the profile row and all CASCADE children go with it.
    const { error: delErr } = await svc.auth.admin.deleteUser(target);
    if (delErr) return reply({ ok: false, error: `No se pudo eliminar: ${delErr.message}` });

    return reply({ ok: true, deleted: target, name: tgt.full_name || null });
  } catch (e) {
    return reply({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});

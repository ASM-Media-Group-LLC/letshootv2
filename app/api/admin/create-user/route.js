import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase/admin';

const VALID_ROLES = ['admin', 'chatter', 'producer', 'creator'];

// Create a team/admin (or any-role) user. Only callable by an admin.
// The browser sends the caller's access token; we verify it server-side,
// then use the service-role key to create the auth user + set the profile role.
export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  // Verify the caller is a signed-in admin.
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: uErr } = await caller.auth.getUser();
  if (uErr || !user) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });
  const { data: prof } = await caller.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Solo un admin puede crear usuarios.' }, { status: 403 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 }); }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const full_name = String(body.full_name || '').trim();
  const role = String(body.role || '');

  if (!email || !password || !role) return NextResponse.json({ error: 'Correo, contraseña y rol son obligatorios.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido.' }, { status: 400 });

  const { data: created, error } = await svc.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // The DB trigger inserts a profile (role 'creator'). Set the chosen role/name;
  // staff skip the creator onboarding gate.
  const patch = { role, full_name, email };
  if (role !== 'creator') patch.onboarding_status = 'active';
  const { error: upErr } = await svc.from('profiles').update(patch).eq('id', created.user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created.user.id });
}

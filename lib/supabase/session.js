'use client';

import { getSupabase } from './client';

// Sign in with email + password, then load the profile (role, name).
export async function signIn(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, onboarding_status')
    .eq('id', data.user.id)
    .single();
  return { user: data.user, profile };
}

// Register a brand-new account. A DB trigger creates the matching profile
// (role 'creator', onboarding_status 'registered'). If the project requires
// email confirmation there is no session yet → needsConfirm = true.
export async function signUp(email, password) {
  const supabase = getSupabase();
  const clean = String(email).trim().toLowerCase();
  // We DON'T use supabase.auth.signUp() — that would send Supabase's default,
  // unbranded confirmation email pointing at SITE_URL. Instead our public-signup
  // edge function creates the account (already confirmed) and sends OUR branded
  // welcome; then we sign in here to get a session and go straight to onboarding.
  const { data, error } = await supabase.functions.invoke('public-signup', {
    body: { email: clean, password },
  });
  let out = data;
  if (error && !out) { try { out = await error.context.json(); } catch { out = { error: error.message }; } }
  if (!out?.ok) return { error: out?.error === 'exists' ? 'User already registered' : (out?.error || 'signup failed') };
  const { data: s, error: e2 } = await supabase.auth.signInWithPassword({ email: clean, password });
  if (e2) return { error: e2.message };
  return { user: s.user, needsConfirm: false };
}

// Current logged-in user + full profile (or null).
export async function getUserProfile() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, job_title, role, onboarding_status, staff_status, legal_first_name, legal_last_name, date_of_birth, country, phone, stage_name, payment_status, lora_status, id_rejection_reason, capabilities, handle, avatar_url')
    .eq('id', user.id)
    .single();
  return { user, profile };
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

// Where each role lands after login.
export function homeForRole(role) {
  switch (role) {
    case 'admin': return '/admin';
    case 'supervisor':
    case 'producer':
    case 'chatter': return '/trabajo';
    case 'agency': return '/agencia';
    case 'agent': return '/agente';
    case 'creator':
    default: return '/panel';
  }
}

// Where a full profile lands: creators still onboarding go to the wizard.
export function homeForProfile(profile) {
  if (!profile) return '/login';
  if (profile.role === 'creator' && profile.onboarding_status !== 'active') return '/onboarding';
  return homeForRole(profile.role);
}

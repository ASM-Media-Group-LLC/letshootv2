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
  const { data, error } = await supabase.auth.signUp({
    email: String(email).trim().toLowerCase(),
    password,
  });
  if (error) return { error: error.message };
  return { user: data.user, needsConfirm: !data.session };
}

// Current logged-in user + full profile (or null).
export async function getUserProfile() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, onboarding_status, legal_first_name, legal_last_name, date_of_birth, country, phone, stage_name, payment_status, lora_status, id_rejection_reason')
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
